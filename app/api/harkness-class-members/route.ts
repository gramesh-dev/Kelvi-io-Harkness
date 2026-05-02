import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { class_id, student_name, student_email } = await request.json()
  const svc = createServiceClient()
  const { data, error } = await svc.from('harkness_class_members')
    .insert({ class_id, student_name, student_email: student_email || null })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const svc = createServiceClient()
  await svc.from('harkness_class_members').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
