import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ classes: [], members: [] })

  const id = request.nextUrl.searchParams.get('id')

  if (id) {
    // Get members for a specific class
    const svc = createServiceClient()
    const { data: members } = await svc.from('harkness_class_members').select('*').eq('class_id', id).order('student_name')
    return NextResponse.json({ members: members || [] })
  }

  const { data: classes } = await supabase.from('harkness_classes').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false })
  return NextResponse.json({ classes: classes || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, period, course } = await request.json()
  const { data, error } = await supabase.from('harkness_classes')
    .insert({ teacher_id: user.id, name, period, course: course || 'Math2' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ class: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await supabase.from('harkness_classes').delete().eq('id', id).eq('teacher_id', user.id)
  return NextResponse.json({ ok: true })
}
