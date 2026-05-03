import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const problem_set_id = request.nextUrl.searchParams.get('problem_set_id')
  if (!problem_set_id) return NextResponse.json({ error: 'problem_set_id required' }, { status: 400 })

  // Verify teacher owns this problem set
  const { data: ps } = await supabase.from('harkness_problem_sets')
    .select('id').eq('id', problem_set_id).eq('profile_id', user.id).maybeSingle()
  if (!ps) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const svc = createServiceClient()
  const { data: sessions } = await svc.from('harkness_student_sessions')
    .select('id, student_name, student_email, problem_id, messages, message_count, created_at, updated_at')
    .eq('problem_set_id', problem_set_id)
    .order('updated_at', { ascending: false })

  return NextResponse.json({ sessions: sessions || [] })
}
