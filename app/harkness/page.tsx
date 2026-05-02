'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KelviChatInput, type SendPayload } from '@/components/kelvi-chat-input'
import { HarkeyMessage } from '@/components/harkey-message'

type Message  = { role: 'user' | 'assistant'; content: string }
type Problem  = { id: string; problem_number: number; body: string; topic: string }
type HClass   = { id: string; name: string; course: string; period?: string }
type Member   = { id: string; student_name: string; student_email?: string }
type ProbSet  = { id: string; title: string; problem_numbers: number[]; created_at: string; updated_at: string }
type View     = 'dashboard' | 'classes' | 'class-detail' | 'pick' | 'library' | 'transcripts'

const COURSES = [
  { id: 'Math2', label: 'Math 2', available: true },
  { id: 'Math1', label: 'Math 1', available: false },
  { id: 'Math3', label: 'Math 3', available: false },
  { id: 'Math4', label: 'Math 4', available: false },
  { id: 'Math5', label: 'Math 5', available: false },
]

export default function HarknessTeacherDashboard() {
  const router = useRouter()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [problemsOpen,     setProblemsOpen]     = useState(true)
  const [view,             setView]             = useState<View>('dashboard')
  const [selectedClass,    setSelectedClass]    = useState<HClass | null>(null)

  const [classes,          setClasses]          = useState<HClass[]>([])
  const [members,          setMembers]          = useState<Member[]>([])
  const [showNewClass,     setShowNewClass]     = useState(false)
  const [newClassName,     setNewClassName]     = useState('')
  const [newClassPeriod,   setNewClassPeriod]   = useState('')
  const [newStudentName,   setNewStudentName]   = useState('')
  const [newStudentEmail,  setNewStudentEmail]  = useState('')
  const [savingClass,      setSavingClass]      = useState(false)

  const [messages,         setMessages]         = useState<Message[]>([])
  const [chatLoading,      setChatLoading]      = useState(false)
  const [packaging,        setPackaging]        = useState(false)
  const [desmosOpen,       setDesmosOpen]       = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [problems,         setProblems]         = useState<Problem[]>([])
  const [topics,           setTopics]           = useState<string[]>([])
  const [activeTopic,      setActiveTopic]      = useState('')
  const [search,           setSearch]           = useState('')
  const [selected,         setSelected]         = useState<Problem[]>([])
  const [psTitle,          setPsTitle]          = useState('')
  const [savedSets,        setSavedSets]        = useState<ProbSet[]>([])

  useEffect(() => { loadClasses(); loadProblems(); loadSavedSets() }, [])
  useEffect(() => { if (selectedClass) loadMembers(selectedClass.id) }, [selectedClass])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, chatLoading])

  async function loadClasses() {
    const d = await fetch('/api/harkness-classes').then(r => r.json())
    setClasses(d.classes || [])
  }
  async function loadMembers(classId: string) {
    const d = await fetch(`/api/harkness-classes?id=${classId}`).then(r => r.json())
    setMembers(d.members || [])
  }
  async function loadProblems() {
    const d = await fetch('/api/exeter-problems').then(r => r.json())
    setProblems(d.problems || [])
    const t = [...new Set((d.problems || []).map((p: any) => p.topic).filter(Boolean))].sort() as string[]
    setTopics(t)
  }
  async function loadSavedSets() {
    const d = await fetch('/api/harkness-sets').then(r => r.json())
    setSavedSets(d.sets || [])
  }

  async function createClass() {
    if (!newClassName.trim() || savingClass) return
    setSavingClass(true)
    try {
      const d = await fetch('/api/harkness-classes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName.trim(), period: newClassPeriod.trim(), course: 'Math2' }),
      }).then(r => r.json())
      if (d.class) { setClasses(c => [d.class, ...c]); setNewClassName(''); setNewClassPeriod(''); setShowNewClass(false) }
    } finally { setSavingClass(false) }
  }

  async function addMember() {
    if (!newStudentName.trim() || !selectedClass) return
    const d = await fetch('/api/harkness-class-members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_id: selectedClass.id, student_name: newStudentName.trim(), student_email: newStudentEmail.trim() }),
    }).then(r => r.json())
    if (d.member) { setMembers(m => [...m, d.member]); setNewStudentName(''); setNewStudentEmail('') }
  }

  async function deleteClass(id: string) {
    if (!confirm('Delete this class?')) return
    await fetch(`/api/harkness-classes?id=${id}`, { method: 'DELETE' })
    setClasses(c => c.filter(x => x.id !== id))
    if (selectedClass?.id === id) { setSelectedClass(null); setView('classes') }
  }

  async function removeMember(memberId: string) {
    await fetch(`/api/harkness-class-members?id=${memberId}`, { method: 'DELETE' })
    setMembers(m => m.filter(x => x.id !== memberId))
  }

  async function sendHarkey(payload: SendPayload) {
    const text = payload.text?.trim()
    if (!text || chatLoading) return
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setChatLoading(true)
    try {
      const data = await fetch('/api/harkey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      }).then(r => r.json())

      if (data.action?.action === 'package') {
        setMessages([...newMessages, { role: 'assistant', content: '✓ Generating package…' }])
        setPackaging(true); setChatLoading(false)
        try {
          const pkg = await fetch('/api/harkness-package', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problemNumbers: data.action.problems, title: data.action.title }),
          }).then(r => r.json())
          if (pkg.error) throw new Error(pkg.error)
          await loadSavedSets()
          const link = `${window.location.origin}/harkness/student/${pkg.studentId}`
          await navigator.clipboard.writeText(link).catch(() => {})
          setMessages(m => [...m, { role: 'assistant', content: `✓ Package ready!\n\n**Student link** (copied):\n${link}\n\n[Open review page →](/harkness/review/${pkg.studentId})` }])
          window.open(`/harkness/review/${pkg.studentId}`, '_blank')
        } catch (e: any) {
          setMessages(m => [...m, { role: 'assistant', content: `Error: ${e.message}` }])
        } finally { setPackaging(false) }
        return
      }
      setMessages([...newMessages, { role: 'assistant', content: data.reply || 'Something went wrong.' }])
    } catch (e) { console.error(e) }
    finally { setChatLoading(false) }
  }

  function toggle(p: Problem) {
    setSelected(s => s.find(x => x.id === p.id) ? s.filter(x => x.id !== p.id) : [...s, p])
  }

  function goToReview() {
    if (!selected.length) return
    const nums = selected.map(p => p.problem_number).join(',')
    const t = encodeURIComponent(psTitle || `Math 2 — ${selected.slice(0,4).map(p=>'#'+p.problem_number).join(', ')}`)
    router.push(`/harkness/review/new?problems=${nums}&title=${t}`)
  }

  const filtered = problems.filter(p =>
    (!activeTopic || p.topic === activeTopic) &&
    (!search || p.body?.toLowerCase().includes(search.toLowerCase()) || String(p.problem_number).includes(search))
  )

  const W = sidebarCollapsed ? 52 : 220

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#FAF8F3', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .nav-btn{width:100%;display:flex;align-items:center;gap:10px;padding:7px 14px;border:none;background:none;color:#6F6A61;border-radius:6px;cursor:pointer;font-family:inherit;font-size:14px;transition:background .12s;text-align:left} .nav-btn:hover{background:#E8E3DA} .nav-btn.active{background:#2D4A3D;color:#fff}`}</style>

      {/* ── Sidebar ── */}
      <div style={{ width: W, minWidth: W, borderRight: '1px solid #E8E3DA', display: 'flex', flexDirection: 'column', background: '#F5F3EE', flexShrink: 0, transition: 'width .2s', overflow: 'hidden' }}>
        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', padding: sidebarCollapsed ? 0 : '0 12px', borderBottom: '1px solid #E8E3DA', flexShrink: 0 }}>
          {!sidebarCollapsed && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="22" height="22" viewBox="0 0 100 100"><path d="M50 6C65 4,80 14,78 32C76 48,60 52,44 50C28 48,24 32,28 18C32 8,40 6,50 6Z" fill="#E26B4F"/><path d="M22 56C36 54,44 64,42 80C40 92,28 96,16 92C6 88,4 76,8 66C12 58,16 56,22 56Z" fill="#2D4A3D"/><path d="M70 56C84 56,94 64,92 78C90 92,78 96,66 92C54 88,52 76,56 66C60 58,64 56,70 56Z" fill="#B594DC"/></svg>
            <span style={{ fontFamily: 'serif', fontSize: 17 }}>kelvi</span>
          </div>}
          {sidebarCollapsed && <svg width="22" height="22" viewBox="0 0 100 100" style={{ cursor: 'pointer' }} onClick={() => setSidebarCollapsed(false)}><path d="M50 6C65 4,80 14,78 32C76 48,60 52,44 50C28 48,24 32,28 18C32 8,40 6,50 6Z" fill="#E26B4F"/><path d="M22 56C36 54,44 64,42 80C40 92,28 96,16 92C6 88,4 76,8 66C12 58,16 56,22 56Z" fill="#2D4A3D"/><path d="M70 56C84 56,94 64,92 78C90 92,78 96,66 92C54 88,52 76,56 66C60 58,64 56,70 56Z" fill="#B594DC"/></svg>}
          {!sidebarCollapsed && <button onClick={() => setSidebarCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A9488', padding: 4 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {!sidebarCollapsed && <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '.12em', textTransform: 'uppercase', color: '#9A9488', padding: '6px 8px 4px' }}>Workspace</div>}

          {[
            { v: 'dashboard' as View, label: 'Harkey', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { v: 'classes' as View, label: 'My Classes', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            { v: 'library' as View, label: 'Library', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
            { v: 'transcripts' as View, label: 'Transcripts', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
          ].map(({ v, label, icon }) => (
            <button key={v} onClick={() => setView(v)} className={`nav-btn${view === v || (v === 'classes' && view === 'class-detail') ? ' active' : ''}`} style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '8px 0' : '7px 14px' }}>
              {icon}
              {!sidebarCollapsed && label}
            </button>
          ))}

          {/* Problem Bank collapsible */}
          {!sidebarCollapsed && <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '.12em', textTransform: 'uppercase', color: '#9A9488', padding: '12px 8px 4px' }}>Problem Bank</div>}
          <button onClick={() => { if (sidebarCollapsed) setSidebarCollapsed(false); setProblemsOpen(v => !v) }}
            className="nav-btn" style={{ justifyContent: sidebarCollapsed ? 'center' : 'space-between', padding: sidebarCollapsed ? '8px 0' : '7px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              {!sidebarCollapsed && 'Pick Problems'}
            </div>
            {!sidebarCollapsed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: problemsOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>}
          </button>

          {problemsOpen && !sidebarCollapsed && COURSES.map(c => (
            <button key={c.id} onClick={() => c.available && setView('pick')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 14px 5px 28px', border: 'none', background: view === 'pick' && c.available ? '#EDF4F0' : 'none', color: c.available ? '#1A1A1A' : '#C4BFB8', borderRadius: 6, cursor: c.available ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: 13 }}>
              <span>{c.label}</span>
              {!c.available && <span style={{ fontSize: 9, background: '#F0EDE6', color: '#9A9488', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>soon</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ height: 60, borderBottom: '1px solid #E8E3DA', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {sidebarCollapsed && <button onClick={() => setSidebarCollapsed(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A9488' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>}
            <span style={{ fontSize: 16, fontWeight: 500 }}>
              {view === 'dashboard' ? 'Harkey' : view === 'classes' ? 'My Classes' : view === 'class-detail' ? selectedClass?.name || 'Class' : view === 'pick' ? 'Pick Problems' : view === 'library' ? 'Library' : 'Transcripts'}
            </span>
            {view === 'pick' && <span style={{ fontSize: 11, color: '#9A9488', background: '#F0EDE6', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>Math 2 · {problems.length} problems</span>}
          </div>
          {view !== 'dashboard' && <button onClick={() => setView('dashboard')} style={{ padding: '7px 14px', border: '1px solid #E8E3DA', borderRadius: 6, background: 'none', color: '#6F6A61', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Ask Harkey</button>}
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* DASHBOARD */}
          {view === 'dashboard' && <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 820, margin: '0 auto', width: '100%', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 20px' }}>
                {messages.length === 0 && <>
                  <h1 style={{ fontFamily: 'serif', fontSize: 26, marginBottom: 6 }}>Good morning, Harkey.</h1>
                  <p style={{ color: '#6F6A61', fontSize: 15, marginBottom: 24 }}>I know every problem in Math 2. Ask me about sequencing, connections, or what to assign.</p>
                  {['Show me all parametric equation problems', 'Design a 3-problem arc on vectors', 'What connects circles to trigonometry?', 'Which problems work for a first Harkness discussion?'].map(p => (
                    <button key={p} onClick={() => sendHarkey({ text: p })} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, border: '1px solid #E8E3DA', borderRadius: 8, background: '#F5F3EE', fontSize: 14, color: '#6F6A61', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D4A3D'; e.currentTarget.style.color = '#1A1A1A' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E3DA'; e.currentTarget.style.color = '#6F6A61' }}>{p}</button>
                  ))}
                </>}
                {messages.map((m, i) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    {m.role === 'assistant'
                      ? <div style={{ fontSize: 15, lineHeight: 1.7 }}><HarkeyMessage text={m.content} /></div>
                      : <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ maxWidth: '80%', padding: '10px 16px', borderRadius: 12, background: '#F0F0F0', fontSize: 15 }}>{m.content}</div></div>}
                  </div>
                ))}
                {(chatLoading || packaging) && <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}><svg width="24" height="24" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 2s linear infinite' }}><circle cx="25" cy="10" r="5" fill="#E26B4F"/><circle cx="38" cy="32" r="5" fill="#2D4A3D"/><circle cx="12" cy="32" r="5" fill="#B594DC"/></svg><span style={{ color: '#6F6A61' }}>{packaging ? 'Generating package…' : 'Thinking…'}</span></div>}
                <div ref={bottomRef} />
              </div>
              <div style={{ padding: '0 24px 20px', flexShrink: 0 }}>
                <KelviChatInput onSend={sendHarkey} onToggleDesmos={() => setDesmosOpen(v=>!v)} desmosOpen={desmosOpen} disabled={chatLoading||packaging} placeholder="Ask Harkey about Math 2…" />
              </div>
            </div>
            {desmosOpen && <div style={{ width: 460, borderLeft: '1px solid #E8E3DA', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid #E8E3DA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0EDE6' }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', color: '#9A9488' }}>Desmos</span>
                <button onClick={() => setDesmosOpen(false)} style={{ border: '1px solid #E8E3DA', borderRadius: 4, padding: '2px 8px', background: 'none', cursor: 'pointer' }}>✕</button>
              </div>
              <iframe src="https://www.desmos.com/calculator" style={{ flex: 1, border: 'none' }} title="Desmos" />
            </div>}
          </>}

          {/* CLASSES */}
          {(view === 'classes') && <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1 style={{ fontFamily: 'serif', fontSize: 26, fontWeight: 400 }}>My Classes</h1>
                <button onClick={() => setShowNewClass(true)} style={{ padding: '9px 18px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>+ New Class</button>
              </div>
              {showNewClass && <div style={{ background: '#F5F3EE', border: '1px solid #E8E3DA', borderRadius: 10, padding: '18px', marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>New class</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input value={newClassName} onChange={e => setNewClassName(e.target.value)} onKeyDown={e => e.key==='Enter' && createClass()} placeholder="Class name (e.g. Math 2 — Period 3)" style={{ flex: 1, padding: '8px 12px', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                  <input value={newClassPeriod} onChange={e => setNewClassPeriod(e.target.value)} placeholder="Period" style={{ width: 120, padding: '8px 12px', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={createClass} disabled={savingClass||!newClassName.trim()} style={{ padding: '7px 16px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>{savingClass ? 'Creating…' : 'Create'}</button>
                  <button onClick={() => setShowNewClass(false)} style={{ padding: '7px 12px', background: 'none', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: '#6F6A61' }}>Cancel</button>
                </div>
              </div>}
              {classes.length === 0
                ? <div style={{ textAlign: 'center', padding: '60px 20px', background: '#F5F3EE', border: '1px solid #E8E3DA', borderRadius: 12 }}>
                    <div style={{ fontFamily: 'serif', fontSize: 22, marginBottom: 10 }}>No classes yet</div>
                    <p style={{ color: '#6F6A61', fontSize: 14, marginBottom: 20 }}>Create a class to manage rosters and assign problem sets.</p>
                    <button onClick={() => setShowNewClass(true)} style={{ padding: '9px 20px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Create first class →</button>
                  </div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {classes.map(c => (
                      <div key={c.id} onClick={() => { setSelectedClass(c); setView('class-detail') }}
                        style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: 10, cursor: 'pointer', transition: 'border-color .12s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#2D4A3D'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#E8E3DA'}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 500 }}>{c.name}</div>
                          <div style={{ fontSize: 13, color: '#9A9488', marginTop: 2 }}>{[c.course, c.period].filter(Boolean).join(' · ')}</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4BFB8" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    ))}
                  </div>}
            </div>
          </div>}

          {/* CLASS DETAIL */}
          {view === 'class-detail' && selectedClass && <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <button onClick={() => setView('classes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6F6A61', fontSize: 14, fontFamily: 'inherit', padding: 0, marginBottom: 8 }}>← Classes</button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontFamily: 'serif', fontSize: 26, fontWeight: 400 }}>{selectedClass.name}</h1>
                  <div style={{ color: '#6F6A61', fontSize: 13, marginTop: 3 }}>{selectedClass.course} · {members.length} student{members.length !== 1 ? 's' : ''}</div>
                </div>
                <button onClick={() => deleteClass(selectedClass.id)} style={{ padding: '6px 12px', border: '1px solid #fcc', borderRadius: 6, background: 'none', color: '#c0392b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
              </div>
              <div style={{ background: '#F5F3EE', border: '1px solid #E8E3DA', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Add a student</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} onKeyDown={e => e.key==='Enter' && addMember()} placeholder="Student name" style={{ flex: 1, padding: '7px 11px', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                  <input value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && addMember()} placeholder="Email (optional)" style={{ flex: 1, padding: '7px 11px', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                  <button onClick={addMember} disabled={!newStudentName.trim()} style={{ padding: '7px 14px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                </div>
              </div>
              {members.length === 0
                ? <div style={{ textAlign: 'center', padding: '32px 20px', background: '#F5F3EE', border: '1px solid #E8E3DA', borderRadius: 10, color: '#9A9488', fontSize: 14 }}>No students yet.</div>
                : <div style={{ border: '1px solid #E8E3DA', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '9px 14px', background: '#F5F3EE', borderBottom: '1px solid #E8E3DA', fontSize: 11, fontFamily: 'monospace', letterSpacing: '.1em', textTransform: 'uppercase', color: '#9A9488' }}>Roster · {members.length}</div>
                    {members.map((m, i) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', borderBottom: i < members.length-1 ? '1px solid #F0EDE6' : 'none', background: '#fff' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#2D4A3D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 600, marginRight: 12, flexShrink: 0 }}>{m.student_name.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15 }}>{m.student_name}</div>
                          {m.student_email && <div style={{ fontSize: 12, color: '#9A9488' }}>{m.student_email}</div>}
                        </div>
                        <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4BFB8', fontSize: 16, padding: '4px 8px' }}>✕</button>
                      </div>
                    ))}
                  </div>}
            </div>
          </div>}

          {/* PICK PROBLEMS */}
          {view === 'pick' && <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: 190, borderRight: '1px solid #E8E3DA', overflowY: 'auto', background: '#F5F3EE', flexShrink: 0 }}>
              <div style={{ padding: '12px 12px 6px', fontSize: 10, color: '#9A9488', fontFamily: 'monospace', letterSpacing: '.12em', textTransform: 'uppercase' }}>Topics</div>
              <button onClick={() => setActiveTopic('')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: !activeTopic ? '#2D4A3D' : 'none', color: !activeTopic ? '#fff' : '#6F6A61', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>All {problems.length}</button>
              {topics.map(t => <button key={t} onClick={() => setActiveTopic(t)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 12px', border: 'none', background: activeTopic===t ? '#2D4A3D' : 'none', color: activeTopic===t ? '#fff' : '#6F6A61', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>{t}</button>)}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #E8E3DA', flexShrink: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ flex: 1, padding: '7px 11px', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                <span style={{ fontSize: 13, color: '#9A9488', whiteSpace: 'nowrap' }}>{filtered.length} problems</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
                {filtered.map(p => {
                  const isSel = !!selected.find(x => x.id === p.id)
                  return <div key={p.id} onClick={() => toggle(p)} style={{ display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', marginBottom: 3, border: `1px solid ${isSel ? '#2D4A3D' : 'transparent'}`, background: isSel ? '#EDF4F0' : 'none' }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F5F3EE' }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'none' }}>
                    <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${isSel ? '#2D4A3D' : '#D9D4C9'}`, background: isSel ? '#2D4A3D' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      {isSel && <svg width="9" height="9" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#9A9488', fontFamily: 'monospace', marginBottom: 1 }}>#{p.problem_number} · {p.topic}</div>
                      <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.5 }}>{p.body?.slice(0, 140)}{(p.body?.length||0)>140?'…':''}</div>
                    </div>
                  </div>
                })}
              </div>
            </div>
            <div style={{ width: 270, borderLeft: '1px solid #E8E3DA', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #E8E3DA', flexShrink: 0 }}>
                <div style={{ fontFamily: 'serif', fontSize: 16, marginBottom: 8 }}>Problem Set</div>
                <input value={psTitle} onChange={e => setPsTitle(e.target.value)} placeholder="Untitled" style={{ width: '100%', padding: '6px 10px', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
                {selected.length === 0 ? <div style={{ color: '#9A9488', fontSize: 13, padding: '20px 8px', textAlign: 'center' }}>Click problems to add.</div>
                  : selected.map((p, i) => <div key={p.id} style={{ display: 'flex', gap: 6, padding: '6px 8px', marginBottom: 3, background: '#F5F3EE', border: '1px solid #E8E3DA', borderRadius: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#9A9488', fontFamily: 'monospace' }}>#{p.problem_number}</div>
                        <div style={{ fontSize: 12, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.body?.slice(0,55)}…</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                        <button onClick={() => {if(i>0){const s=[...selected];[s[i-1],s[i]]=[s[i],s[i-1]];setSelected(s)}}} style={{ padding: '1px 4px', border: '1px solid #D9D4C9', borderRadius: 3, background: 'none', cursor: 'pointer', fontSize: 10 }}>↑</button>
                        <button onClick={() => {if(i<selected.length-1){const s=[...selected];[s[i],s[i+1]]=[s[i+1],s[i]];setSelected(s)}}} style={{ padding: '1px 4px', border: '1px solid #D9D4C9', borderRadius: 3, background: 'none', cursor: 'pointer', fontSize: 10 }}>↓</button>
                        <button onClick={() => toggle(p)} style={{ padding: '1px 4px', border: '1px solid #fcc', borderRadius: 3, background: 'none', cursor: 'pointer', fontSize: 10, color: '#c0392b' }}>✕</button>
                      </div>
                    </div>)}
              </div>
              <div style={{ padding: 10, borderTop: '1px solid #E8E3DA', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: '#9A9488', marginBottom: 6 }}>{selected.length} problem{selected.length !== 1 ? 's' : ''}</div>
                <button onClick={goToReview} disabled={!selected.length} style={{ width: '100%', padding: '9px', background: selected.length ? '#2D4A3D' : '#E8E3DA', color: selected.length ? '#fff' : '#9A9488', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: selected.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>Review & Export →</button>
              </div>
            </div>
          </div>}

          {/* LIBRARY */}
          {view === 'library' && <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1 style={{ fontFamily: 'serif', fontSize: 26, fontWeight: 400 }}>Worksheet Library</h1>
                <button onClick={() => setView('pick')} style={{ padding: '9px 18px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>+ New Problem Set</button>
              </div>
              {savedSets.length === 0
                ? <div style={{ textAlign: 'center', padding: '60px 20px', background: '#F5F3EE', border: '1px solid #E8E3DA', borderRadius: 12 }}>
                    <div style={{ fontFamily: 'serif', fontSize: 22, marginBottom: 10 }}>No problem sets yet</div>
                    <p style={{ color: '#6F6A61', fontSize: 14, marginBottom: 20 }}>Ask Harkey or pick problems to create your first set.</p>
                    <button onClick={() => setView('dashboard')} style={{ padding: '9px 18px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginRight: 8 }}>Ask Harkey</button>
                    <button onClick={() => setView('pick')} style={{ padding: '9px 18px', background: 'none', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Pick problems</button>
                  </div>
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                    {savedSets.map(ps => <div key={ps.id} onClick={() => window.open(`/harkness/review/${ps.id}`, '_blank')}
                      style={{ padding: '16px 18px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: 10, cursor: 'pointer', transition: 'border-color .12s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#2D4A3D'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#E8E3DA'}>
                      <div style={{ fontFamily: 'serif', fontSize: 16, marginBottom: 6, lineHeight: 1.3 }}>{ps.title}</div>
                      <div style={{ fontSize: 12, color: '#9A9488', fontFamily: 'monospace' }}>{(ps.problem_numbers||[]).length} problems · #{(ps.problem_numbers||[]).slice(0,4).join(', ')}{(ps.problem_numbers||[]).length>4?'…':''}</div>
                      <div style={{ fontSize: 11, color: '#C4BFB8', marginTop: 6 }}>{new Date(ps.updated_at||ps.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                    </div>)}
                  </div>}
            </div>
          </div>}

          {/* TRANSCRIPTS */}
          {view === 'transcripts' && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#6F6A61' }}>
            <div style={{ fontFamily: 'serif', fontSize: 22, color: '#1A1A1A' }}>Student Transcripts</div>
            <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 400 }}>Share student links from the review page. Sessions appear here automatically.</p>
            <button onClick={() => setView('library')} style={{ padding: '9px 18px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Go to Library →</button>
          </div>}
        </div>
      </div>
    </div>
  )
}
