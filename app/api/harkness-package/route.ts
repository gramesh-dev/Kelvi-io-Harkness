const MATH_INSTRUCTION = `MATH FORMATTING RULES — CRITICAL:
- Use $...$  for ALL inline math: $x^2$, $\\frac{a}{b}$, $\\sqrt{x}$
- Use $$...$$ for display math on its own line
- Never write raw LaTeX outside of $ delimiters
- Never use \\[ \\] or \\( \\) — only $ and $$
`

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { problemNumbers, title }: { problemNumbers: number[]; title: string } = await request.json()

    // Fetch problems + commentary
    const { data: problems } = await supabase
      .from('problems')
      .select('id, problem_number, body, topic, course')
      .eq('course', 'Math2')
      .in('problem_number', problemNumbers)

    const sorted = problemNumbers
      .map(n => problems?.find(p => p.problem_number === n))
      .filter(Boolean) as any[]

    const problemIds = sorted.map(p => p.id)

    const { data: commentaries } = await supabase
      .from('exeter_commentary')
      .select('problem_id, teacher_notes, answers')
      .in('problem_id', problemIds)

    const { data: solutions } = await supabase
      .from('exeter_solutions')
      .select('problem_id, solution_text')
      .in('problem_id', problemIds)

    const commMap: Record<string, any> = {}
    for (const c of commentaries || []) commMap[c.problem_id] = c
    const solMap: Record<string, string> = {}
    for (const s of solutions || []) solMap[s.problem_id] = s.solution_text

    const problemContext = sorted.map(p => {
      const c = commMap[p.id]
      const s = solMap[p.id]
      return `Problem #${p.problem_number} (${p.topic}):
${p.body}${c?.teacher_notes ? `\n\nExeter Commentary: ${c.teacher_notes}` : ''}${s ? `\n\nOfficial Answer: ${s}` : ''}${c?.answers?.length ? `\n\nAppendix: ${c.answers.join('; ')}` : ''}`
    }).join('\n\n---\n\n')

    // Generate brief + AI solutions in parallel
    const [briefRes, aiSolRes] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: 'You are Harkey, a PEA math teacher colleague. Write structured pedagogical briefs. Never add UI instructions at the end.',
        messages: [{ role: 'user', content: `Write a structured teacher brief. Format:\n\n## Mathematical Arc\nOne paragraph on the connective thread.\n\n## Sequence & Rationale\nFor each problem: bold the number, estimated time, what to do and watch for.\n\n## Key Facilitation Moves\nNumbered. Each: specific trigger → specific response.\n\n## Where Students Get Stuck\nMarkdown table: Problem | Struggle | Intervention\n\n## What's Really Happening\nOne paragraph on the deeper shift.\n\nProblems:\n${problemContext}` }]
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: 'You are Harkey. Write complete worked solutions. Label clearly as AI-generated. Never add UI instructions at the end.',
        messages: [{ role: 'user', content: `${MATH_INSTRUCTION}Write a complete AI solution guide.

Note at top: "> AI-generated solutions — not official Exeter solutions. Official answers are in the Answers tab."

For each problem, use this structure:

### Problem #[number]

**Full Solution**
Show every step. Use $...$ for all inline math and $$...$$ for display equations.

**Key Insight**
The one mathematical move that unlocks this problem.

**Common Errors**
What students typically get wrong and why.

---

Problems:
\${problemContext}` }]
      })
    ])

    const brief = briefRes.content[0]?.type === 'text' ? briefRes.content[0].text : ''
    const aiSolutions = aiSolRes.content[0]?.type === 'text' ? aiSolRes.content[0].text : ''

    // Publish student link
    const psTitle = title || `Math 2 — ${sorted.map(p => `#${p.problem_number}`).join(', ')}`
    const { data: ps, error: psError } = await supabase
      .from('harkness_problem_sets')
      .insert({
        profile_id: user.id,
        title: psTitle,
        problem_numbers: sorted.map(p => p.problem_number),
        problem_data: sorted,
        visibility: 'anyone',
      })
      .select('id')
      .single()

    if (psError) return NextResponse.json({ error: psError.message }, { status: 500 })

    return NextResponse.json({
      brief,
      aiSolutions,
      studentId: ps.id,
      problemCount: sorted.length,
      officialAnswers: sorted.map(p => ({
        problem_number: p.problem_number,
        answer: solMap[p.id] || null,
        appendix: commMap[p.id]?.answers || [],
      }))
    })
  } catch (e: any) {
    console.error('[harkness-package]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
