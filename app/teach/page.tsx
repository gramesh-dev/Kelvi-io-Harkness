'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function TeachDashboard() {
  const [classes, setClasses] = useState<any[]>([])
  const [showNewClass, setShowNewClass] = useState(false)
  const [className, setClassName] = useState('')
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')

  useEffect(() => {
    // Load from localStorage (temporary bypass)
    const saved = localStorage.getItem('kelvi_temp_classes')
    if (saved) {
      setClasses(JSON.parse(saved))
    }
  }, [])

  function createClass() {
    if (!className.trim()) return

    const newClass = {
      id: Date.now().toString(),
      name: className,
      grade: grade || null,
      subject: subject || null,
      color: '#3A6B5C',
      created_at: new Date().toISOString()
    }

    const updated = [newClass, ...classes]
    setClasses(updated)
    localStorage.setItem('kelvi_temp_classes', JSON.stringify(updated))

    setClassName('')
    setGrade('')
    setSubject('')
    setShowNewClass(false)
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet" />
      
      <style jsx global>{`
        body { font-family: 'IBM Plex Sans', system-ui, sans-serif; background: #FAF8F3; margin: 0; }
      `}</style>

      <div style={{minHeight: '100vh', background: '#FAF8F3', padding: '40px 20px'}}>
        <div style={{maxWidth: '1120px', margin: '0 auto'}}>
          
          {/* Demo Banner */}
          <div style={{background: '#FEF3C6', border: '1px solid #FED236', borderRadius: '4px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#7B3306'}}>
            <strong>Demo mode:</strong> Auth bypassed. Data saved to localStorage only.
          </div>

          {/* Header */}
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px'}}>
            <div>
              <Link href="/" style={{display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#1A1A1A', marginBottom: '16px'}}>
                <svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 50 6 C 65 4, 80 14, 78 32 C 76 48, 60 52, 44 50 C 28 48, 24 32, 28 18 C 32 8, 40 6, 50 6 Z" fill="#E26B4F"/>
                  <path d="M 22 56 C 36 54, 44 64, 42 80 C 40 92, 28 96, 16 92 C 6 88, 4 76, 8 66 C 12 58, 16 56, 22 56 Z" fill="#2D4A3D"/>
                  <path d="M 70 56 C 84 56, 94 64, 92 78 C 90 92, 78 96, 66 92 C 54 88, 52 76, 56 66 C 60 58, 64 56, 70 56 Z" fill="#B594DC"/>
                </svg>
                <span style={{fontFamily: "'Instrument Serif', serif", fontSize: '24px'}}>kelvi</span>
              </Link>
              <h1 style={{fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, margin: 0, color: '#1A1A1A'}}>
                My Classes
              </h1>
            </div>
            <button
              onClick={() => setShowNewClass(true)}
              style={{
                background: '#2D4A3D',
                color: '#FAF8F3',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '2px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif"
              }}
            >
              + New class
            </button>
          </div>

          {/* Classes Grid */}
          {classes.length === 0 ? (
            <div style={{textAlign: 'center', padding: '80px 20px', background: '#fff', border: '1px solid #E8E3DA', borderRadius: '4px'}}>
              <h2 style={{fontFamily: "'Instrument Serif', serif", fontSize: '1.75rem', fontWeight: 400, marginBottom: '12px', color: '#1A1A1A'}}>
                No classes yet
              </h2>
              <p style={{fontSize: '15px', color: '#6B6B6B', marginBottom: '32px', lineHeight: 1.6}}>
                Create your first class to start building problem sets.
              </p>
              <button
                onClick={() => setShowNewClass(true)}
                style={{
                  background: '#2D4A3D',
                  color: '#FAF8F3',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '2px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif"
                }}
              >
                Create your first class
              </button>
            </div>
          ) : (
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
              {classes.map(cls => (
                <Link
                  key={cls.id}
                  href={`/teach/class/${cls.id}`}
                  style={{
                    background: '#fff',
                    border: '1px solid #E8E3DA',
                    borderRadius: '4px',
                    padding: '24px',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                    display: 'block'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3A6B5C'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E8E3DA'}
                >
                  <div style={{width: '32px', height: '3px', background: cls.color || '#3A6B5C', borderRadius: '2px', marginBottom: '16px'}} />
                  <h3 style={{fontFamily: "'Instrument Serif', serif", fontSize: '1.5rem', fontWeight: 400, margin: '0 0 8px 0', color: '#1A1A1A'}}>
                    {cls.name}
                  </h3>
                  <div style={{fontSize: '13px', color: '#6F6A61', fontFamily: "'IBM Plex Mono', monospace"}}>
                    {[cls.grade, cls.subject].filter(Boolean).join(' · ') || 'No details'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Class Modal */}
      {showNewClass && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(47, 43, 37, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowNewClass(false)}
        >
          <div
            style={{
              background: '#FAF8F3',
              borderRadius: '4px',
              padding: '32px',
              maxWidth: '480px',
              width: '100%',
              margin: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{fontFamily: "'Instrument Serif', serif", fontSize: '1.75rem', fontWeight: 400, marginBottom: '8px', color: '#1A1A1A'}}>
              Create a class
            </h2>
            <p style={{fontSize: '13px', color: '#6F6A61', marginBottom: '24px', lineHeight: 1.6}}>
              Start building problem sets and tracking student thinking.
            </p>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6F6A61', marginBottom: '6px', fontFamily: "'IBM Plex Mono', monospace"}}>
                Class name *
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Algebra I Period 3"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #E8E3DA',
                  borderRadius: '2px',
                  fontSize: '14px',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  outline: 'none'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6F6A61', marginBottom: '6px', fontFamily: "'IBM Plex Mono', monospace"}}>
                Grade
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. 9th grade"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #E8E3DA',
                  borderRadius: '2px',
                  fontSize: '14px',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  outline: 'none'
                }}
              />
            </div>

            <div style={{marginBottom: '24px'}}>
              <label style={{display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6F6A61', marginBottom: '6px', fontFamily: "'IBM Plex Mono', monospace"}}>
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Algebra"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #E8E3DA',
                  borderRadius: '2px',
                  fontSize: '14px',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  outline: 'none'
                }}
              />
            </div>

            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={() => setShowNewClass(false)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  background: 'none',
                  border: '1px solid #E8E3DA',
                  borderRadius: '2px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  color: '#6F6A61'
                }}
              >
                Cancel
              </button>
              <button
                onClick={createClass}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  background: '#2D4A3D',
                  color: '#FAF8F3',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif"
                }}
              >
                Create class
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}