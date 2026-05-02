import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { messages } = await request.json()

    // Fetch full Exeter problem index
    const { data: problems } = await supabase
      .from('problems')
      .select('problem_number, topic, body')
      .eq('course', 'Math2')
      .order('problem_number', { ascending: true })

    const topicMap: Record<string, number[]> = {}
    for (const p of problems || []) {
      if (!p.topic) continue
      if (!topicMap[p.topic]) topicMap[p.topic] = []
      topicMap[p.topic].push(p.problem_number)
    }

    const topicSummary = Object.entries(topicMap)
      .map(([topic, nums]) => `${topic} (${nums.length}): ${nums.slice(0, 8).join(', ')}${nums.length > 8 ? '…' : ''}`)
      .join('\n')

    const problemIndex = (problems || []).map(p =>
      `#${p.problem_number} [${p.topic}]: ${(p.body || '').slice(0, 160)}${(p.body || '').length > 160 ? '…' : ''}`
    ).join('\n')

    const system = `You are Harkey — a Harkness mathematics thinking partner for teachers at Phillips Exeter Academy. You are direct, opinionated, and brief — like a brilliant PEA math colleague between classes.

YOU KNOW THE FULL MATH 2 CURRICULUM (${problems?.length || 819} problems):

TOPICS:
${topicSummary}

FULL PROBLEM INDEX:
${problemIndex}

WHAT YOU DO:
- When a teacher asks to see problems on a topic: list ALL of them. Format: **#[number]** — [one-line description]. Be complete.
- After listing topic problems, ALWAYS end with: "**Want me to package these?** Say yes and I'll generate a PDF, Harkey Brief, AI solution guide, and student link — all at once."
- When teacher says yes: respond with ONLY this JSON and nothing else:
  {"action":"package","problems":[list of numbers],"title":"[topic] — Math 2"}
- Sequence planning: name specific problem numbers with rationale
- Spiral advice: explain the mathematical thread linking problems
- Post-discussion debrief: help teachers read what happened

KELVI HARKNESS UI:
- This app has a problem picker at /harkness — teachers select Exeter problems, then go to review
- The review page has: PDF | Word | Google Doc | LaTeX | Student link in the action bar
- Harkey Brief and Solutions tabs auto-generate from Exeter commentary

RULES:
- Name specific problem numbers. Be concrete.
- Keep responses tight — a teacher is reading this between classes.
- Ask at most one follow-up question per turn.
- Never say "great question" or generic praise.
- When generating briefs or solutions, NEVER add UI instructions or export suggestions at the end.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    })

    const reply = response.content[0]?.type === 'text' ? response.content[0].text : ''

    // Detect package action
    // Extract JSON action block — find matching braces
    const jsonStart = reply.indexOf('{"action":"package"')
    if (jsonStart !== -1) {
      let depth = 0, jsonEnd = -1
      for (let i = jsonStart; i < reply.length; i++) {
        if (reply[i] === '{') depth++
        else if (reply[i] === '}') { depth--; if (depth === 0) { jsonEnd = i + 1; break } }
      }
      if (jsonEnd !== -1) {
        try {
          const action = JSON.parse(reply.slice(jsonStart, jsonEnd))
          return NextResponse.json({ reply: reply.slice(0, jsonStart).trim() || '✓ Packaging now…', action })
        } catch { /* fall through */ }
      }
    }

    return NextResponse.json({ reply })
  } catch (e: any) {
    console.error('[harkey]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
