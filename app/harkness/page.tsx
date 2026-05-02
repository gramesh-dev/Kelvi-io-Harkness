'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KelviChatInput, RenderMath, type SendPayload } from '@/components/kelvi-chat-input'
import { HarkeyMessage } from '@/components/harkey-message'

type Message  = { role: 'user' | 'assistant'; content: string }
type Problem  = { id: string; problem_number: number; body: string; topic: string }

export default function HarknessPage() {
  const router = useRouter()
  const [messages, setMessages]         = useState<Message[]>([])
  const [loading, setLoading]           = useState(false)
  const [problems, setProblems]         = useState<Problem[]>([])
  const [topics, setTopics]             = useState<string[]>([])
  const [activeTopic, setActiveTopic]   = useState('')
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState<Problem[]>([])
  const [title, setTitle]               = useState('')
  const [desmosOpen, setDesmosOpen]     = useState(false)
  const [packaging, setPackaging]       = useState(false)
  const [packageResult, setPackageResult] = useState<any>(null)
  const [view, setView]                 = useState<'chat' | 'pick'>('chat')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load problems
  useEffect(() => {
    async function load() {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data } = await supabase
        .from('problems')
        .select('id, problem_number, body, topic')
        .eq('course', 'Math2')
        .order('problem_number', { ascending: true })
      setProblems(data || [])
      const t = [...new Set((data || []).map(p => p.topic).filter(Boolean))].sort() as string[]
      setTopics(t)
    }
    load()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send(payload: SendPayload) {
    const text = payload.text?.trim()
    if (!text || loading) return
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/harkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      const reply = data.reply || 'Something went wrong.'

      // Handle package action
      if (data.action?.action === 'package') {
        setMessages([...newMessages, { role: 'assistant', content: '✓ Generating your package — PDF, Brief, AI Solutions, and Student Link…' }])
        setPackaging(true)
        try {
          const pkgRes = await fetch('/api/harkness-package', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problemNumbers: data.action.problems, title: data.action.title }),
          })
          const pkg = await pkgRes.json()
          if (pkg.error) throw new Error(pkg.error)
          setPackageResult(pkg)
          const link = `${window.location.origin}/harkness/student/${pkg.studentId}`
          await navigator.clipboard.writeText(link).catch(() => {})
          const nums = data.action.problems.join(',')
          const t = encodeURIComponent(data.action.title || 'Problem Set')
          setMessages(m => [...m, {
            role: 'assistant',
            content: `✓ Package ready for ${data.action.problems.length} problems!\n\n**Student link** (copied to clipboard):\n${link}\n\n**Open review page** to access PDF, Word, Google Doc, Brief, and Solutions:\n[Open review →](/harkness/review/${pkg.studentId})`
          }])
          // Open review page automatically
          window.open(`/harkness/review/${pkg.studentId}`, '_blank')
        } catch (e: any) {
          setMessages(m => [...m, { role: 'assistant', content: `Error: ${e.message}` }])
        } finally { setPackaging(false) }
        setLoading(false)
        return
      }

      setMessages([...newMessages, { role: 'assistant', content: reply }])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function toggle(p: Problem) {
    setSelected(s => s.find(x => x.id === p.id) ? s.filter(x => x.id !== p.id) : [...s, p])
  }

  function moveUp(i: number) { if (i===0) return; const s=[...selected]; [s[i-1],s[i]]=[s[i],s[i-1]]; setSelected(s) }
  function moveDown(i: number) { if (i===selected.length-1) return; const s=[...selected]; [s[i],s[i+1]]=[s[i+1],s[i]]; setSelected(s) }

  function goToReview() {
    if (!selected.length) return
    const nums = selected.map(p => p.problem_number).join(',')
    const t = encodeURIComponent(title || `Math 2 — ${selected.map(p=>'#'+p.problem_number).slice(0,4).join(', ')}`)
    router.push(`/harkness/review/new?problems=${nums}&title=${t}`)
  }

  const filtered = problems.filter(p => {
    const matchTopic  = !activeTopic || p.topic === activeTopic
    const matchSearch = !search || p.body?.toLowerCase().includes(search.toLowerCase()) || String(p.problem_number).includes(search)
    return matchTopic && matchSearch
  })

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF8F3', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Top bar */}
      <div style={{ height: 60, borderBottom: '1px solid #E8E3DA', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="26" height="26" viewBox="0 0 100 100">
            <path d="M50 6C65 4,80 14,78 32C76 48,60 52,44 50C28 48,24 32,28 18C32 8,40 6,50 6Z" fill="#E26B4F"/>
            <path d="M22 56C36 54,44 64,42 80C40 92,28 96,16 92C6 88,4 76,8 66C12 58,16 56,22 56Z" fill="#2D4A3D"/>
            <path d="M70 56C84 56,94 64,92 78C90 92,78 96,66 92C54 88,52 76,56 66C60 58,64 56,70 56Z" fill="#B594DC"/>
          </svg>
          <span style={{ fontFamily: 'serif', fontSize: 22 }}>kelvi harkness</span>
          <span style={{ fontSize: 12, color: '#9A9488', fontFamily: 'monospace', background: '#F0EDE6', padding: '2px 8px', borderRadius: 4 }}>Math 2 · {problems.length} problems</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('chat')} style={{ padding: '8px 16px', border: '1px solid #E8E3DA', borderRadius: 6, background: view==='chat' ? '#2D4A3D' : '#fff', color: view==='chat' ? '#fff' : '#6F6A61', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            Harkey
          </button>
          <button onClick={() => setView('pick')} style={{ padding: '8px 16px', border: '1px solid #E8E3DA', borderRadius: 6, background: view==='pick' ? '#2D4A3D' : '#fff', color: view==='pick' ? '#fff' : '#6F6A61', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            Pick Problems {selected.length > 0 && `(${selected.length})`}
          </button>
        </div>
      </div>

      {/* Chat view */}
      {view === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 860, margin: '0 auto', width: '100%', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px 20px' }}>
            {messages.length === 0 && (
              <div style={{ paddingTop: 20 }}>
                <h1 style={{ fontFamily: 'serif', fontSize: 28, color: '#1A1A1A', marginBottom: 8 }}>Good morning, Harkey.</h1>
                <p style={{ color: '#6F6A61', fontSize: 15, marginBottom: 28 }}>I know every problem in Math 2. Ask me about sequencing, connections, or what to assign — or say "show me all vector problems" to get started.</p>
                {['Show me all parametric equation problems', 'What connects circles to trigonometry in Math 2?', 'Design a 3-problem arc on vectors for a Harkness discussion', 'Which problems work best for a first discussion?'].map(p => (
                  <button key={p} onClick={() => send({ text: p })} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, border: '1px solid #E8E3DA', borderRadius: 8, background: '#F5F3EE', fontSize: 14, color: '#6F6A61', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D4A3D'; e.currentTarget.style.color = '#1A1A1A' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E3DA'; e.currentTarget.style.color = '#6F6A61' }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 24 }}>
                {m.role === 'assistant' ? (
                  <div style={{ fontSize: 15, lineHeight: 1.7, color: '#1A1A1A' }}><HarkeyMessage text={m.content} /></div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: 12, background: '#F5F5F5', fontSize: 15 }}>{m.content}</div>
                  </div>
                )}
              </div>
            ))}
            {(loading || packaging) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <svg width="28" height="28" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 2s linear infinite' }}>
                  <circle cx="25" cy="10" r="5" fill="#E26B4F"/><circle cx="38" cy="32" r="5" fill="#2D4A3D"/><circle cx="12" cy="32" r="5" fill="#B594DC"/>
                </svg>
                <span style={{ color: '#6F6A61' }}>{packaging ? 'Generating package…' : 'Thinking…'}</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: '0 20px 20px', flexShrink: 0 }}>
            <KelviChatInput
              onSend={send}
              onToggleDesmos={() => setDesmosOpen(v => !v)}
              desmosOpen={desmosOpen}
              disabled={loading || packaging}
              placeholder="Ask Harkey about Math 2…"
            />
          </div>
        </div>
      )}

      {/* Problem picker view */}
      {view === 'pick' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Topic sidebar */}
          <div style={{ width: 200, borderRight: '1px solid #E8E3DA', overflowY: 'auto', background: '#F5F3EE', flexShrink: 0 }}>
            <div style={{ padding: '10px 12px 6px', fontSize: 11, color: '#9A9488', fontFamily: 'monospace', letterSpacing: '.12em', textTransform: 'uppercase' }}>Topics</div>
            <button onClick={() => setActiveTopic('')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: !activeTopic ? '#2D4A3D' : 'none', color: !activeTopic ? '#fff' : '#6F6A61', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              All {problems.length}
            </button>
            {topics.map(t => (
              <button key={t} onClick={() => setActiveTopic(t)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: activeTopic===t ? '#2D4A3D' : 'none', color: activeTopic===t ? '#fff' : '#6F6A61', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                {t}
              </button>
            ))}
          </div>

          {/* Problem list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #E8E3DA', flexShrink: 0, display: 'flex', gap: 10 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ flex: 1, padding: '7px 12px', border: '1px solid #E8E3DA', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              <span style={{ fontSize: 13, color: '#9A9488', display: 'flex', alignItems: 'center' }}>{filtered.length} problems</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
              {filtered.map(p => {
                const isSel = !!selected.find(x => x.id === p.id)
                return (
                  <div key={p.id} onClick={() => toggle(p)} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, border: `1px solid ${isSel ? '#2D4A3D' : 'transparent'}`, background: isSel ? '#EDF4F0' : 'none' }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F5F3EE' }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'none' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSel ? '#2D4A3D' : '#D9D4C9'}`, background: isSel ? '#2D4A3D' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      {isSel && <svg width="10" height="10" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#9A9488', fontFamily: 'monospace', marginBottom: 2 }}>#{p.problem_number} · {p.topic}</div>
                      <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.5 }}>{p.body?.slice(0, 150)}{(p.body?.length || 0) > 150 ? '…' : ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected panel */}
          <div style={{ width: 300, borderLeft: '1px solid #E8E3DA', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E3DA', flexShrink: 0 }}>
              <div style={{ fontFamily: 'serif', fontSize: 18, marginBottom: 8 }}>Problem Set</div>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Untitled problem set" style={{ width: '100%', padding: '7px 10px', border: '1px solid #E8E3DA', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
              {selected.length === 0 ? (
                <div style={{ color: '#9A9488', fontSize: 13, padding: '20px 8px', textAlign: 'center' }}>Click problems to add them here.</div>
              ) : selected.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', gap: 8, padding: '8px 10px', marginBottom: 4, background: '#F5F3EE', border: '1px solid #E8E3DA', borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#9A9488', fontFamily: 'monospace' }}>#{p.problem_number} · {p.topic}</div>
                    <div style={{ fontSize: 12, color: '#1A1A1A' }}>{p.body?.slice(0, 80)}…</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => moveUp(i)} style={{ padding: '2px 6px', border: '1px solid #E8E3DA', borderRadius: 3, background: 'none', cursor: 'pointer', fontSize: 11 }}>↑</button>
                    <button onClick={() => moveDown(i)} style={{ padding: '2px 6px', border: '1px solid #E8E3DA', borderRadius: 3, background: 'none', cursor: 'pointer', fontSize: 11 }}>↓</button>
                    <button onClick={() => toggle(p)} style={{ padding: '2px 6px', border: '1px solid #fcc', borderRadius: 3, background: 'none', cursor: 'pointer', fontSize: 11, color: '#c0392b' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #E8E3DA', flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: '#9A9488', marginBottom: 8 }}>{selected.length} problem{selected.length !== 1 ? 's' : ''} selected</div>
              <button onClick={goToReview} disabled={!selected.length}
                style={{ width: '100%', padding: '10px', background: selected.length ? '#2D4A3D' : '#E8E3DA', color: selected.length ? '#fff' : '#9A9488', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: selected.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                Review & Export →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desmos panel */}
      {desmosOpen && (
        <div style={{ position: 'fixed', right: 0, top: 60, bottom: 0, width: 460, borderLeft: '1px solid #E8E3DA', background: '#fff', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #E8E3DA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0EDE6' }}>
            <span style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '.1em', textTransform: 'uppercase', color: '#9A9488' }}>Desmos</span>
            <button onClick={() => setDesmosOpen(false)} style={{ border: '1px solid #E8E3DA', borderRadius: 4, padding: '2px 8px', background: 'none', cursor: 'pointer' }}>✕</button>
          </div>
          <iframe src="https://www.desmos.com/calculator" style={{ flex: 1, border: 'none' }} title="Desmos" />
        </div>
      )}
    </div>
  )
}
