import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('problems')
    .select('id, problem_number, body, topic, course')
    .eq('course', 'Math2')
    .order('problem_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ problems: data || [] })
}
