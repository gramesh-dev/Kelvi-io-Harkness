'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LearnerPage() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet" />
      
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'IBM Plex Sans', system-ui, sans-serif; background: #FAF8F3; color: #1A1A1A; line-height: 1.6; }
        
        nav { padding: 18px 40px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E8E3DA; background: #FAF8F3; }
        .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #1A1A1A; white-space: nowrap; }
        .logo-word { font-family: 'Instrument Serif', serif; font-size: 26px; line-height: 1; }
        .nav-back { font-size: 13px; color: #6B6B6B; text-decoration: none; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.06em; white-space: nowrap; }
        .nav-back:hover { color: #1A1A1A; }
        
        .hero { padding: 72px 40px 64px; max-width: 860px; margin: 0 auto; text-align: center; border-bottom: 1px solid #E8E3DA; }
        .kicker { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9A9488; margin-bottom: 20px; }
        h1 { font-family: 'Instrument Serif', serif; font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 400; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 20px; }
        h1 em { font-style: italic; color: #E26B4F; }
        .hero-sub { font-size: 17px; color: #6B6B6B; line-height: 1.7; max-width: 480px; margin: 0 auto; }
        
        .age-select { padding: 64px 40px; max-width: 860px; margin: 0 auto; border-bottom: 1px solid #E8E3DA; }
        .age-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9A9488; text-align: center; margin-bottom: 28px; }
        .age-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .age-card { border-radius: 4px; padding: 36px; border: 1px solid #E8E3DA; background: #fff; }
        .age-card-kicker { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 16px; }
        .age-card-title { font-family: 'Instrument Serif', serif; font-size: 26px; font-weight: 400; line-height: 1.15; margin-bottom: 12px; }
        .age-card-title em { font-style: italic; }
        .age-card-sub { font-size: 14px; color: #6B6B6B; line-height: 1.65; margin-bottom: 28px; }
        .age-card-actions { display: flex; flex-direction: column; gap: 10px; }
        
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 22px; border-radius: 2px; font-size: 13px; font-weight: 500; text-decoration: none; transition: all .15s; border: 1px solid transparent; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; }
        .btn-coral { background: #E26B4F; color: #fff; border-color: #E26B4F; }
        .btn-coral:hover { background: #C4543A; border-color: #C4543A; }
        .btn-lavender { background: #B594DC; color: #FFFFFF; border-color: #B594DC; }
        .btn-lavender:hover { background: #8E68BE; border-color: #8E68BE; }
        
        .preview { padding: 64px 40px; max-width: 860px; margin: 0 auto; border-bottom: 1px solid #E8E3DA; }
        .section-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9A9488; margin-bottom: 28px; }
        .section-label span { color: #E26B4F; }
        h2 { font-family: 'Instrument Serif', serif; font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 400; line-height: 1.15; margin-bottom: 12px; }
        h2 em { font-style: italic; color: #E26B4F; }
        .section-sub { font-size: 15px; color: #6B6B6B; line-height: 1.7; margin-bottom: 36px; max-width: 520px; }
        
        .galaxy-preview { background: #13142A; border-radius: 6px; padding: 40px; display: flex; align-items: center; justify-content: center; min-height: 280px; }
        .planets-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%; max-width: 580px; }
        .planet-item { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: transform .15s; }
        .planet-item:hover { transform: translateY(-3px); }
        .planet-circle { border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .planet-name { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(250, 248, 243, 0.65); text-align: center; }
        
        .convo { padding: 64px 40px; max-width: 860px; margin: 0 auto; border-bottom: 1px solid #E8E3DA; }
        .convo-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9A9488; margin-bottom: 28px; }
        .convo-label span { color: #8E68BE; }
        .chat-mockup { background: #fff; border: 1px solid #E8E3DA; border-radius: 4px; overflow: hidden; }
        .chat-header { padding: 14px 20px; border-bottom: 1px solid #E8E3DA; display: flex; align-items: center; gap: 10px; }
        .chat-header-title { font-size: 14px; font-weight: 500; color: #1A1A1A; }
        .chat-header-sub { font-size: 12px; color: #9A9488; font-family: 'IBM Plex Mono', monospace; }
        .chat-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .chat-msg { display: flex; flex-direction: column; gap: 4px; max-width: 80%; }
        .chat-msg.kelvi { align-self: flex-start; }
        .chat-msg.student { align-self: flex-end; }
        .chat-who { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #9A9488; }
        .chat-who.k { color: #8E68BE; }
        .chat-bubble { padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.6; }
        .chat-bubble.kelvi { background: #F5F0FB; color: #1A1A1A; border-bottom-left-radius: 3px; font-style: italic; }
        .chat-bubble.student { background: #FAF8F3; border: 1px solid #E8E3DA; color: #1A1A1A; border-bottom-right-radius: 3px; }
        .chat-input-bar { padding: 14px 20px; border-top: 1px solid #E8E3DA; display: flex; gap: 8px; align-items: center; }
        .chat-input-mock { flex: 1; background: #FAF8F3; border: 1px solid #E8E3DA; border-radius: 20px; padding: 10px 16px; font-size: 13px; color: #9A9488; font-family: 'IBM Plex Sans', sans-serif; }
        .chat-send-mock { width: 36px; height: 36px; border-radius: 50%; background: #8E68BE; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; }
        
        .cta-section { padding: 64px 40px; max-width: 860px; margin: 0 auto; text-align: center; }
        .cta-section h2 { font-family: 'Instrument Serif', serif; font-size: 2rem; font-weight: 400; margin-bottom: 12px; }
        .cta-section p { font-size: 15px; color: #6B6B6B; margin-bottom: 32px; max-width: 400px; margin-left: auto; margin-right: auto; }
        
        footer { padding: 20px 40px; border-top: 1px solid #E8E3DA; display: flex; justify-content: space-between; align-items: center; }
        .footer-copy { font-size: 12px; color: #9A9488; font-family: 'IBM Plex Mono', monospace; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 12px; color: #9A9488; text-decoration: none; font-family: 'IBM Plex Mono', monospace; }
        .footer-links a:hover { color: #1A1A1A; }
        
        @media(max-width: 680px) {
          nav, .hero, .age-select, .preview, .convo, .cta-section, footer { padding-left: 20px; padding-right: 20px; }
          .age-grid { grid-template-columns: 1fr; }
          .planets-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
        }
      `}</style>

      <nav>
        <Link href="/" className="logo">
          <svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M 50 6 C 65 4, 80 14, 78 32 C 76 48, 60 52, 44 50 C 28 48, 24 32, 28 18 C 32 8, 40 6, 50 6 Z" fill="#E26B4F"/>
            <path d="M 22 56 C 36 54, 44 64, 42 80 C 40 92, 28 96, 16 92 C 6 88, 4 76, 8 66 C 12 58, 16 56, 22 56 Z" fill="#2D4A3D"/>
            <path d="M 70 56 C 84 56, 94 64, 92 78 C 90 92, 78 96, 66 92 C 54 88, 52 76, 56 66 C 60 58, 64 56, 70 56 Z" fill="#B594DC"/>
          </svg>
          <span className="logo-word">kelvi</span>
        </Link>
        <Link href="/" className="nav-back">← Back</Link>
      </nav>

      <div className="hero">
        <div className="kicker">For learners</div>
        <h1>Math is something<br />you <em>discover.</em></h1>
        <p className="hero-sub">No badges. No leaderboards. No shame in being wrong — mathematicians are wrong all the time. Just curiosity, questions, and the slow satisfaction of figuring something out.</p>
      </div>

      <div className="age-select">
        <div className="age-label">How old are you?</div>
        <div className="age-grid">
          
          <div className="age-card">
            <div className="age-card-kicker" style={{color: '#E26B4F'}}>Ages 5 – 13</div>
            <div className="age-card-title">Explore the <em>Math Galaxy</em></div>
            <p className="age-card-sub">Nine planets. Fractions, Geometry, Algebra, and more. Click a planet, get a question you can't stop thinking about, and go from there. No timer. No score.</p>
            <div className="age-card-actions">
              <button onClick={handleGoogleLogin} className="btn btn-coral">
                Get started — ask a parent first →
              </button>
            </div>
          </div>

          <div className="age-card">
            <div className="age-card-kicker" style={{color: '#8E68BE'}}>Ages 13 and up</div>
            <div className="age-card-title">Explore or get <em>homework help</em></div>
            <p className="age-card-sub">Wander the Math Galaxy on your own, or bring a problem you're stuck on. Take a photo of your homework or just type it in. Kelvi thinks through it with you — it never just gives you the answer.</p>
            <div className="age-card-actions">
              <button onClick={handleGoogleLogin} className="btn btn-coral">
                Open the Math Galaxy →
              </button>
              <Link href="/solo" className="btn btn-lavender">
                Get homework help →
              </Link>
            </div>
          </div>

        </div>
      </div>

      <div className="preview">
        <div className="section-label">01 · <span>The Math Galaxy</span></div>
        <h2>Nine planets. <em>Infinite questions.</em></h2>
        <p className="section-sub">Each planet is a different world of mathematics. Click one and Kelvi asks you a question. There's no wrong way to explore.</p>

        <div className="galaxy-preview">
          <div className="planets-grid">
            {/* Fractions */}
            <div className="planet-item">
              <div className="planet-circle" style={{width: '56px', height: '56px', background: '#F0386B'}}>
                <svg viewBox="-50 -50 100 100" width="34" height="34">
                  <circle cx="0" cy="0" r="42" fill="#F0386B"/>
                  <line x1="-28" y1="2" x2="28" y2="2" stroke="white" strokeWidth="3.5"/>
                  <text x="0" y="-14" textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia,serif" fontSize="24" fontWeight="700" fill="white">1</text>
                  <text x="0" y="20" textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia,serif" fontSize="24" fontWeight="700" fill="white">2</text>
                </svg>
              </div>
              <div className="planet-name">Fractions</div>
            </div>
            
            {/* Algebra */}
            <div className="planet-item">
              <div className="planet-circle" style={{width: '56px', height: '56px', background: '#2979FF'}}>
                <svg viewBox="-50 -50 100 100" width="34" height="34">
                  <circle cx="0" cy="0" r="42" fill="#2979FF"/>
                  <text x="0" y="-4" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontSize="48" fontStyle="italic" fontWeight="700" fill="white">x</text>
                </svg>
              </div>
              <div className="planet-name">Algebra</div>
            </div>

            {/* Geometry */}
            <div className="planet-item">
              <div className="planet-circle" style={{width: '56px', height: '56px', background: '#00C896'}}>
                <svg viewBox="-50 -50 100 100" width="34" height="34">
                  <circle cx="0" cy="0" r="42" fill="#00C896"/>
                  <polygon points="0,-26 22.5,13 -22.5,13" fill="none" stroke="white" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
                  <circle cx="0" cy="-26" r="5" fill="white"/>
                  <circle cx="22.5" cy="13" r="5" fill="white"/>
                  <circle cx="-22.5" cy="13" r="5" fill="white"/>
                </svg>
              </div>
              <div className="planet-name">Geometry</div>
            </div>

            {/* Data */}
            <div className="planet-item">
              <div className="planet-circle" style={{width: '56px', height: '56px', background: '#6C63FF'}}>
                <svg viewBox="-50 -50 100 100" width="34" height="34">
                  <circle cx="0" cy="0" r="42" fill="#6C63FF"/>
                  <line x1="-28" y1="26" x2="28" y2="26" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <rect x="-24" y="8" width="12" height="18" rx="2" fill="white"/>
                  <rect x="-6" y="-8" width="12" height="34" rx="2" fill="white"/>
                  <rect x="12" y="-18" width="12" height="44" rx="2" fill="white"/>
                </svg>
              </div>
              <div className="planet-name">Data</div>
            </div>

            {/* Number */}
            <div className="planet-item">
              <div className="planet-circle" style={{width: '56px', height: '56px', background: '#7CB800'}}>
                <svg viewBox="-50 -50 100 100" width="34" height="34">
                  <circle cx="0" cy="0" r="42" fill="#7CB800"/>
                  <path d="M -22 0 C -22 -16 -8 -16 0 0 C 8 16 22 16 22 0 C 22 -16 8 -16 0 0 C -8 16 -22 16 -22 0 Z" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="planet-name">Number</div>
            </div>

            {/* Operations */}
            <div className="planet-item">
              <div className="planet-circle" style={{width: '56px', height: '56px', background: '#FF9500'}}>
                <svg viewBox="-50 -50 100 100" width="34" height="34">
                  <circle cx="0" cy="0" r="42" fill="#FF9500"/>
                  <text x="-18" y="-13" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontSize="28" fontWeight="700" fill="white">+</text>
                  <text x="18" y="-13" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontSize="28" fontWeight="700" fill="white">−</text>
                  <text x="-18" y="15" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontSize="26" fontWeight="700" fill="white">×</text>
                  <text x="18" y="15" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontSize="26" fontWeight="700" fill="white">÷</text>
                </svg>
              </div>
              <div className="planet-name">Operations</div>
            </div>

            {/* Measurement */}
            <div className="planet-item">
              <div className="planet-circle" style={{width: '56px', height: '56px', background: '#FF5722'}}>
                <svg viewBox="-50 -50 100 100" width="34" height="34">
                  <circle cx="0" cy="0" r="42" fill="#FF5722"/>
                  <rect x="-26" y="-8" width="52" height="16" rx="3" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="2"/>
                  <line x1="-26" y1="-8" x2="-26" y2="8" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="26" y1="-8" x2="26" y2="8" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="planet-name">Measurement</div>
            </div>

            {/* Puzzle */}
            <div className="planet-item">
              <div className="planet-circle" style={{width: '56px', height: '56px', background: '#F59E0B'}}>
                <svg viewBox="-50 -50 100 100" width="34" height="34">
                  <circle cx="0" cy="0" r="42" fill="#F59E0B"/>
                  <text x="0" y="10" textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia,serif" fontSize="58" fontWeight="700" fill="white">?</text>
                </svg>
              </div>
              <div className="planet-name">Puzzle</div>
            </div>

         {/* Observatory */}
<div className="planet-item">
  <div className="planet-circle" style={{width: '56px', height: '56px', background: '#8B5CF6'}}>
    <svg viewBox="-50 -50 100 100" width="34" height="34">
      <circle cx="0" cy="0" r="42" fill="#8B5CF6"/>
      <line x1="-36" y1="26" x2="36" y2="26" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <rect x="-18" y="8" width="36" height="18" rx="2" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.5"/>
      <rect x="-7" y="15" width="14" height="11" rx="1" fill="rgba(255,255,255,0.5)"/>
      <path d="M -32 8 A 32 32 0 0 1 32 8 Z" fill="rgba(255,255,255,0.18)" stroke="white" strokeWidth="2.5"/>
      <line x1="-2" y1="2" x2="-16" y2="-20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="-17" cy="-22" r="4" fill="white"/>
    </svg>
  </div>
  <div className="planet-name">Observatory</div>
            </div>
          </div>
        </div>
      </div>

      <div className="convo">
  <div className="convo-label">02 · <span>A conversation, not a quiz</span></div>
  <h2>Kelvi asks questions <em>back.</em></h2>
  <p className="section-sub">You're never alone with a blank page. Kelvi doesn't grade you — it thinks with you.</p>

  <div className="chat-mockup">
    <div className="chat-header">
      <div className="chat-header-title">Homework Help · SSS Criteria</div>
      <div className="chat-header-sub">Geometry</div>
    </div>
      <div className="chat-body">
      <div className="chat-msg student">
        <div className="chat-who">You</div>
        <div className="chat-bubble student">Help me understand the SSS Criteria</div>
      </div>
      <div className="chat-msg kelvi">
        <div className="chat-who k">Kelvi</div>
        <div className="chat-bubble kelvi">Before I explain it — what do you think SSS stands for? Just guess.</div>
      </div>
      <div className="chat-msg student">
        <div className="chat-who">You</div>
        <div className="chat-bubble student">Side side side?</div>
      </div>
      <div className="chat-msg kelvi">
        <div className="chat-who k">Kelvi</div>
        <div className="chat-bubble kelvi">Exactly. Now draw two triangles with the exact same three side lengths. What do you notice?</div>
      </div>
    </div>
    <div className="chat-input-bar">
      <div className="chat-input-mock">Type your answer...</div>
      <div className="chat-send-mock">→</div>
    </div>
  </div>
</div>

      <div className="cta-section">
        <h2>Ready to explore?</h2>
        <p>Start your mathematical journey. No login required to browse — just curiosity.</p>
        <button onClick={handleGoogleLogin} className="btn btn-coral">
          Sign in with Google to get started →
        </button>
      </div>

      <footer>
        <span className="footer-copy">© 2026 Kelvi</span>
        <div className="footer-links">
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </footer>
    </>
  )
}