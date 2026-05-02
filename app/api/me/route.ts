import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ firstName: 'Teacher' })

  const meta = (user.user_metadata || {}) as { full_name?: string; name?: string }
  const fullName = (meta.full_name || meta.name || '').trim()
  const firstName = fullName.split(/\s+/)[0] || user.email?.split('@')[0] || 'Teacher'

  return NextResponse.json({ firstName, fullName, email: user.email })
}
