'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { KelviChatInput, type SendPayload } from '@/components/kelvi-chat-input'
import { HarkeyMessage } from '@/components/harkey-message'

type Message  = { role: 'user' | 'assistant'; content: string }
type Problem  = { id: string; problem_number: number; body: string; topic: string }
type Tab      = 'problems' | 'commentary' | 'answers' | 'brief' | 'solutions'

const pdfDefaults = {
  accentColor:        '#2D4A3D',
  showKelviFooter:    true,
  workSpaceSize:      'medium' as 'none' | 'small' | 'medium' | 'large',
  showProblemNumbers: true,
  bodyFont:           'IBM Plex Sans',
}

function SpinMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 2s linear infinite', flexShrink: 0 }}>
      <circle cx="25" cy="10" r="5" fill="#E26B4F"/>
      <circle cx="38" cy="32" r="5" fill="#2D4A3D"/>
      <circle cx="12" cy="32" r="5" fill="#B594DC"/>
    </svg>
  )
}

function ReviewInner() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const id           = String(params.id)
  const isNew        = id === 'new'

  // For new sets: load from query params
  const problemNumbers = isNew
    ? (searchParams.get('problems') || '').split(',').map(Number).filter(Boolean)
    : []
  const titleParam = searchParams.get('title') ? decodeURIComponent(searchParams.get('title')!) : 'Problem Set'

  const [problems,      setProblems]      = useState<Problem[]>([])
  const [commentary,    setCommentary]    = useState<Record<string, any>>({})
  const [answers,       setAnswers]       = useState<Record<string, string>>({})
  const [brief,         setBrief]         = useState('')
  const [briefLoading,  setBriefLoading]  = useState(false)
  const [aiSolutions,   setAiSolutions]   = useState('')
  const [solLoading,    setSolLoading]    = useState(false)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [loading,       setLoading]       = useState(false)
  const [activeTab,     setActiveTab]     = useState<Tab>('problems')
  const [desmosOpen,    setDesmosOpen]    = useState(false)
  const [desmos3D,      setDesmos3D]      = useState(false)
  const [studentId,     setStudentId]     = useState<string | null>(isNew ? null : id)
  const [publishing,    setPublishing]    = useState(false)
  const [pdfSettings,   setPdfSettings]   = useState(pdfDefaults)
  const [pdfSettingsOpen, setPdfSettingsOpen] = useState(false)
  const [title]         = useState(titleParam)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      if (isNew) {
        // Load from problem numbers in URL
        const { data: probs } = await supabase
          .from('exeter_problems').select('*').eq('course', 'Math2')
          .in('problem_number', problemNumbers)
        const sorted = problemNumbers.map(n => probs?.find(p => p.problem_number === n)).filter(Boolean) as Problem[]
        setProblems(sorted)
        loadExeterData(supabase, sorted.map(p => p.id))
      } else {
        // Load published problem set
        const { data: ps } = await supabase
          .from('harkness_problem_sets').select('*').eq('id', id).single()
        if (ps) {
          const probs = ps.problem_data || []
          setProblems(probs)
          if (ps.brief) setBrief(ps.brief)
          if (ps.ai_solutions) setAiSolutions(ps.ai_solutions)
          loadExeterData(supabase, probs.map((p: any) => p.id).filter(Boolean))
        }
      }
    }
    load()
  }, [id])

  async function loadExeterData(supabase: any, problemIds: string[]) {
    if (!problemIds.length) return
    const [{ data: comms }, { data: sols }] = await Promise.all([
      supabase.from('exeter_commentary').select('*').in('problem_id', problemIds),
      supabase.from('exeter_solutions').select('*').in('problem_id', problemIds),
    ])
    const commMap: Record<string, any> = {}
    for (const c of comms || []) commMap[c.problem_id] = c
    setCommentary(commMap)
    const solMap: Record<string, string> = {}
    for (const s of sols || []) solMap[s.problem_id] = s.solution_text
    setAnswers(solMap)
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send(payload: SendPayload) {
    const text = payload.text?.trim()
    if (!text || loading) return
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/harkey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.reply || 'Something went wrong.' }])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function generateBrief() {
    if (briefLoading || !problems.length) return
    setBriefLoading(true); setActiveTab('brief')
    const context = problems.map(p => {
      const c = commentary[p.id]
      return `#${p.problem_number} (${p.topic}): ${p.body}${c?.teacher_notes ? '\n\nExeter Commentary: ' + c.teacher_notes.slice(0,300) : ''}`
    }).join('\n\n---\n\n')
    try {
      const res = await fetch('/api/harkey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: `Write a structured teacher brief for this problem set:\n\n## Mathematical Arc\nOne paragraph on the connective thread.\n\n## Sequence & Rationale\nFor each problem: bold the number, estimated time, what to do and watch for.\n\n## Key Facilitation Moves\nNumbered. Each: specific trigger → specific response.\n\n## Where Students Get Stuck\nMarkdown table: Problem | Struggle | Intervention\n\n## What's Really Happening\nOne paragraph on the deeper shift.\n\nProblems:\n${context}` }] }),
      })
      const data = await res.json()
      setBrief(data.reply || '')
    } catch (e) { console.error(e) }
    finally { setBriefLoading(false) }
  }

  async function generateSolutions() {
    if (solLoading || !problems.length) return
    setSolLoading(true); setActiveTab('solutions')
    const context = problems.map(p => {
      const c = commentary[p.id]; const a = answers[p.id]
      return `#${p.problem_number} (${p.topic}): ${p.body}${c?.teacher_notes ? '\n\nExeter Commentary: ' + c.teacher_notes : ''}${a ? '\n\nOfficial Answer: ' + a : ''}${c?.answers?.length ? '\n\nAppendix: ' + c.answers.join('; ') : ''}`
    }).join('\n\n---\n\n')
    try {
      const res = await fetch('/api/harkey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: `Write a complete AI solution guide. Note at top: "AI-generated — not official Exeter solutions. Official answers are in the Answers tab."\n\nFor each problem:\n1. **Full worked solution** — every step\n2. **Key insight** — the move that unlocks it\n3. **Common errors** — what students get wrong\n\nProblems:\n${context}` }] }),
      })
      const data = await res.json()
      setAiSolutions(data.reply || '')
    } catch (e) { console.error(e) }
    finally { setSolLoading(false) }
  }

  async function publish() {
    if (publishing || !problems.length) return
    setPublishing(true)
    try {
      const res = await fetch('/api/harkness-publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, problems, visibility: 'anyone' }),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setStudentId(data.id)
      const link = `${window.location.origin}/harkness/student/${data.id}`
      await navigator.clipboard.writeText(link).catch(() => {})
      alert(`Student link copied!\n\n${link}`)
    } finally { setPublishing(false) }
  }

  function generatePDF() {
    if (!problems.length) return
    const { accentColor, showKelviFooter, workSpaceSize, showProblemNumbers, bodyFont } = pdfSettings
    const workH = workSpaceSize==='none'?'0':workSpaceSize==='small'?'48pt':workSpaceSize==='large'?'120pt':'80pt'
    const fontImport = bodyFont==='OpenDyslexic'?`<link href="https://fonts.cdnfonts.com/css/opendyslexic" rel="stylesheet">`:bodyFont==='Comic Sans MS'?'':`<link href="https://fonts.googleapis.com/css2?family=${bodyFont.replace(/ /g,'+')}:wght@400;500&display=swap" rel="stylesheet">`
    const fontStack = bodyFont==='OpenDyslexic'?'"OpenDyslexic",sans-serif':bodyFont==='Comic Sans MS'?'"Comic Sans MS",cursive':`"${bodyFont}",sans-serif`

    const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
${fontImport}
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:${fontStack};font-size:12pt;line-height:1.7;color:#1A1A1A;padding:48pt;max-width:720pt;margin:0 auto}.header{border-bottom:2pt solid ${accentColor};padding-bottom:12pt;margin-bottom:24pt}.eyebrow{font-family:'IBM Plex Mono',monospace;font-size:8pt;letter-spacing:.14em;text-transform:uppercase;color:#9A9488;margin-bottom:6pt}h1{font-family:'Instrument Serif',serif;font-size:24pt;font-weight:400;color:${accentColor}}.problem{margin-bottom:24pt;break-inside:avoid}.prob-num{font-size:14pt;font-weight:500;color:${accentColor};margin-bottom:8pt}.prob-body{font-size:12pt;line-height:1.7}.workspace{border-top:.5pt solid #E8E3DA;margin-top:16pt;height:${workH}}.footer{margin-top:36pt;padding-top:12pt;border-top:.5pt solid #E8E3DA;font-family:'IBM Plex Mono',monospace;font-size:8pt;color:#9A9488;text-align:center}@media print{body{padding:0}}</style></head><body>
<div class="header"><div class="eyebrow">Phillips Exeter Academy · Math 2</div><h1>${title}</h1></div>
${problems.map((p,i)=>`<div class="problem">${showProblemNumbers?`<div class="prob-num">${i+1}. Problem #${p.problem_number}</div>`:''}<div class="prob-body">${p.body}</div>${workSpaceSize!=='none'?'<div class="workspace"></div>':''}</div>`).join('')}
${brief?`<div style="margin-top:24pt"><div style="font-family:'IBM Plex Mono',monospace;font-size:8pt;letter-spacing:.12em;text-transform:uppercase;color:${accentColor};margin-bottom:8pt">Harkey Brief</div><div style="background:#F0EDE6;padding:14pt 18pt;border-radius:6pt;line-height:1.7">${brief.replace(/\n/g,'<br>')}</div></div>`:''}
${showKelviFooter?`<div class="footer">Kelvi Harkness · ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>`:''}
</body></html>`

    const win = window.open('', '_blank')
    if (!win) { alert('Please allow pop-ups.'); return }
    win.document.write(html); win.document.close(); setTimeout(() => win.print(), 800)
  }

  async function saveToWord() {
    if (!problems.length) return
    try {
      const res = await fetch('/api/generate-docx', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemSet: { title, problems: problems.map((p,i) => ({ number: i+1, title: `Problem #${p.problem_number}`, body: p.body, subparts: [] })), duration_minutes: problems.length * 8 }, settings: pdfSettings }),
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title}.docx`; a.click()
    } catch { alert('Word export failed.') }
  }

  async function saveToGDrive() {
    const btn = document.getElementById('gdrive-btn') as HTMLButtonElement | null
    if (btn) { btn.textContent = 'Saving…'; btn.disabled = true }
    try {
      const res = await fetch('/api/save-to-gdrive', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemSet: { title, problems: problems.map((p,i) => ({ number: i+1, title: `Problem #${p.problem_number}`, body: p.body, subparts: [] })), duration_minutes: problems.length * 8 }, title }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed'); return }
      window.open(data.url, '_blank')
    } catch (e: any) { alert(e.message) }
    finally { if (btn) { btn.textContent = 'Google Doc'; btn.disabled = false } }
  }

  function copyLatex() {
    const latex = problems.map((p,i) => `% Problem ${i+1}: #${p.problem_number} — ${p.topic}\n${p.body}`).join('\n\n')
    navigator.clipboard.writeText(latex); alert('LaTeX copied!')
  }

  function tb(tab: Tab) {
    return { padding: '14px 20px', border: 'none', background: activeTab===tab?'#FAF8F3':'#F2EFE6', borderBottom: activeTab===tab?'2px solid #2D4A3D':'none', color: activeTab===tab?'#2D4A3D':'#6F6A61', fontWeight: 500, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' } as React.CSSProperties
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF8F3', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Top bar */}
      <div style={{ height: 60, borderBottom: '1px solid #E8E3DA', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12, background: '#fff', flexShrink: 0 }}>
        <svg width="24" height="24" viewBox="0 0 100 100">
          <path d="M50 6C65 4,80 14,78 32C76 48,60 52,44 50C28 48,24 32,28 18C32 8,40 6,50 6Z" fill="#E26B4F"/>
          <path d="M22 56C36 54,44 64,42 80C40 92,28 96,16 92C6 88,4 76,8 66C12 58,16 56,22 56Z" fill="#2D4A3D"/>
          <path d="M70 56C84 56,94 64,92 78C90 92,78 96,66 92C54 88,52 76,56 66C60 58,64 56,70 56Z" fill="#B594DC"/>
        </svg>
        <button onClick={() => router.push('/harkness')} style={{ color: '#3A6B5C', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← Harkey</button>
        <div style={{ width: 1, height: 20, background: '#E8E3DA' }} />
        <strong style={{ fontSize: 16 }}>{title}</strong>
        <span style={{ fontSize: 13, color: '#9A9488' }}>· {problems.length} problems</span>
      </div>

      {/* Split view */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Harkey chat */}
        <div style={{ width: 400, borderRight: '1px solid #E8E3DA', display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {messages.length === 0 && (
              <div style={{ fontSize: 14, color: '#6F6A61', lineHeight: 1.6 }}>
                Ask Harkey about this problem set — sequencing, connections, facilitation moves.
              </div>
            )}
            {messages.map((m,i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                {m.role==='assistant' ? (
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}><HarkeyMessage text={m.content} /></div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: 10, background: '#F5F5F5', fontSize: 14 }}>{m.content}</div>
                  </div>
                )}
              </div>
            ))}
            {loading && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><SpinMark /><span style={{ color: '#6F6A61', fontSize: 14 }}>Thinking…</span></div>}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: 16, borderTop: '1px solid #E8E3DA' }}>
            <KelviChatInput
              onSend={send}
              onToggleDesmos={() => setDesmosOpen(v => !v)}
              desmosOpen={desmosOpen}
              disabled={loading}
              placeholder="Adjust anything?"
            />
          </div>
        </div>

        {/* Right: tabs + content + action bar */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E8E3DA', background: '#FAF8F3', flexShrink: 0 }}>
              <button onClick={() => setActiveTab('problems')} style={tb('problems')}>Problem set</button>
              <button onClick={() => setActiveTab('commentary')} style={tb('commentary')}>Exeter Commentary</button>
              <button onClick={() => setActiveTab('answers')} style={tb('answers')}>Answers</button>
              <button onClick={() => { setActiveTab('brief'); if (!brief && !briefLoading) generateBrief() }} style={tb('brief')}>
                {briefLoading ? 'Brief…' : brief ? 'Brief ✓' : 'Harkey Brief'}
              </button>
              <button onClick={() => { setActiveTab('solutions'); if (!aiSolutions && !solLoading) generateSolutions() }} style={tb('solutions')}>
                {solLoading ? 'Solutions…' : aiSolutions ? 'Solutions ✓' : 'Solutions'}
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: '#FAF8F3' }}>

              {activeTab==='problems' && (
                <div style={{ maxWidth: 700 }}>
                  <h1 style={{ fontFamily: 'serif', fontSize: 28, marginBottom: 8, fontWeight: 400 }}>{title}</h1>
                  <div style={{ color: '#6F6A61', fontSize: 13, marginBottom: 32 }}>{problems.length * 8} min · {problems.length} problems · Phillips Exeter Academy</div>
                  {problems.map((p,i) => (
                    <div key={p.id} style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #E8E3DA' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{i+1}. Problem #{p.problem_number}</div>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#9A9488', background: '#F0EDE6', padding: '2px 8px', borderRadius: 4 }}>~8 min · {p.topic}</span>
                      </div>
                      <div style={{ fontSize: 15, lineHeight: 1.7 }}>{p.body}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab==='commentary' && (
                <div style={{ maxWidth: 700 }}>
                  <h2 style={{ fontFamily: 'serif', fontSize: 26, marginBottom: 8, fontWeight: 400 }}>Exeter Commentary</h2>
                  <p style={{ color: '#6F6A61', fontSize: 14, marginBottom: 28 }}>Teacher notes from the PEA Mathematics Department.</p>
                  {problems.map(p => {
                    const c = commentary[p.id]
                    return (
                      <div key={p.id} style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #E8E3DA' }}>
                        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Problem #{p.problem_number}</div>
                        {c?.teacher_notes ? <div style={{ fontSize: 14, lineHeight: 1.7 }}>{c.teacher_notes}</div>
                          : <div style={{ color: '#9A9488', fontSize: 14 }}>No commentary.</div>}
                      </div>
                    )
                  })}
                </div>
              )}

              {activeTab==='answers' && (
                <div style={{ maxWidth: 700 }}>
                  <h2 style={{ fontFamily: 'serif', fontSize: 26, marginBottom: 8, fontWeight: 400 }}>Answers</h2>
                  <p style={{ color: '#6F6A61', fontSize: 14, marginBottom: 28 }}>From the Math 2 appendix. Short answers only.</p>
                  {problems.map(p => {
                    const a = answers[p.id]; const c = commentary[p.id]
                    return (
                      <div key={p.id} style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #E8E3DA' }}>
                        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Problem #{p.problem_number}</div>
                        {a && <div style={{ padding: '8px 12px', background: '#F0EDE6', borderRadius: 6, fontSize: 14, marginBottom: 6 }}>{a}</div>}
                        {c?.answers?.map((ans: string, i: number) => (
                          <div key={i} style={{ padding: '6px 12px', background: '#F5F3EE', border: '1px solid #E8E3DA', borderRadius: 6, fontSize: 13, marginBottom: 4, color: '#6F6A61' }}>{ans}</div>
                        ))}
                        {!a && !c?.answers?.length && <div style={{ color: '#9A9488', fontSize: 14 }}>No answer in appendix.</div>}
                      </div>
                    )
                  })}
                </div>
              )}

              {activeTab==='brief' && (
                <div style={{ maxWidth: 700 }}>
                  <h2 style={{ fontFamily: 'serif', fontSize: 26, marginBottom: 8, fontWeight: 400 }}>Harkey Brief</h2>
                  <p style={{ color: '#6F6A61', fontSize: 14, marginBottom: 28 }}>AI-generated pedagogical brief using Exeter commentary.</p>
                  {briefLoading ? <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><SpinMark /><span style={{ color: '#6F6A61' }}>Generating…</span></div>
                    : brief ? <HarkeyMessage text={brief} />
                    : <button onClick={generateBrief} style={{ padding: '10px 20px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Generate Harkey Brief</button>}
                </div>
              )}

              {activeTab==='solutions' && (
                <div style={{ maxWidth: 700 }}>
                  <h2 style={{ fontFamily: 'serif', fontSize: 26, marginBottom: 8, fontWeight: 400 }}>Solutions</h2>
                  <div style={{ marginBottom: 28 }}>
                    <p style={{ color: '#6F6A61', fontSize: 14 }}>Official Exeter answers are in the Answers tab. This tab has AI-generated worked solutions.</p>
                  </div>
                  {solLoading ? <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><SpinMark /><span style={{ color: '#6F6A61' }}>Generating…</span></div>
                    : aiSolutions ? <HarkeyMessage text={aiSolutions} />
                    : <button onClick={generateSolutions} style={{ padding: '10px 20px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Generate AI Solutions</button>}
                </div>
              )}
            </div>

            {/* Action bar — exact Kelvi teach */}
            <div style={{ borderTop: '1px solid #E8E3DA', padding: '14px 40px', background: '#FAF8F3', display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
              <button onClick={generatePDF} style={{ padding: '10px 18px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: 4, cursor: 'pointer', fontWeight: 500, fontSize: 14, fontFamily: 'inherit' }}>PDF</button>
              <button onClick={() => setPdfSettingsOpen(true)} style={{ padding: '10px 12px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: 4, cursor: 'pointer', color: '#6F6A61' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
              <button onClick={saveToWord} style={{ padding: '10px 18px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: 4, cursor: 'pointer', fontWeight: 500, fontSize: 14, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Word
              </button>
              <button id="gdrive-btn" onClick={saveToGDrive} style={{ padding: '10px 18px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: 4, cursor: 'pointer', fontWeight: 500, fontSize: 14, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                Google Doc
              </button>
              <button onClick={copyLatex} style={{ padding: '10px 18px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: 4, cursor: 'pointer', fontWeight: 500, fontSize: 14, fontFamily: 'inherit' }}>LaTeX</button>
              {studentId && (
                <button onClick={() => window.open(`/harkness/student/${studentId}`, '_blank')} style={{ padding: '10px 18px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: 4, cursor: 'pointer', fontWeight: 500, fontSize: 14, fontFamily: 'inherit' }}>Preview as student ↗</button>
              )}
              <button onClick={publish} disabled={publishing} style={{ padding: '10px 18px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500, fontSize: 14, fontFamily: 'inherit', marginLeft: 'auto', opacity: publishing ? 0.7 : 1 }}>
                {publishing ? 'Publishing…' : studentId ? '✓ Student link' : 'Student link'}
              </button>
            </div>
          </div>

          {/* Desmos panel */}
          {desmosOpen && (
            <div style={{ width: 460, borderLeft: '1px solid #E8E3DA', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid #E8E3DA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0EDE6' }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '.1em', textTransform: 'uppercase', color: '#9A9488' }}>Desmos {desmos3D?'3D':''}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setDesmos3D(v=>!v)} style={{ fontSize: 12, padding: '3px 10px', border: '1px solid #E8E3DA', borderRadius: 4, background: 'none', cursor: 'pointer', color: '#6F6A61' }}>{desmos3D?'2D':'3D'}</button>
                  <button onClick={() => setDesmosOpen(false)} style={{ fontSize: 12, padding: '3px 8px', border: '1px solid #E8E3DA', borderRadius: 4, background: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
              <iframe src={desmos3D?'https://www.desmos.com/3d':'https://www.desmos.com/calculator'} style={{ flex: 1, border: 'none' }} title="Desmos" />
            </div>
          )}
        </div>
      </div>

      {/* PDF Settings modal */}
      {pdfSettingsOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setPdfSettingsOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 440, width: '100%', margin: 16 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'serif', fontSize: 22, marginBottom: 6, fontWeight: 400 }}>PDF Settings</h2>
            <p style={{ color: '#6F6A61', fontSize: 14, marginBottom: 24 }}>Customize the printed problem set.</p>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6F6A61', marginBottom: 8 }}>Body font</label>
              <select value={pdfSettings.bodyFont} onChange={e => setPdfSettings(s => ({ ...s, bodyFont: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #E8E3DA', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#FAF8F3', outline: 'none' }}>
                {['IBM Plex Sans', 'Georgia', 'Arial', 'OpenDyslexic', 'Comic Sans MS'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6F6A61', marginBottom: 8 }}>Accent color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['#2D4A3D','Forest'],['#E26B4F','Coral'],['#B594DC','Lavender'],['#1A1A1A','Black'],['#2563EB','Blue']].map(([color,label]) => (
                  <button key={color} onClick={() => setPdfSettings(s => ({ ...s, accentColor: color }))} title={label}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: color, border: pdfSettings.accentColor===color?'3px solid #1A1A1A':'2px solid transparent', cursor: 'pointer', boxShadow: pdfSettings.accentColor===color?'0 0 0 2px white inset':'none' }} />
                ))}
                <input type="color" value={pdfSettings.accentColor} onChange={e => setPdfSettings(s => ({ ...s, accentColor: e.target.value }))} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E8E3DA', cursor: 'pointer', padding: 2 }} />
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6F6A61', marginBottom: 8 }}>Work space</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['none','small','medium','large'] as const).map(sz => (
                  <button key={sz} onClick={() => setPdfSettings(s => ({ ...s, workSpaceSize: sz }))}
                    style={{ flex: 1, padding: '7px 4px', border: `1px solid ${pdfSettings.workSpaceSize===sz?'#2D4A3D':'#E8E3DA'}`, borderRadius: 6, background: pdfSettings.workSpaceSize===sz?'#2D4A3D':'none', color: pdfSettings.workSpaceSize===sz?'#fff':'#6F6A61', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                    {sz}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPdfSettingsOpen(false)} style={{ flex: 1, padding: 10, background: 'none', border: '1px solid #E8E3DA', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: '#6F6A61' }}>Close</button>
              <button onClick={() => { setPdfSettingsOpen(false); generatePDF() }} style={{ flex: 1, padding: 10, background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Generate PDF →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReviewPage() {
  return <Suspense fallback={<div style={{ padding: 40, color: '#6F6A61' }}>Loading…</div>}><ReviewInner /></Suspense>
}
