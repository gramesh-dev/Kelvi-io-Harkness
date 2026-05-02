'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ── Drop zone hook — attach to any container to enable image drop ─────────────
export function useDropZone(onFile: (file: File) => void) {
  const [dragOver, setDragOver] = useState(false)

  const props = {
    onDragOver:  (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) },
    onDrop:      (e: React.DragEvent) => {
      e.preventDefault(); setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith('image/')) onFile(file)
    },
  }

  return { dragOver, props }
}

// ── Types ────────────────────────────────────────────────────────────────────
export type ImageAttachment = {
  data: string          // base64
  media_type: string
  preview: string       // data URL for display
}

export type SendPayload = {
  text: string
  image?: ImageAttachment
  latex?: string        // MathQuill LaTeX output if math mode was used
}

// ── Icons ────────────────────────────────────────────────────────────────────
function MicIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" fill={active ? 'currentColor' : 'none'} />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="9" y1="22" x2="15" y2="22" />
    </svg>
  )
}

function SpeakerIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={active ? 'currentColor' : 'none'} />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      {active && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function MathIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}

function DesmosIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

// ── Math symbol palette ─────────────────────────────────────────────────────
const MATH_SYMBOLS = [
  {
    group: 'Basic',
    symbols: [
      { label: 'x²', insert: '^2', tip: 'Square' },
      { label: 'xⁿ', insert: '^', tip: 'Power' },
      { label: '√x', insert: '√(', tip: 'Square root' },
      { label: '∛x', insert: '∛(', tip: 'Cube root' },
      { label: 'x/y', insert: '/', tip: 'Fraction' },
      { label: '±', insert: '±', tip: 'Plus or minus' },
      { label: '×', insert: '×', tip: 'Multiply' },
      { label: '÷', insert: '÷', tip: 'Divide' },
      { label: '≠', insert: '≠', tip: 'Not equal' },
      { label: '≤', insert: '≤', tip: 'Less or equal' },
      { label: '≥', insert: '≥', tip: 'Greater or equal' },
      { label: '≈', insert: '≈', tip: 'Approx equal' },
      { label: '∞', insert: '∞', tip: 'Infinity' },
      { label: '|x|', insert: '|', tip: 'Absolute value' },
    ],
  },
  {
    group: 'Greek',
    symbols: [
      { label: 'π', insert: 'π', tip: 'Pi' },
      { label: 'θ', insert: 'θ', tip: 'Theta' },
      { label: 'α', insert: 'α', tip: 'Alpha' },
      { label: 'β', insert: 'β', tip: 'Beta' },
      { label: 'γ', insert: 'γ', tip: 'Gamma' },
      { label: 'δ', insert: 'δ', tip: 'Delta' },
      { label: 'λ', insert: 'λ', tip: 'Lambda' },
      { label: 'μ', insert: 'μ', tip: 'Mu' },
      { label: 'σ', insert: 'σ', tip: 'Sigma' },
      { label: 'φ', insert: 'φ', tip: 'Phi' },
      { label: 'Δ', insert: 'Δ', tip: 'Delta (cap)' },
      { label: 'Σ', insert: 'Σ', tip: 'Sigma (cap)' },
      { label: 'Π', insert: 'Π', tip: 'Pi (cap)' },
    ],
  },
  {
    group: 'Calculus',
    symbols: [
      { label: '∫', insert: '∫', tip: 'Integral' },
      { label: '∬', insert: '∬', tip: 'Double integral' },
      { label: 'd/dx', insert: 'd/dx', tip: 'Derivative' },
      { label: '∂', insert: '∂', tip: 'Partial derivative' },
      { label: 'lim', insert: 'lim(x→', tip: 'Limit' },
      { label: '→', insert: '→', tip: 'Approaches' },
      { label: '∑', insert: '∑', tip: 'Summation' },
      { label: '∏', insert: '∏', tip: 'Product' },
      { label: 'ln', insert: 'ln(', tip: 'Natural log' },
      { label: 'log', insert: 'log(', tip: 'Logarithm' },
      { label: 'sin', insert: 'sin(', tip: 'Sine' },
      { label: 'cos', insert: 'cos(', tip: 'Cosine' },
      { label: 'tan', insert: 'tan(', tip: 'Tangent' },
    ],
  },
  {
    group: 'Sets & Logic',
    symbols: [
      { label: '∈', insert: '∈', tip: 'Element of' },
      { label: '∉', insert: '∉', tip: 'Not element of' },
      { label: '⊂', insert: '⊂', tip: 'Subset' },
      { label: '∪', insert: '∪', tip: 'Union' },
      { label: '∩', insert: '∩', tip: 'Intersection' },
      { label: '∅', insert: '∅', tip: 'Empty set' },
      { label: '∀', insert: '∀', tip: 'For all' },
      { label: '∃', insert: '∃', tip: 'There exists' },
      { label: '⟹', insert: '⟹', tip: 'Implies' },
      { label: '⟺', insert: '⟺', tip: 'If and only if' },
      { label: '∧', insert: '∧', tip: 'And' },
      { label: '∨', insert: '∨', tip: 'Or' },
      { label: '¬', insert: '¬', tip: 'Not' },
    ],
  },
]

