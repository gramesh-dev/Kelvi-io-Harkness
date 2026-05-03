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
  const [bulkInput,        setBulkInput]        = useState('')
  const [bulkMode,         setBulkMode]         = useState(false)
  const [addingBulk,       setAddingBulk]       = useState(false)
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
  const [studentNotes,     setStudentNotes]     = useState<any[]>([])
  const [sessionLogs,      setSessionLogs]      = useState<any[]>([])
  const [logNote,          setLogNote]          = useState('')
  const [logLoading,       setLogLoading]       = useState(false)
  const [logResult,        setLogResult]        = useState<string>('')
  const [micListening,     setMicListening]     = useState(false)
  const micRef = useRef<any>(null)
  const [selectedMember,   setSelectedMember]   = useState<Member | null>(null)
  const [memberNotes,      setMemberNotes]      = useState<any[]>([])
  const [classView,        setClassView]        = useState<'roster'|'log'|'student'>('roster')
  const [firstName,        setFirstName]        = useState('Gayatri')
  const [userEmail,        setUserEmail]        = useState('')

  useEffect(() => {
    loadClasses(); loadProblems(); loadSavedSets()
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d.firstName) setFirstName(d.firstName)
      if (d.email) setUserEmail(d.email)
    })
  }, [])
  useEffect(() => {
    if (selectedClass) {
      loadMembers(selectedClass.id)
      loadClassNotes(selectedClass.id)
      setClassView('roster')
      setLogResult('')
      setSelectedMember(null)
    }
  }, [selectedClass])
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

  function greeting() {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }

  async function addBulkMembers() {
    if (!bulkInput.trim() || !selectedClass || addingBulk) return
    setAddingBulk(true)
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(Boolean)
    let added = 0
    for (const line of lines) {
      const isEmail = line.includes('@')
      const student_name = isEmail ? line.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : line
      const student_email = isEmail ? line : ''
      const d = await fetch('/api/harkness-class-members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: selectedClass.id, student_name, student_email }),
      }).then(r => r.json())
      if (d.member) { setMembers(m => [...m, d.member]); added++ }
    }
    setBulkInput(''); setBulkMode(false); setAddingBulk(false)
    if (added > 0) alert(`Added ${added} student${added !== 1 ? 's' : ''}`)
  }

  async function loadClassNotes(classId: string) {
    const d = await fetch(`/api/harkness-log?class_id=${classId}`).then(r => r.json())
    setSessionLogs(d.logs || [])
    setStudentNotes(d.notes || [])
  }

  async function loadMemberNotes(memberId: string) {
    const d = await fetch(`/api/harkness-log?member_id=${memberId}`).then(r => r.json())
    setMemberNotes(d.notes || [])
  }

  function toggleMic() {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice input works best in Chrome or Edge. Please type your note instead.')
      return
    }
    if (micListening) {
      micRef.current?.stop()
      setMicListening(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    micRef.current = recognition
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('')
      setLogNote(transcript)
    }
    recognition.onerror = () => setMicListening(false)
    recognition.onend = () => setMicListening(false)
    recognition.start()
    setMicListening(true)
  }

  async function submitLog() {
    if (!logNote.trim() || !selectedClass || logLoading) return
    setLogLoading(true)
    setLogResult('')
    try {
      const res = await fetch('/api/harkness-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClass.id,
          note: logNote,
          roster: members.map(m => m.student_name),
        }),
      })
      const d = await res.json()
      if (d.error) { setLogResult('Error: ' + d.error); return }
      setLogResult(d.summary || 'Logged.')
      setLogNote('')
      await loadClassNotes(selectedClass.id)
    } catch (e: any) { setLogResult('Error: ' + e.message) }
    finally { setLogLoading(false) }
  }

  function hwStreakFor(memberId: string): { streak: number; lastDid: boolean | null } {
    const hw = studentNotes
      .filter(n => n.member_id === memberId && n.type === 'homework')
      .sort((a, b) => b.date.localeCompare(a.date))
    if (!hw.length) return { streak: 0, lastDid: null }
    let streak = 0
    for (const h of hw) { if (h.value === true) streak++; else break }
    return { streak, lastDid: hw[0].value }
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

      if (data.action?.action === 'student_link_only') {
        setChatLoading(false)
        setMessages([...newMessages, { role: 'assistant', content: '✓ Creating student link…' }])
        setPackaging(true)
        try {
          const res = await fetch('/api/harkness-publish', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: data.action.title, problems: data.action.problems.map((n: number) => ({ problem_number: n })), visibility: 'anyone' }),
          })
          const d = await res.json()
          if (d.error) throw new Error(d.error)
          await loadSavedSets()
          const link = `${window.location.origin}/harkness/student/${d.id}`
          await navigator.clipboard.writeText(link).catch(() => {})
          setMessages(m => [...m, { role: 'assistant', content: `✓ Student link ready (copied to clipboard):

${link}` }])
        } catch (e: any) {
          setMessages(m => [...m, { role: 'assistant', content: `Error: ${e.message}` }])
        } finally { setPackaging(false) }
        return
      }

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
          <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '.12em', textTransform: 'uppercase', color: '#9A9488', padding: '12px 8px 4px', display: sidebarCollapsed ? 'none' : 'block' }}>Account</div>
          {!sidebarCollapsed && <div style={{ padding: '6px 8px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: '#EAE7E0' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2D4A3D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 600, flexShrink: 0 }}>{firstName.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstName}</div>
                <div style={{ fontSize: 11, color: '#9A9488', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
              </div>
            </div>
          </div>}
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
                  <h1 style={{ fontFamily: 'serif', fontSize: 26, marginBottom: 6 }}>{greeting()}, {firstName}.</h1>
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
          {view === 'class-detail' && selectedClass && <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Left: roster + student detail */}
            <div style={{ width: 280, borderRight: '1px solid #E8E3DA', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E3DA', flexShrink: 0 }}>
                <button onClick={() => setView('classes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6F6A61', fontSize: 13, fontFamily: 'inherit', padding: 0, marginBottom: 6 }}>← Classes</button>
                <div style={{ fontFamily: 'serif', fontSize: 20 }}>{selectedClass.name}</div>
                <div style={{ fontSize: 12, color: '#9A9488', marginTop: 2 }}>{selectedClass.course} · {members.length} students · {sessionLogs.length} sessions logged</div>
              </div>

              {/* Roster */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {members.length === 0
                  ? <div style={{ padding: '24px 16px', color: '#9A9488', fontSize: 14, textAlign: 'center' }}>No students yet.</div>
                  : members.map(m => {
                    const { streak, lastDid } = hwStreakFor(m.id)
                    const recentNote = studentNotes.filter(n => n.member_id === m.id && n.type !== 'homework').sort((a:any,b:any) => b.date.localeCompare(a.date))[0]
                    const isSelected = selectedMember?.id === m.id && classView === 'student'
                    return (
                      <div key={m.id} onClick={() => { setSelectedMember(m); loadMemberNotes(m.id); setClassView('student') }}
                        style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #F0EDE6', cursor: 'pointer', background: isSelected ? '#EDF4F0' : 'none', borderLeft: `3px solid ${isSelected ? '#2D4A3D' : 'transparent'}` }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: lastDid === false ? '#E26B4F' : lastDid === true ? '#2D4A3D' : '#D9D4C9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 600, marginRight: 10, flexShrink: 0 }}>
                          {m.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{m.student_name}</div>
                          <div style={{ fontSize: 11, color: '#9A9488', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {streak > 0 ? `🔥 ${streak} hw` : lastDid === false ? '✗ missed hw' : recentNote ? recentNote.content?.slice(0,40) : 'No entries yet'}
                          </div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>

              {/* Add student */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid #E8E3DA', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#6F6A61', fontWeight: 500 }}>Add student</span>
                  <button onClick={() => setBulkMode(v => !v)} style={{ fontSize: 11, color: '#6F6A61', background: 'none', border: '1px solid #D9D4C9', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>{bulkMode ? 'One at a time' : 'Paste list'}</button>
                </div>
                {bulkMode ? (
                  <div>
                    <textarea value={bulkInput} onChange={e => setBulkInput(e.target.value)} placeholder={'One name or email per line'} rows={3}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={addBulkMembers} disabled={addingBulk||!bulkInput.trim()} style={{ flex: 1, padding: '6px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{addingBulk ? 'Adding…' : 'Add all'}</button>
                      <button onClick={() => { setBulkMode(false); setBulkInput('') }} style={{ padding: '6px 10px', background: 'none', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#6F6A61' }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} onKeyDown={e => e.key==='Enter' && addMember()} placeholder="Name"
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                    <input value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && addMember()} placeholder="Email (optional)"
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #D9D4C9', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                    <button onClick={addMember} disabled={!newStudentName.trim()} style={{ padding: '7px', background: '#2D4A3D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: main panel — log session OR student detail */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid #E8E3DA', background: '#FAF8F3', flexShrink: 0 }}>
                {([['roster', 'Session Log'], ['student', selectedMember ? selectedMember.student_name.split(' ')[0] : 'Student']] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setClassView(v as any)}
                    style={{ padding: '12px 20px', border: 'none', background: classView === v ? '#FAF8F3' : '#F0EDE6', borderBottom: classView === v ? '2px solid #2D4A3D' : 'none', color: classView === v ? '#2D4A3D' : '#6F6A61', fontWeight: 500, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* SESSION LOG */}
              {classView === 'roster' && <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                  {/* Log input */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Log today's session</div>
                    <div style={{ fontSize: 13, color: '#6F6A61', marginBottom: 12, lineHeight: 1.5 }}>
                      Talk naturally — Harkey figures out the rest.
                    </div>
                    <div style={{ background: '#F5F3EE', border: '1px solid #E8E3DA', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: '#9A9488', fontFamily: 'monospace', marginBottom: 8, letterSpacing: '.06em', textTransform: 'uppercase' }}>Try saying…</div>
                      {["Everyone did their homework except Tyler.", "Maria asked why vectors can't be added to scalars.", "James presented #43. Olivia was absent."].map(ex => (
                        <button key={ex} onClick={() => setLogNote(ex)} style={{ display: 'block', fontSize: 12, color: '#6F6A61', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 0', textAlign: 'left', lineHeight: 1.5 }}>"{ex}"</button>
                      ))}
                    </div>
                    <textarea value={logNote} onChange={e => setLogNote(e.target.value)}
                      placeholder={`What happened in ${selectedClass.name} today?`} rows={4}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #D9D4C9', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={submitLog} disabled={logLoading || !logNote.trim()}
                        style={{ padding: '9px 20px', background: logLoading || !logNote.trim() ? '#E8E3DA' : '#2D4A3D', color: logLoading || !logNote.trim() ? '#9A9488' : '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: logLoading || !logNote.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                        {logLoading ? 'Logging…' : 'Log session'}
                      </button>
                      <button onClick={toggleMic} title={micListening ? 'Stop recording' : 'Speak your session note'}
                        style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${micListening ? '#E26B4F' : '#D9D4C9'}`, background: micListening ? '#FEF0EC' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                        {micListening
                          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="#E26B4F"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6F6A61" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>}
                      </button>
                      {micListening && <span style={{ fontSize: 12, color: '#E26B4F', fontWeight: 500 }}>● Recording…</span>}
                    </div>
                    {logResult && (
                      <div style={{ marginTop: 12, padding: '12px 14px', background: '#EDF4F0', border: '1px solid #C3DDD3', borderRadius: 8, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line', color: '#1A1A1A' }}>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '.08em', textTransform: 'uppercase', color: '#2D4A3D', marginBottom: 6 }}>Harkey logged:</div>
                        {logResult}
                      </div>
                    )}
                  </div>

                  {/* Past session logs */}
                  {sessionLogs.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9A9488', marginBottom: 12, letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'monospace' }}>Past sessions</div>
                      {sessionLogs.map((log: any) => (
                        <div key={log.id} style={{ marginBottom: 12, padding: '10px 14px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: '#9A9488', fontFamily: 'monospace', marginBottom: 4 }}>{new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                          <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.6 }}>{log.raw_note}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>}

              {/* STUDENT DETAIL */}
              {classView === 'student' && selectedMember && <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#2D4A3D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 600, flexShrink: 0 }}>
                    {selectedMember.student_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'serif', fontSize: 22 }}>{selectedMember.student_name}</div>
                    {selectedMember.student_email && <a href={`mailto:${selectedMember.student_email}`} style={{ fontSize: 13, color: '#2D4A3D', textDecoration: 'none' }}>{selectedMember.student_email}</a>}
                  </div>
                  <button onClick={() => removeMember(selectedMember.id)} style={{ marginLeft: 'auto', padding: '5px 10px', border: '1px solid #fcc', borderRadius: 6, background: 'none', color: '#c0392b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                </div>

                {/* Stats row */}
                {(() => {
                  const hw = memberNotes.filter(n => n.type === 'homework')
                  const hwDone = hw.filter(n => n.value === true).length
                  const questions = memberNotes.filter(n => n.type === 'question')
                  const presentations = memberNotes.filter(n => n.type === 'presentation')
                  const { streak } = hwStreakFor(selectedMember.id)
                  return (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                      {[
                        { label: 'HW done', val: `${hwDone}/${hw.length}` },
                        { label: 'Streak', val: streak > 0 ? `🔥 ${streak}` : '—' },
                        { label: 'Questions', val: questions.length },
                        { label: 'Presentations', val: presentations.length },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ flex: 1, padding: '10px 12px', background: '#F5F3EE', border: '1px solid #E8E3DA', borderRadius: 8, textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A' }}>{val}</div>
                          <div style={{ fontSize: 11, color: '#9A9488', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Timeline */}
                {memberNotes.length === 0
                  ? <div style={{ color: '#9A9488', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>No entries yet. Log a session to see {selectedMember.student_name.split(' ')[0]}'s record.</div>
                  : <div>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '.1em', textTransform: 'uppercase', color: '#9A9488', marginBottom: 12 }}>Activity log</div>
                      {Object.entries(
                        memberNotes.reduce((acc: any, n: any) => { if (!acc[n.date]) acc[n.date] = []; acc[n.date].push(n); return acc }, {})
                      ).sort(([a],[b]) => b.localeCompare(a)).map(([date, notes]: [string, any]) => (
                        <div key={date} style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 11, color: '#9A9488', fontFamily: 'monospace', marginBottom: 6 }}>
                            {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                          {(notes as any[]).map((n: any, i: number) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                              <div style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>
                                {n.type === 'homework' ? (n.value ? '✓' : '✗') : n.type === 'question' ? '💬' : n.type === 'presentation' ? '📐' : n.type === 'absent' ? '⬜' : '📝'}
                              </div>
                              <div style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 1.5 }}>
                                {n.type === 'homework' ? (n.value ? 'Did homework' : 'Missed homework') : n.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>}
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
                      <div style={{ fontSize: 12, color: '#9A9488', fontFamily: 'monospace', marginBottom: 10 }}>{(ps.problem_numbers||[]).length} problems · #{(ps.problem_numbers||[]).slice(0,4).join(', ')}{(ps.problem_numbers||[]).length>4?'…':''}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 11, color: '#C4BFB8' }}>{new Date(ps.updated_at||ps.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={e => { e.stopPropagation(); window.open(`/harkness/student/${ps.id}`, '_blank') }} style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #D9D4C9', borderRadius: 4, background: 'none', color: '#6F6A61', cursor: 'pointer', fontFamily: 'inherit' }}>Student ↗</button>
                          <button onClick={e => { e.stopPropagation(); window.open(`/harkness/review/${ps.id}`, '_blank') }} style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #2D4A3D', borderRadius: 4, background: 'none', color: '#2D4A3D', cursor: 'pointer', fontFamily: 'inherit' }}>Review ↗</button>
                        </div>
                      </div>
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
