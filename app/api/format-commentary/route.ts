import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const { problems } = await request.json()

  const formatted = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    system: `You reformat raw Exeter Mathematics teacher notes into clean, visually structured teacher-facing commentary. 
    
MATH RULES: use $...$ for inline math, $$...$$ for display equations. Never raw LaTeX outside $ delimiters.

FORMAT each problem's commentary as:
### Problem #[number] — [topic]

**What this problem does**
One sentence on its mathematical purpose.

**Key moves to watch for**
Bullet list of specific student approaches or mathematical moves worth noting.

**Connections**
What this links to in the curriculum (brief).

Keep it tight. Don't pad. Stay grounded in the actual Exeter notes — don't invent content.`,
    messages: [{
      role: 'user',
      content: problems.map((p: any) => 
        `Problem #${p.problem_number} (${p.topic}):\n${p.body}\n\nExeter notes: ${p.teacher_notes || 'None'}\n\nAppendix answers: ${p.answers?.join('; ') || 'None'}`
      ).join('\n\n---\n\n')
    }]
  })

  const text = formatted.content[0]?.type === 'text' ? formatted.content[0].text : ''
  return NextResponse.json({ formatted: text })
}