// ── KaTeX inline renderer (via CDN) ─────────────────────────────────────────
// ── KaTeX loader — shared across all RenderMath instances ────────────────────
let katexReady = false
const katexCallbacks: (() => void)[] = []

function ensureKaTeX(onReady: () => void) {
  const win = window as any
  if (win.katex) { katexReady = true; onReady(); return }
  katexCallbacks.push(onReady)
  if (document.getElementById('katex-js')) return  // already loading

  if (!document.getElementById('katex-css')) {
    const link = document.createElement('link')
    link.id   = 'katex-css'
    link.rel  = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
    document.head.appendChild(link)
  }
  const s = document.createElement('script')
  s.id  = 'katex-js'
  s.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'
  s.onload = () => {
    katexReady = true
    katexCallbacks.forEach(cb => cb())
    katexCallbacks.length = 0
  }
  document.head.appendChild(s)
}

function katexRender(text: string): string {
  const win = window as any
  if (!win.katex) return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g)
  return parts.map(part => {
    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
      try { return win.katex.renderToString(part.slice(2, -2).trim(), { displayMode: true, throwOnError: false }) }
      catch { return part }
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      try { return win.katex.renderToString(part.slice(1, -1).trim(), { displayMode: false, throwOnError: false }) }
      catch { return part }
    }
    return part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }).join('')
}

export function RenderMath({ text }: { text: string }) {
  const [rendered, setRendered] = useState(() => {
    // Render synchronously if KaTeX is already loaded
    if (katexReady) return katexRender(text)
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  })

  useEffect(() => {
    if (katexReady) {
      setRendered(katexRender(text))
      return
    }
    ensureKaTeX(() => setRendered(katexRender(text)))
  }, [text])

  return (
    <div
      style={{ lineHeight: 1.7, wordBreak: 'break-word' }}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  )
}

