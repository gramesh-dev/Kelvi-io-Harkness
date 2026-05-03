import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const { problem_set_id, problem_id, student_name, student_email, messages, session_id } = await request.json()
    if (!problem_set_id || !student_name) return NextResponse.json({ ok: true })

    const supabase = createServiceClient()

    if (session_id) {
      await supabase.from('harkness_student_sessions')
        .update({ messages, message_count: messages?.length || 0, updated_at: new Date().toISOString() })
        .eq('id', session_id)
      return NextResponse.json({ ok: true, session_id })
    }

    const { data, error } = await supabase.from('harkness_student_sessions')
      .insert({ problem_set_id, problem_id: problem_id || null, student_name, student_email: student_email || null, messages: messages || [], message_count: messages?.length || 0 })
      .select('id').single()

    if (error) { console.error('[save-student-session]', error); return NextResponse.json({ ok: true }) }
    return NextResponse.json({ ok: true, session_id: data.id })
  } catch (e: any) {
    console.error('[save-student-session]', e)
    return NextResponse.json({ ok: true })
  }
}
