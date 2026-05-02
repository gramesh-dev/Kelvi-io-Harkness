'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

const KELVI_SYSTEM = `You are Kelvi — a mathematics thinking companion. You develop questioning and reasoning. You never give answers.

BEFORE ANYTHING ELSE — IMAGES:
When a student sends an image, you may be able to read some of it clearly and not others. You must only reference what you can see with certainty. If an equation, value, or step is not clearly legible, do not guess — ask the student to type it out. Never describe work that isn't visibly there. Hallucinating student work destroys trust.

YOUR MOST IMPORTANT RULE — MATCH YOUR RESPONSE TO WHAT THE STUDENT JUST DID:
If they showed reasoning, engage with the SPECIFIC reasoning. If they self-corrected, name that as a mathematical move. If they're stuck after two attempts, give them a concrete foothold. If you've already asked a question and they answered it, don't ask another — respond to their answer first. Your biggest failure mode is asking a question after every response regardless of context.

PROBLEM CONTEXT:
The original problem is always in the conversation history. If a student asks "can you show me the problem again?" restate it from the first message. Never say you can't see it.

OPENING MOVE:
When a student shares a problem, your first response is: "What have you tried already?" or "What's one way you might start?" Do not summarize the problem. Let the student decide the starting point.

THE PRINCIPLES:

0. NEVER LET A WRONG FACT PASS. If a student states an incorrect fact, ask them to verify. If wrong again, supply the correct fact.

1. NEVER CONFIRM RIGHT OR WRONG. Never say "correct," "right," "wrong," "exactly," "yes," or "no" as judgments. The student proves it to themselves.

2. INVITE, DON'T INSTRUCT. "Would you like to try..." not "Now do this."

3. NORMALIZE ERROR WITHOUT SIGNALING. When a student states something incorrect, ask a flat question that lets them discover the mismatch.

4. PROBE VOCABULARY. If a student uses a term, ask: "Can you define that for me?"

5. BE SPECIFIC, NOT GENERIC. Never ask "What more can you tell me?" Reference something specific from the student's last response.

6. LET THE STUDENT DISCOVER THE PATTERN. After enough examples, ask: "Did you notice anything?"

7. MINIMUM WORDS FROM KELVI. Your best moves are six words or fewer.

8. NAME THE MATHEMATICAL MOVE, NOT THE CORRECTNESS. "You caught your own error. That's what mathematicians do."

9. DON'T ALWAYS ASK A QUESTION. Sometimes just observe and stop.

10. POINT BACK AT THE PROBLEM'S WORDS. When a student overcomplicates, bring them back to what the problem actually says.

11. KNOW WHEN THE PROBLEM IS DONE. If the student has answered what was asked, stop.

12. OFFER CHOICES WHEN GENUINELY STUCK. "I can model my approach, or I can walk you through testing your idea. Which would you prefer?"

13. MAKE IT CONCRETE. When a student is lost in abstraction, ask them to try specific numbers.

14. OFFER TOOLS, NOT ANSWERS. "Would you like me to graph those points?"

15. RECOGNIZE PRACTICE REQUESTS. When a student says "give me a problem" — give them one immediately.

16. ANSWER FACTUAL QUESTIONS DIRECTLY. Definitions, facts, context — answer clearly and briefly.

17. CLOSE THE LOOP. Help them articulate the result, not just sense the direction.

20. ARITHMETIC: ONE NUDGE, THEN JUST DO IT. Don't make arithmetic a Socratic moment when the real thinking is elsewhere.

21. SHOW YOUR MATH WORK. Write out calculations step by step. Never compute silently.

22. NEVER USE AFFIRMATION WORDS AS JUDGMENT. "Exactly," "correct," "right," "perfect," "great" are all violations.

23. GRAPHING: DIRECT THE STUDENT TO DESMOS. Say: "Try graphing that in Desmos — what do you get?"

24. AFTER A CORRECT ANSWER, REQUIRE ONE ARTICULATION. Before closing, they must articulate one thing in their own words.

25. WHEN THE PROBLEM NEEDS A TOOL THE STUDENT HASN'T MET — NAME THE GAP, DON'T TEACH IT.

RESPONSE LENGTH: Two to three sentences maximum. Never write paragraphs.`

type Message = { role: 'user' | 'assistant'; content: string | any[] }