// ── Main shared input component ───────────────────────────────────────────────
export function KelviChatInput({
  onSend,
  onToggleDesmos,
  desmosOpen = false,
  disabled = false,
  placeholder = 'Share your thinking…',
  lastAssistantMessage = '',
  externalFile,
  externalText,
  colors,
}: {
  onSend: (payload: SendPayload) => void
  onToggleDesmos?: () => void
  desmosOpen?: boolean
  disabled?: boolean
  placeholder?: string
  lastAssistantMessage?: string
  externalFile?: File | null   // file dropped outside the input box
  externalText?: string        // text pushed from outside (e.g. suggestion chips)
  colors?: { forest?: string; coral?: string; muted?: string; rule?: string; surface?: string; ink?: string }
}) {
  const C = {
    forest:  colors?.forest  ?? '#2D4A3D',
    coral:   colors?.coral   ?? '#E26B4F',
    muted:   colors?.muted   ?? '#6B6B6B',
    rule:    colors?.rule    ?? '#E8E3DA',
    surface: colors?.surface ?? '#F5F3EE',
    ink:     colors?.ink     ?? '#1A1A1A',
  }

  const [text, setText]               = useState('')
  const [mathMode, setMathMode]       = useState(false)
  const [mathGroup, setMathGroup]     = useState(0)
  const [pendingImg, setPendingImg]   = useState<ImageAttachment | null>(null)
  const [dragOver, setDragOver]       = useState(false)
  const [recording, setRecording]     = useState(false)
  const [speaking, setSpeaking]       = useState(false)

  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // Process file dropped on a parent drop zone
  useEffect(() => {
    if (externalFile) processFile(externalFile)
  }, [externalFile])

  // Handle text pushed from outside (suggestion chips, prefill)
  useEffect(() => {
    if (externalText !== undefined && externalText !== '') {
      setText(externalText)
      setMathMode(false)
      setTimeout(() => textareaRef.current?.focus(), 0)
    }
  }, [externalText])

  // ── Send ──────────────────────────────────────────────────────────────────
  function handleSend() {
    if (disabled) return
    if (!text.trim() && !pendingImg) return

    onSend({
      text:  text.trim(),
      image: pendingImg ?? undefined,
    })

    setText('')
    setPendingImg(null)
    if (!mathMode && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // ── Image processing ──────────────────────────────────────────────────────
  function processFile(file: File) {
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      setPendingImg({ data: url.split(',')[1], media_type: file.type, preview: url })
    }
    reader.readAsDataURL(file)
  }

  // ── Mic ───────────────────────────────────────────────────────────────────
  function toggleMic() {
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return }
    const W = window as any
    const SR = W.webkitSpeechRecognition || W.SpeechRecognition
    if (!SR) { alert('Voice input requires Chrome.'); return }
    const r = new SR()
    r.continuous = false; r.interimResults = false
    r.onstart  = () => setRecording(true)
    r.onresult = (ev: any) => {
      const t = ev.results[0][0].transcript
      setText(prev => prev ? prev + ' ' + t : t)
      setRecording(false)
    }
    r.onerror = r.onend = () => setRecording(false)
    recognitionRef.current = r
    r.start()
  }

  // ── Speaker ───────────────────────────────────────────────────────────────
  function toggleSpeaker() {
    if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); return }
    if (!lastAssistantMessage || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(lastAssistantMessage)
    u.onstart = () => setSpeaking(true)
    u.onend = u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  const canSend = !disabled && (text.trim() || !!pendingImg)

  return (
    <div style={{ position: 'relative' }}>
      {/* Drag-over indicator */}
      {dragOver && (
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(45,74,61,0.1)', border: `2px dashed ${C.forest}`, borderRadius: 12, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
        >
          <span style={{ fontSize: 14, color: C.forest, fontWeight: 500 }}>Drop image here</span>
        </div>
      )}

      {/* Pending image */}
      {pendingImg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <img src={pendingImg.preview} alt="pending" style={{ height: 48, borderRadius: 6, border: `1px solid ${C.rule}` }} />
          <button onClick={() => setPendingImg(null)} style={{ fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>✕ Remove</button>
        </div>
      )}

      {/* Main input container */}
      <div
        style={{ border: `1px solid ${C.rule}`, borderRadius: 12, background: C.surface, overflow: 'hidden' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f) }}
      >
        {/* Symbol palette — shown above textarea when math mode is on */}
        {mathMode && (
          <div style={{ borderBottom: `1px solid ${C.rule}`, background: C.surface }}>
            {/* Group tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${C.rule}` }}>
              {MATH_SYMBOLS.map((g, i) => (
                <button key={g.group} onClick={() => setMathGroup(i)} style={{ padding: '6px 12px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', border: 'none', background: mathGroup === i ? '#fff' : 'transparent', borderBottom: mathGroup === i ? `2px solid ${C.forest}` : '2px solid transparent', color: mathGroup === i ? C.forest : C.muted, cursor: 'pointer', fontWeight: mathGroup === i ? 600 : 400 }}>
                  {g.group}
                </button>
              ))}
            </div>
            {/* Symbol buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px' }}>
              {MATH_SYMBOLS[mathGroup].symbols.map(s => (
                <button
                  key={s.insert}
                  title={s.tip}
                  onClick={() => {
                    const ta = textareaRef.current
                    if (!ta) { setText(prev => prev + s.insert); return }
                    const start = ta.selectionStart ?? text.length
                    const end   = ta.selectionEnd   ?? text.length
                    const next  = text.slice(0, start) + s.insert + text.slice(end)
                    setText(next)
                    setTimeout(() => {
                      ta.focus()
                      ta.setSelectionRange(start + s.insert.length, start + s.insert.length)
                    }, 0)
                  }}
                  style={{ padding: '5px 10px', fontFamily: mathGroup === 2 ? "'IBM Plex Mono', monospace" : 'inherit', fontSize: 15, border: `1px solid ${C.rule}`, borderRadius: 6, background: '#fff', cursor: 'pointer', color: C.ink, minWidth: 36, transition: 'all 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.forest; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = C.forest }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = C.ink; e.currentTarget.style.borderColor = C.rule }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Textarea — always visible, symbols insert here */}
        <div style={{ padding: '8px 12px 4px', minHeight: 44, display: 'flex', alignItems: 'center' }}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={e => {
              setText(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            onPaste={e => {
              const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
              if (item) { e.preventDefault(); const f = item.getAsFile(); if (f) processFile(f) }
            }}
            placeholder={mathMode ? 'Click symbols above or type math here…' : placeholder}
            disabled={disabled}
            style={{ flex: 1, width: '100%', padding: 0, border: 'none', outline: 'none', fontSize: 15, resize: 'none', fontFamily: "'IBM Plex Sans', sans-serif", background: 'transparent', maxHeight: 160, overflowY: 'auto', color: C.ink, lineHeight: 1.5, display: 'block' }}
          />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px 8px', gap: 2 }}>

          {/* Math mode toggle */}
          <IconBtn
            onClick={() => setMathMode(v => !v)}
            active={mathMode} activeColor={C.coral}
            title={mathMode ? 'Close math palette' : 'Open math symbol palette'}
            C={C}
          >
            <MathIcon />
          </IconBtn>

          {/* Camera */}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }} style={{ display: 'none' }} />
          <IconBtn onClick={() => fileInputRef.current?.click()} active={!!pendingImg} activeColor={C.coral} title="Photo or image upload" C={C}>
            <CameraIcon />
          </IconBtn>

          {/* Mic */}
          <IconBtn onClick={toggleMic} active={recording} activeColor={C.coral} title={recording ? 'Stop recording' : 'Voice input'} C={C} pulse={recording}>
            <MicIcon active={recording} />
          </IconBtn>

          {/* Speaker */}
          <IconBtn onClick={toggleSpeaker} active={speaking} activeColor={C.forest} title={speaking ? 'Stop' : 'Read last response aloud'} C={C}>
            <SpeakerIcon active={speaking} />
          </IconBtn>

          {/* Desmos toggle (optional) */}
          {onToggleDesmos && (
            <IconBtn onClick={onToggleDesmos} active={desmosOpen} activeColor="#B594DC" title={desmosOpen ? 'Hide Desmos' : 'Open Desmos calculator'} C={C}>
              <DesmosIcon />
            </IconBtn>
          )}

          <div style={{ flex: 1 }} />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            title="Send (Enter)"
            style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 8, background: canSend ? C.forest : C.rule, color: '#fff', cursor: canSend ? 'pointer' : 'not-allowed', transition: 'background 0.15s', flexShrink: 0 }}
          >
            <SendIcon />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 4, textAlign: 'center', fontSize: 11, color: '#9A9488', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.04em' }}>
        {mathMode ? 'Click a symbol to insert it · symbols appear in your message' : 'Enter to send · Shift+Enter for new line · drag & drop images'}
      </div>
    </div>
  )
}

// ── Small helper: icon button ────────────────────────────────────────────────
function IconBtn({ children, onClick, active, activeColor, title, C, pulse }: {
  children: React.ReactNode; onClick: () => void; active: boolean; activeColor: string
  title: string; C: any; pulse?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 34, height: 34,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${active ? activeColor : C.rule}`,
        borderRadius: '50%',
        background: active ? activeColor : 'none',
        color: active ? '#fff' : C.muted,
        cursor: 'pointer',
        transition: 'all 0.15s',
        flexShrink: 0,
        animation: pulse ? 'pulse 1.2s ease-in-out infinite' : 'none',
      }}
    >
      {children}
    </button>
  )
}
