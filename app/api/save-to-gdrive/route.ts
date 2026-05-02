import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Converts a problem set to Google Docs format and saves to the teacher's Drive.
//
// REQUIRES: Google OAuth scope 'https://www.googleapis.com/auth/drive.file'
// This scope must be added in:
//   1. Google Cloud Console → APIs & Services → Credentials → OAuth Client → Scopes
//   2. Supabase Dashboard → Authentication → Providers → Google → Additional Scopes
//
// The teacher's Google access token is retrieved from the Supabase session.
// Supabase refreshes it automatically when expired.

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  // The Google access token is in the Supabase session when Google OAuth is used
  const googleAccessToken = session.provider_token
  if (!googleAccessToken) {
    return NextResponse.json(
      { error: 'Google Drive access not granted. Please sign out and sign in again to grant Drive permission.' },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  const { problemSet, teacherFacing, title } = body ?? {}

  if (!problemSet || !title) {
    return NextResponse.json({ error: 'problemSet and title required' }, { status: 400 })
  }

  // Build the document content as plain text (Google Docs API requests)
  const docTitle = title

  // Build requests for Google Docs API to construct the document
  const requests: any[] = []
  let cursor = 1 // Google Docs inserts at index 1

  function addText(text: string, bold = false, fontSize = 11, color = '000000') {
    const startIndex = cursor
    requests.push({
      insertText: {
        location: { index: cursor },
        text,
      }
    })
    cursor += text.length
    requests.push({
      updateTextStyle: {
        range: { startIndex, endIndex: cursor },
        textStyle: {
          bold,
          fontSize: { magnitude: fontSize, unit: 'PT' },
          foregroundColor: {
            color: { rgbColor: {
              red:   parseInt(color.slice(0, 2), 16) / 255,
              green: parseInt(color.slice(2, 4), 16) / 255,
              blue:  parseInt(color.slice(4, 6), 16) / 255,
            }}
          },
          weightedFontFamily: { fontFamily: 'Arial' }
        },
        fields: 'bold,fontSize,foregroundColor,weightedFontFamily'
      }
    })
    return cursor
  }

  // Title
  addText(title + '\n', true, 18, '2D4A3D')
  addText(`${problemSet.duration_minutes ? problemSet.duration_minutes + ' min · ' : ''}${problemSet.problems?.length ?? 0} problems\n\n`, false, 10, '6B6B6B')

  // Separator
  addText('─'.repeat(60) + '\n\n', false, 10, 'E8E3DA')

  // Problems
  for (const p of problemSet.problems ?? []) {
    addText(`Problem ${p.number ?? ''}${p.title ? ': ' + p.title : ''}\n`, true, 12, 'E26B4F')
    addText((p.body ?? '') + '\n', false, 11)

    for (let i = 0; i < (p.subparts ?? []).length; i++) {
      addText(`    ${String.fromCharCode(97 + i)}) ${p.subparts[i]}\n`, false, 11)
    }
    addText('\n\n\n', false, 11) // work space
  }

  // Teacher solutions (if available)
  if (teacherFacing?.solutions?.length > 0) {
    addText('─'.repeat(60) + '\n', false, 10, 'E8E3DA')
    addText('TEACHER SOLUTIONS\n\n', true, 11, '2D4A3D')

    for (const s of teacherFacing.solutions) {
      addText(`Problem ${s.problem_number}\n`, true, 11)
      addText((s.solution ?? '') + '\n\n', false, 11)
    }
  }

  // Step 1: Create an empty Google Doc
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${googleAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: docTitle }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    console.error('[save-to-gdrive] create doc failed:', err)
    if (createRes.status === 403) {
      return NextResponse.json(
        { error: 'Google Drive permission not granted. Sign out and sign in again, then grant Drive access when prompted.' },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: 'Could not create Google Doc' }, { status: 500 })
  }

  const doc = await createRes.json()
  const docId = doc.documentId

  // Step 2: Insert content using batchUpdate
  if (requests.length > 0) {
    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    })

    if (!updateRes.ok) {
      const err = await updateRes.text()
      console.error('[save-to-gdrive] batchUpdate failed:', err)
      // Doc was created but content failed — return the doc URL anyway
      return NextResponse.json({
        url: `https://docs.google.com/document/d/${docId}/edit`,
        warning: 'Document created but formatting could not be applied.',
      })
    }
  }

  return NextResponse.json({
    url: `https://docs.google.com/document/d/${docId}/edit`,
    docId,
  })
}