export default function HarknessStudentPage() {
  const params = useParams()
  const id     = String(params.id)

  const [problemSet,    setProblemSet]    = useState<any>(null)
  const [loading,       setLoading]       = useState(true)
  const [currentIdx,    setCurrentIdx]    = useState(0)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState('')
  const [aiLoading,     setAiLoading]     = useState(false)
  const [started,       setStarted]       = useState(false)
  const [studentName,   setStudentName]   = useState('')
  const [nameInput,     setNameInput]     = useState('')
  const [desmosOpen,    setDesmosOpen]    = useState(false)
  const [dragOver,      setDragOver]      = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef     = useRef<HTMLInputElement>(null)
  const bottomRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/harkness-set?id=${id}`)
      .then(r => r.json())
      .then(d => { setProblemSet(d.set || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, aiLoading])

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }

  async function send(overrideText?: string, imageData?: string) {
    const text = (overrideText || input).trim()
    if ((!text && !imageData) || aiLoading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const problems: any[] = problemSet?.problem_data || []
    const current = problems[currentIdx]

    // Build user message content
    const userContent: any = imageData
      ? [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData.split(',')[1] || imageData } },
          { type: 'text', text: text || 'Here is my work.' }
        ]
      : text

    const userMsg: Message = { role: 'user', content: userContent }

    // Add problem context to first message
    const contextMsg: Message = messages.length === 0 && current
      ? { role: 'user', content: `Problem #${current.problem_number} — ${current.topic}:\n\n${current.body}\n\n${typeof userContent === 'string' ? userContent : (text || 'Here is my work.')}` }
      : userMsg

    const newMessages = [...messages, userMsg]
    const apiMessages = messages.length === 0 ? [contextMsg] : [...messages, userMsg]

    setMessages(newMessages)
    setAiLoading(true)

    try {
      const res = await fetch('/api/student-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, system: KELVI_SYSTEM }),
      })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.reply || '' }])
    } catch (e) { console.error(e) }
    finally { setAiLoading(false) }
  }

  function handleImage(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => send('', e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const problems: any[] = problemSet?.problem_data || []
  const current = problems[currentIdx]

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F7F4' }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <svg width="40" height="40" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 2s linear infinite' }}>
          <circle cx="25" cy="10" r="5" fill="#E26B4F"/><circle cx="38" cy="32" r="5" fill="#2D4A3D"/><circle cx="12" cy="32" r="5" fill="#B594DC"/>
        </svg>
      </div>
    )
  }

  if (!problemSet) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F7F4', color: '#6F6A61' }}>Problem set not found.</div>
  }

  if (!started) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, padding: '0 20px' }}>
          <svg width="48" height="48" viewBox="0 0 100 100" style={{ marginBottom: 16 }}>
            <path d="M50 6C65 4,80 14,78 32C76 48,60 52,44 50C28 48,24 32,28 18C32 8,40 6,50 6Z" fill="#E26B4F"/>
            <path d="M22 56C36 54,44 64,42 80C40 92,28 96,16 92C6 88,4 76,8 66C12 58,16 56,22 56Z" fill="#2D4A3D"/>
            <path d="M70 56C84 56,94 64,92 78C90 92,78 96,66 92C54 88,52 76,56 66C60 58,64 56,70 56Z" fill="#B594DC"/>
          </svg>
          <h1 style={{ fontFamily: 'serif', fontSize: '2.2rem', marginBottom: 8, color: '#2F2B25' }}>Think it through.</h1>
          <p style={{ color: '#6F6A61', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>{problemSet.title} · {problems.length} problem{problems.length !== 1 ? 's' : ''}</p>
          <div style={{ display: 'flex', gap: 8, maxWidth: 300, margin: '0 auto' }}>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key==='Enter' && nameInput.trim() && (setStudentName(nameInput.trim()), setStarted(true))}
              placeholder="Your first name" autoFocus
              style={{ flex: 1, padding: '11px 14px', border: '1.5px solid #D9D4C9', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none', background: '#F8F7F4' }} />
            <button onClick={() => nameInput.trim() && (setStudentName(nameInput.trim()), setStarted(true))}
              style={{ background: '#2D4A3D', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500 }}>
              Start
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F8F7F4', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>

      {/* Header */}
      <div style={{ height: 52, borderBottom: '1px solid #D9D4C9', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F7F4', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="22" height="22" viewBox="0 0 100 100">
            <path d="M50 6C65 4,80 14,78 32C76 48,60 52,44 50C28 48,24 32,28 18C32 8,40 6,50 6Z" fill="#E26B4F"/>
            <path d="M22 56C36 54,44 64,42 80C40 92,28 96,16 92C6 88,4 76,8 66C12 58,16 56,22 56Z" fill="#2D4A3D"/>
            <path d="M70 56C84 56,94 64,92 78C90 92,78 96,66 92C54 88,52 76,56 66C60 58,64 56,70 56Z" fill="#B594DC"/>
          </svg>
          <span style={{ fontFamily: 'serif', fontSize: '1.1rem', color: '#2D4A3D' }}>kelvi</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {problems.length > 1 && problems.map((p: any, i: number) => (
            <button key={i} onClick={() => { setCurrentIdx(i); setMessages([]) }}
              style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${i===currentIdx?'#2D4A3D':'#D9D4C9'}`, background: i===currentIdx?'#2D4A3D':'none', color: i===currentIdx?'#fff':'#6F6A61', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              #{p.problem_number}
            </button>
          ))}
          <button onClick={() => setDesmosOpen(v => !v)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${desmosOpen?'#2D4A3D':'#D9D4C9'}`, background: desmosOpen?'#EBF3EF':'none', color: desmosOpen?'#2D4A3D':'#6F6A61', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Desmos</button>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#2D4A3D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 500 }}>{studentName.charAt(0).toUpperCase()}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Problem banner - full text, scrollable */}
          {current && (
            <div style={{ padding: '12px 20px', background: '#F0EDE6', borderBottom: '1px solid #D9D4C9', flexShrink: 0, maxHeight: '35vh', overflowY: 'auto' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2D4A3D', marginBottom: 4 }}>Problem #{current.problem_number} · {current.topic}</div>
              <div style={{ fontSize: 14, lineHeight: 1.65, color: '#2F2B25', whiteSpace: 'pre-wrap' }}>{current.body}</div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 32 }}>
                <p style={{ color: '#6F6A61', fontSize: 15, marginBottom: 20 }}>Hi {studentName}. What have you tried already?</p>
                {["I don't know where to start", "I tried something but got stuck", "Can you show me the problem again?"].map(s => (
                  <button key={s} onClick={() => send(s)} style={{ display: 'block', margin: '0 auto 8px', padding: '7px 16px', border: '1px solid #D9D4C9', borderRadius: 20, fontSize: 13, color: '#6F6A61', background: '#F8F7F4', cursor: 'pointer', fontFamily: 'inherit' }}>{s}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                {m.role === 'assistant' ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2D4A3D', marginBottom: 4 }}>Kelvi</div>
                    <div style={{ fontSize: 15, lineHeight: 1.7, color: '#2F2B25' }}>{typeof m.content === 'string' ? m.content : ''}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: 12, background: '#E8EEF2', fontSize: 15, color: '#2F2B25', lineHeight: 1.7 }}>
                      {Array.isArray(m.content)
                        ? m.content.map((c: any, ci: number) => c.type==='image'
                            ? <img key={ci} src={`data:${c.source.media_type};base64,${c.source.data}`} alt="work" style={{ maxWidth: '100%', borderRadius: 6, marginBottom: 6 }} />
                            : <span key={ci}>{c.text}</span>)
                        : m.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {aiLoading && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2D4A3D', marginBottom: 4 }}>Kelvi</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#2D4A3D', animation: 'bounce 1.2s infinite', animationDelay: `${i*.15}s` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '0 16px 16px', flexShrink: 0, position: 'relative' }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleImage(f) }}>
            {dragOver && <div style={{ position: 'absolute', inset: '0 16px 16px', background: 'rgba(45,74,61,.08)', border: '2px dashed #2D4A3D', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}><span style={{ color: '#2D4A3D', fontWeight: 500 }}>Drop image here</span></div>}
            <div style={{ background: '#F8F7F4', border: '1.5px solid #D9D4C9', borderRadius: 14, padding: '10px 12px' }}>
              <textarea ref={textareaRef} value={input}
                onChange={e => { setInput(e.target.value); autoResize(e.target) }}
                onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Share your thinking… (drag in an image of your work)"
                disabled={aiLoading} rows={1}
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, fontFamily: 'inherit', resize: 'none', lineHeight: 1.5, color: '#2F2B25', background: 'transparent', maxHeight: 150, overflowY: 'auto', display: 'block' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A9488', padding: 4 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value='' }} />
                <button onClick={() => send()} disabled={!input.trim() || aiLoading}
                  style={{ background: (!input.trim()||aiLoading)?'#D9D4C9':'#2D4A3D', color: '#F8F7F4', border: 'none', padding: '6px 16px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', fontWeight: 500, cursor: (!input.trim()||aiLoading)?'not-allowed':'pointer' }}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desmos */}
        {desmosOpen && (
          <div style={{ width: 400, borderLeft: '1px solid #D9D4C9', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '7px 12px', borderBottom: '1px solid #D9D4C9', fontSize: 11, fontFamily: 'monospace', color: '#9A9488', textTransform: 'uppercase', letterSpacing: '.08em', background: '#F0EDE6' }}>Desmos</div>
            <iframe src="https://www.desmos.com/calculator" style={{ flex: 1, border: 'none' }} title="Desmos" />
          </div>
        )}
      </div>
    </div>
  )
}
