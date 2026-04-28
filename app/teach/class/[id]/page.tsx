'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

async function saveProblemSet(classId: string, problemSet: any, teacherFacing: any, hasBrief: boolean) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: ps, error: psError } = await supabase
    .from('problem_sets')
    .insert({
      class_id: classId,
      title: problemSet.title,
      duration_minutes: problemSet.duration_minutes,
      has_brief: hasBrief
    })
    .select()
    .single()

  if (psError) throw psError

  const problemsToInsert = problemSet.problems.map((p: any) => ({
    problem_set_id: ps.id,
    problem_number: p.number,
    title: p.title,
    body: p.body,
    subparts: p.subparts || [],
    pcg_levels: p.pcg_levels || [],
    class_id: classId
  }))

  const { error: probError } = await supabase
    .from('problems')
    .insert(problemsToInsert)

  if (probError) throw probError

  if (hasBrief && teacherFacing) {
    const { error: briefError } = await supabase
      .from('briefs')
      .insert({
        problem_set_id: ps.id,
        body: teacherFacing
      })
    if (briefError) throw briefError
  }

  return ps.id
}

export default function ClassPage() {
  const params = useParams()
  const [classData, setClassData] = useState<any>(null)
  const [step, setStep] = useState<'chat' | 'review'>('chat')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [problemSet, setProblemSet] = useState<any>(null)
  const [teacherFacing, setTeacherFacing] = useState<any>(null)
  const [problemId, setProblemId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'problem' | 'brief' | 'preview'>('problem')
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [hasBrief, setHasBrief] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('kelvi_temp_classes')
    if (saved) {
      const classes = JSON.parse(saved)
      const cls = classes.find((c: any) => c.id === params.id)
      setClassData(cls)
    }
  }, [params.id])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [input])

  async function send() {
    if (!input.trim() || loading) return
    const newMsgs: Message[] = [...messages, { role: 'user', content: input }]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs })
      })
      const data = await res.json()
      
      if (data.reply) {
        let clean = data.reply.trim().replace(/^```json\n/, '').replace(/\n```$/, '')
        
        try {
          const parsed = JSON.parse(clean)
          if (parsed.problem_set) {
            // Check if brief was requested
            const userMessage = input.toLowerCase()
            const wantsBrief = userMessage.includes('brief')
            setHasBrief(wantsBrief)
            
          // TEMPORARILY SKIP DATABASE - just test UI
const problemSetId = 'temp-id-12345'
console.log('Skipping database save for now')

setProblemSet(parsed.problem_set)
setTeacherFacing(parsed.teacher_facing)
setProblemId(problemSetId)
            setStep('review')
            
            const msg = `✓ Built "${parsed.problem_set.title}". Check the preview on the right.`
            setMessages([...newMsgs, { role: 'assistant', content: msg }])
            speak(msg)
          } else {
            setMessages([...newMsgs, { role: 'assistant', content: data.reply }])
            speak(data.reply)
          }
        } catch (e) {
          setMessages([...newMsgs, { role: 'assistant', content: data.reply }])
          speak(data.reply)
        }
      }
    } catch (e: any) {
      setMessages([...newMsgs, { role: 'assistant', content: '❌ Error: ' + e.message }])
    }
    setLoading(false)
  }

  function startRecording() {
    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onstart = () => setIsRecording(true)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsRecording(false)
    }
    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)
    recognition.start()
  }

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files))
    }
  }

  function generateStudentLink() {
    if (!problemId) return alert('Problem set not saved yet')
    const link = `${window.location.origin}/student/${problemId}`
    navigator.clipboard.writeText(link)
    alert(`Student link copied!\n\n${link}`)
  }

  async function generatePDF() {
    if (!problemSet) return
    
    const latex = `\\documentclass{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath}
\\begin{document}

\\title{${problemSet.title}}
\\date{}
\\maketitle

${problemSet.problems.map((p: any) => `
\\section*{${p.number}. ${p.title}}

${p.body}

${p.subparts && p.subparts.length > 0 ? p.subparts.map((s: string, i: number) => `
\\textbf{${String.fromCharCode(97 + i)}) } ${s}
`).join('\n') : ''}
`).join('\n\\vspace{1em}\n')}

\\end{document}`

    try {
      const response = await fetch('https://latex.ytotech.com/builds/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler: 'pdflatex',
          resources: [{
            content: latex,
            name: 'main.tex'
          }]
        })
      })

      if (!response.ok) throw new Error('PDF generation failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${problemSet.title}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('Failed to generate PDF. Please try again.')
      console.error(error)
    }
  }

  if (!classData) return <div>Loading...</div>

  return (
    <div style={{height: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF8F3'}}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Top Bar */}
      <div style={{height: '60px', borderBottom: '1px solid #E8E3DA', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '16px', background: '#fff'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M 50 6 C 65 4, 80 14, 78 32 C 76 48, 60 52, 44 50 C 28 48, 24 32, 28 18 C 32 8, 40 6, 50 6 Z" fill="#E26B4F"/>
            <path d="M 22 56 C 36 54, 44 64, 42 80 C 40 92, 28 96, 16 92 C 6 88, 4 76, 8 66 C 12 58, 16 56, 22 56 Z" fill="#2D4A3D"/>
            <path d="M 70 56 C 84 56, 94 64, 92 78 C 90 92, 78 96, 66 92 C 54 88, 52 76, 56 66 C 60 58, 64 56, 70 56 Z" fill="#B594DC"/>
          </svg>
          <span style={{fontFamily: 'serif', fontSize: '20px'}}>kelvi</span>
        </div>
        <div style={{width: '1px', height: '20px', background: '#E8E3DA'}} />
        <Link href="/teach" style={{color: '#3A6B5C', fontSize: '14px', textDecoration: 'none'}}>← All classes</Link>
        <div style={{width: '1px', height: '20px', background: '#E8E3DA'}} />
        <strong style={{fontSize: '16px'}}>{classData.name}</strong>
      </div>

      {/* Full Screen Chat */}
      {step === 'chat' && (
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '900px', margin: '0 auto', width: '100%', padding: '40px 20px'}}>
          <div style={{flex: 1, overflowY: 'auto', marginBottom: '20px'}}>
            {messages.map((m, i) => (
              <div key={i} style={{marginBottom: '24px'}}>
                {m.role === 'assistant' ? (
                  <div style={{fontSize: '15px', lineHeight: 1.7, color: '#1A1A1A'}}>{m.content}</div>
                ) : (
                  <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                    <div style={{maxWidth: '80%', padding: '12px 16px', borderRadius: '16px', background: '#F5F5F5', fontSize: '15px', lineHeight: 1.7, color: '#1A1A1A'}}>
                      {m.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{animation: 'spin 2s linear infinite'}}>
                  <circle cx="25" cy="10" r="5" fill="#E26B4F"/>
                  <circle cx="38" cy="32" r="5" fill="#2D4A3D"/>
                  <circle cx="12" cy="32" r="5" fill="#B594DC"/>
                </svg>
                <span style={{color: '#6F6A61', fontSize: '15px'}}>Thinking...</span>
              </div>
            )}
          </div>

          {/* Claude-style input */}
          <div style={{position: 'relative', background: '#fff', border: '1px solid #E8E3DA', borderRadius: '24px', padding: '4px'}}>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: '8px'}}>
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {uploadedFiles.length > 0 && (
                  <div style={{padding: '8px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    {uploadedFiles.map((f, i) => (
                      <div key={i} style={{background: '#F0EDE6', padding: '6px 12px', borderRadius: '12px', fontSize: '12px'}}>📄 {f.name}</div>
                    ))}
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder='Example: "I need a discovery-based problem set on fractions for 3rd grade, 30 minutes, local context (Hampton pizza shops). I want a PDF and student link."'
                  disabled={loading}
                  rows={1}
                  style={{width: '100%', padding: '12px 16px', border: 'none', outline: 'none', fontSize: '15px', resize: 'none', fontFamily: 'inherit', background: 'transparent', maxHeight: '200px', overflowY: 'auto'}}
                />
              </div>
              <div style={{display: 'flex', gap: '4px', padding: '8px', alignItems: 'flex-end'}}>
                <input type="file" id="file-upload" multiple onChange={handleFileUpload} style={{display: 'none'}} />
                <label htmlFor="file-upload" style={{width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.15s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#F0EDE6'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </label>
                <button onClick={isRecording ? undefined : startRecording} style={{width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: isRecording ? '#E26B4F' : 'transparent', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.15s', color: isRecording ? '#fff' : '#6F6A61'}} onMouseEnter={(e) => !isRecording && (e.currentTarget.style.background = '#F0EDE6')} onMouseLeave={(e) => !isRecording && (e.currentTarget.style.background = 'transparent')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>
                <button onClick={isSpeaking ? stopSpeaking : undefined} style={{width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: isSpeaking ? '#E26B4F' : 'transparent', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.15s', color: isSpeaking ? '#fff' : '#6F6A61'}} onMouseEnter={(e) => !isSpeaking && (e.currentTarget.style.background = '#F0EDE6')} onMouseLeave={(e) => !isSpeaking && (e.currentTarget.style.background = 'transparent')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                </button>
                <button onClick={send} disabled={!input.trim() || loading} style={{width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: (!input.trim() || loading) ? '#E8E3DA' : '#3A6B5C', color: '#fff', cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer', borderRadius: '8px', transition: 'background 0.15s'}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split View - Review */}
      {step === 'review' && (
        <div style={{flex: 1, display: 'flex', overflow: 'hidden'}}>
          <div style={{width: '400px', borderRight: '1px solid #E8E3DA', display: 'flex', flexDirection: 'column', background: '#fff'}}>
            <div style={{flex: 1, overflowY: 'auto', padding: '20px'}}>
              {messages.map((m, i) => (
                <div key={i} style={{marginBottom: '16px'}}>
                  {m.role === 'assistant' ? (
                    <div style={{fontSize: '14px', lineHeight: 1.6, color: '#1A1A1A'}}>{m.content}</div>
                  ) : (
                    <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                      <div style={{maxWidth: '80%', padding: '10px 14px', borderRadius: '12px', background: '#F5F5F5', fontSize: '14px'}}>{m.content}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{padding: '16px', borderTop: '1px solid #E8E3DA'}}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Adjust anything?" style={{width: '100%', padding: '10px', border: '1px solid #E8E3DA', borderRadius: '20px', outline: 'none'}} />
            </div>
          </div>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div style={{display: 'flex', borderBottom: '1px solid #E8E3DA', background: '#fff'}}>
              <button onClick={() => setActiveTab('problem')} style={{padding: '16px 24px', border: 'none', background: activeTab === 'problem' ? '#fff' : '#f5f5f5', borderBottom: activeTab === 'problem' ? '2px solid #3A6B5C' : 'none', color: activeTab === 'problem' ? '#3A6B5C' : '#6F6A61', fontWeight: 500, cursor: 'pointer'}}>Problem set</button>
              {hasBrief && <button onClick={() => setActiveTab('brief')} style={{padding: '16px 24px', border: 'none', background: activeTab === 'brief' ? '#fff' : '#f5f5f5', borderBottom: activeTab === 'brief' ? '2px solid #3A6B5C' : 'none', color: activeTab === 'brief' ? '#3A6B5C' : '#6F6A61', fontWeight: 500, cursor: 'pointer'}}>Brief</button>}
              <button onClick={() => setActiveTab('preview')} style={{padding: '16px 24px', border: 'none', background: activeTab === 'preview' ? '#fff' : '#f5f5f5', borderBottom: activeTab === 'preview' ? '2px solid #3A6B5C' : 'none', color: activeTab === 'preview' ? '#3A6B5C' : '#6F6A61', fontWeight: 500, cursor: 'pointer'}}>Student preview</button>
            </div>
            <div style={{flex: 1, padding: '40px', overflowY: 'auto', background: '#FAF8F3'}}>
              {activeTab === 'problem' && problemSet && (
                <div style={{maxWidth: '700px'}}><h1 style={{fontFamily: 'serif', fontSize: '2.5rem', marginBottom: '16px'}}>{problemSet.title}</h1><div style={{marginBottom: '40px', color: '#6F6A61'}}>{problemSet.duration_minutes} min · {problemSet.problems.length} problems</div>{problemSet.problems.map((p: any, i: number) => (<div key={i} style={{marginBottom: '40px', paddingBottom: '30px', borderBottom: '1px solid #E8E3DA'}}><h3 style={{fontSize: '18px', marginBottom: '12px'}}>{p.number}. {p.title}</h3><p style={{lineHeight: 1.7, marginBottom: '12px'}}>{p.body}</p>{p.subparts && p.subparts.map((s: string, j: number) => (<div key={j} style={{paddingLeft: '20px', marginBottom: '6px'}}>{s}</div>))}</div>))}</div>
              )}
              {activeTab === 'brief' && teacherFacing && (<div style={{maxWidth: '700px'}}><h2 style={{fontSize: '2rem', marginBottom: '32px'}}>Teacher Brief</h2><div style={{marginBottom: '24px'}}><strong>Purpose:</strong><p>{teacherFacing.purpose}</p></div><div style={{marginBottom: '24px'}}><strong>First Problem Rationale:</strong><p>{teacherFacing.first_problem_rationale}</p></div><div><strong>Expected Misconceptions:</strong><ul>{teacherFacing.expected_misconceptions?.map((m: string, i: number) => (<li key={i}>{m}</li>))}</ul></div></div>)}
              {activeTab === 'preview' && problemSet && (<div style={{maxWidth: '700px'}}><div style={{background: '#FEF3C6', padding: '12px', borderRadius: '4px', marginBottom: '32px', fontSize: '13px'}}>Student preview</div><h1 style={{fontFamily: 'serif', fontSize: '2.5rem', marginBottom: '40px'}}>{problemSet.title}</h1>{problemSet.problems.map((p: any, i: number) => (<div key={i} style={{marginBottom: '40px'}}><h3 style={{fontSize: '18px', marginBottom: '12px'}}>{p.number}. {p.title}</h3><p style={{lineHeight: 1.7, marginBottom: '12px'}}>{p.body}</p>{p.subparts && p.subparts.map((s: string, j: number) => (<div key={j} style={{paddingLeft: '20px', marginBottom: '6px'}}>{s}</div>))}</div>))}</div>)}
            </div>
            <div style={{borderTop: '1px solid #E8E3DA', padding: '16px 40px', background: '#fff', display: 'flex', gap: '12px'}}>
              <button onClick={generatePDF} style={{padding: '12px 20px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: '6px', cursor: 'pointer', fontWeight: 500}}>PDF</button>
              <button onClick={() => {const latex = `% ${problemSet.title}\n\n${problemSet.problems.map((p: any) => `\\section{${p.title}}\n${p.body}`).join('\n\n')}`; navigator.clipboard.writeText(latex); alert('LaTeX copied!')}} style={{padding: '12px 20px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: '6px', cursor: 'pointer', fontWeight: 500}}>LaTeX</button>
              <button onClick={generateStudentLink} style={{padding: '12px 20px', background: '#3A6B5C', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500}}>Student link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}