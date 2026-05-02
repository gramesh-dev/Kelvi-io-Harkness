import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { class_id, note, date, roster } = await request.json()
    if (!class_id || !note?.trim()) return NextResponse.json({ error: 'class_id and note required' }, { status: 400 })

    const svc = createServiceClient()

    // Parse the note with Claude
    const parseResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: `You extract structured student data from a teacher's natural language session notes.

You will receive:
1. A class roster (list of student names)
2. The teacher's note about today's session

Return ONLY a JSON array. No explanation, no markdown, no preamble. Each element has:
{
  "student_name": string (must match a name from the roster, or "everyone"/"all"),
  "type": "homework" | "question" | "presentation" | "observation" | "absent",
  "content": string (what they did/said, null for homework),
  "value": boolean | null (for homework: true = did it, false = didn't; null for everything else)
}

RULES:
- "everyone did homework" → one entry per student, type: "homework", value: true
- "everyone except X" → all students homework true EXCEPT X who gets homework false
- Match student names fuzzily (first name is enough)
- Quotes → type: "question" with the quote as content
- "presented #N" → type: "presentation", content: "presented #N"
- "was quiet" / "didn't participate" → type: "observation", content as given
- "absent" / "wasn't here" → type: "absent"
- If no homework mentioned, don't include homework entries`,
      messages: [{
        role: 'user',
        content: `Roster: ${roster.join(', ')}\n\nTeacher's note: "${note}"`
      }]
    })

    const raw = parseResponse.content[0]?.type === 'text' ? parseResponse.content[0].text.trim() : '[]'
    let parsed: any[] = []
    try {
      const clean = raw.replace(/^```json\s*/,'').replace(/```\s*$/,'').trim()
      parsed = JSON.parse(clean)
    } catch { parsed = [] }

    // Store raw log
    const logDate = date || new Date().toISOString().slice(0, 10)
    const { data: log } = await svc.from('harkness_session_logs').insert({
      class_id, teacher_id: user.id, date: logDate, raw_note: note
    }).select('id').single()

    // Fetch member IDs for matching
    const { data: members } = await svc.from('harkness_class_members')
      .select('id, student_name').eq('class_id', class_id)

    // Store per-student notes
    const toInsert = []
    for (const entry of parsed) {
      const name = entry.student_name?.toLowerCase()
      const matchedMembers = name === 'everyone' || name === 'all'
        ? members || []
        : (members || []).filter(m =>
            m.student_name.toLowerCase().includes(name) ||
            name.includes(m.student_name.toLowerCase().split(' ')[0])
          )

      for (const member of matchedMembers) {
        toInsert.push({
          class_id,
          member_id: member.id,
          student_name: member.student_name,
          date: logDate,
          type: entry.type,
          content: entry.content || null,
          value: entry.value ?? null,
        })
      }
    }

    if (toInsert.length > 0) {
      await svc.from('harkness_student_notes').insert(toInsert)
    }

    // Build a readable confirmation for the teacher
    const summary = buildSummary(parsed, members || [])

    return NextResponse.json({ ok: true, parsed, summary, logId: log?.id })
  } catch (e: any) {
    console.error('[harkness-log]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function buildSummary(parsed: any[], members: any[]): string {
  const lines: string[] = []
  const hwTrue  = parsed.filter(e => e.type === 'homework' && e.value === true).map(e => e.student_name)
  const hwFalse = parsed.filter(e => e.type === 'homework' && e.value === false).map(e => e.student_name)
  const questions = parsed.filter(e => e.type === 'question')
  const presentations = parsed.filter(e => e.type === 'presentation')
  const observations = parsed.filter(e => e.type === 'observation')
  const absent = parsed.filter(e => e.type === 'absent')

  if (hwTrue.length === members.length) lines.push(`✓ Homework: everyone`)
  else if (hwTrue.length > 0 && hwFalse.length > 0) lines.push(`✓ Homework: everyone except ${hwFalse.map(n => n).join(', ')}`)
  else if (hwFalse.length > 0) lines.push(`✗ No homework: ${hwFalse.join(', ')}`)

  for (const q of questions) lines.push(`💬 ${q.student_name}: "${q.content}"`)
  for (const p of presentations) lines.push(`📐 ${p.student_name}: ${p.content}`)
  for (const o of observations) lines.push(`📝 ${o.student_name}: ${o.content}`)
  for (const a of absent) lines.push(`absent: ${a.student_name}`)

  return lines.join('\n')
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ notes: [] })

  const classId  = request.nextUrl.searchParams.get('class_id')
  const memberId = request.nextUrl.searchParams.get('member_id')
  const svc = createServiceClient()

  if (memberId) {
    const { data } = await svc.from('harkness_student_notes')
      .select('*').eq('member_id', memberId)
      .order('date', { ascending: false })
    return NextResponse.json({ notes: data || [] })
  }

  if (classId) {
    const { data: logs } = await svc.from('harkness_session_logs')
      .select('*').eq('class_id', classId)
      .order('date', { ascending: false })
    const { data: notes } = await svc.from('harkness_student_notes')
      .select('*').eq('class_id', classId)
      .order('date', { ascending: false })
    return NextResponse.json({ logs: logs || [], notes: notes || [] })
  }

  return NextResponse.json({ notes: [] })
}
