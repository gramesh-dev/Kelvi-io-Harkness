import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ sets: [] })

  const { data } = await supabase
    .from('harkness_problem_sets')
    .select('id, title, problem_numbers, created_at, updated_at')
    .eq('profile_id', user.id)
    .order('updated_at', { ascending: false })

  return NextResponse.json({ sets: data || [] })
}
