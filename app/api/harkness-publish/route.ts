import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { title, problems, visibility } = await request.json()
    if (!title?.trim() || !problems?.length) {
      return NextResponse.json({ error: 'Title and problems required.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('harkness_problem_sets')
      .insert({
        profile_id: user.id,
        title: title.trim(),
        problem_numbers: problems.map((p: any) => p.problem_number || p),
        problem_data: problems,
        visibility: visibility || 'anyone',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
