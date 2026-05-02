import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const { problemIds } = await request.json()
    if (!problemIds?.length) return NextResponse.json({ commentary: [], solutions: [] })

    const supabase = createServiceClient()
    const [{ data: commentary }, { data: solutions }] = await Promise.all([
      supabase.from('exeter_commentary').select('*').in('problem_id', problemIds),
      supabase.from('exeter_solutions').select('*').in('problem_id', problemIds),
    ])

    return NextResponse.json({ commentary: commentary || [], solutions: solutions || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
