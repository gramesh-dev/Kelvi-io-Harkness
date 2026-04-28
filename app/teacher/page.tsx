'use client'

import Link from 'next/link'

export default function TeacherPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet" />
      
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'IBM Plex Sans', system-ui, sans-serif; background: #FAF8F3; color: #1A1A1A; line-height: 1.6; }
        
        nav { padding: 18px 40px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E8E3DA; background: #FAF8F3; }
        .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #1A1A1A; }
        .logo-word { font-family: 'Instrument Serif', serif; font-size: 26px; line-height: 1; }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-back { font-size: 13px; color: #6B6B6B; text-decoration: none; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.06em; }
        .nav-back:hover { color: #1A1A1A; }
        .nav-signin { font-size: 13px; color: #2D4A3D; text-decoration: none; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.06em; border: 1px solid #2D4A3D; padding: 7px 16px; border-radius: 2px; transition: all .15s; }
        .nav-signin:hover { background: #2D4A3D; color: #FAF8F3; }
        
        .hero { padding: 72px 40px 64px; max-width: 900px; margin: 0 auto; border-bottom: 1px solid #E8E3DA; }
        .kicker { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9A9488; margin-bottom: 20px; }
        .kicker span { color: #2D4A3D; }
        h1 { font-family: 'Instrument Serif', serif; font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 400; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 20px; }
        h1 em { font-style: italic; color: #2D4A3D; }
        .hero-sub { font-size: 17px; color: #6B6B6B; line-height: 1.7; max-width: 560px; margin-bottom: 36px; }
        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .btn-primary { background: #2D4A3D; color: #FAF8F3; padding: 13px 28px; border-radius: 2px; text-decoration: none; font-size: 14px; font-weight: 500; transition: background .15s; display: inline-block; }
        .btn-primary:hover { background: #1F3429; }
        .btn-secondary { background: transparent; color: #1A1A1A; border: 1px solid #D9D4C4; padding: 13px 24px; border-radius: 2px; text-decoration: none; font-size: 14px; transition: all .15s; display: inline-block; }
        .btn-secondary:hover { border-color: #1A1A1A; }
        
        section { padding: 64px 40px; max-width: 900px; margin: 0 auto; border-bottom: 1px solid #E8E3DA; }
        .section-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9A9488; margin-bottom: 28px; }
        .section-label span { color: #2D4A3D; }
        h2 { font-family: 'Instrument Serif', serif; font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 400; line-height: 1.15; margin-bottom: 14px; }
        h2 em { font-style: italic; color: #2D4A3D; }
        .section-sub { font-size: 15px; color: #6B6B6B; line-height: 1.7; max-width: 560px; margin-bottom: 36px; }
        
        .dashboard { background: #fff; border: 1px solid #E8E3DA; border-radius: 4px; overflow: hidden; }
        .dash-topbar { background: #2D4A3D; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; }
        .dash-topbar-title { font-family: 'Instrument Serif', serif; font-size: 18px; color: #FAF8F3; }
        .dash-topbar-meta { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: rgba(250, 248, 243, 0.55); letter-spacing: 0.1em; }
        .dash-body { padding: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 0; }
        .dash-metric { background: #FAF8F3; border: 1px solid #E8E3DA; border-radius: 3px; padding: 16px; text-align: center; }
        .dash-metric-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #9A9488; margin-bottom: 8px; }
        .dash-metric-val { font-family: 'Instrument Serif', serif; font-size: 36px; font-weight: 400; line-height: 1; }
        .dash-metric-val.p { color: #2D4A3D; }
        .dash-metric-val.c { color: #E26B4F; }
        .dash-metric-val.g { color: #B594DC; }
        .dash-thinking { padding: 0 24px 24px; }
        .dash-thinking-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #9A9488; margin-bottom: 12px; }
        .thinking-card { background: #FAF8F3; border: 1px solid #E8E3DA; border-radius: 3px; padding: 12px 16px; margin-bottom: 8px; display: flex; gap: 12px; align-items: flex-start; }
        .thinking-card:last-child { margin-bottom: 0; }
        .thinking-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
        .thinking-student { font-size: 11px; font-weight: 500; color: #1A1A1A; margin-bottom: 3px; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.04em; }
        .thinking-quote { font-size: 13px; color: #6B6B6B; font-style: italic; line-height: 1.5; }
        .dash-bar { padding: 16px 24px; border-top: 1px solid #E8E3DA; display: flex; align-items: center; gap: 8px; }
        .bar-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.1em; color: #9A9488; white-space: nowrap; }
        .bar-track { flex: 1; height: 6px; background: #E8E3DA; border-radius: 3px; overflow: hidden; display: flex; }
        .bar-p { background: #2D4A3D; height: 100%; }
        .bar-c { background: #E26B4F; height: 100%; }
        .bar-g { background: #B594DC; height: 100%; }
        
        .worksheet { background: #fff; border: 1px solid #E8E3DA; border-radius: 4px; overflow: hidden; }
        .ws-head { padding: 20px 28px; border-bottom: 1px solid #E8E3DA; display: flex; justify-content: space-between; align-items: center; }
        .ws-head-title { font-family: 'Instrument Serif', serif; font-size: 18px; }
        .ws-head-meta { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #9A9488; letter-spacing: 0.12em; text-transform: uppercase; }
        .ws-body { padding: 28px; display: grid; grid-template-columns: 3fr 2fr; gap: 32px; }
        .ws-problem { border-right: 1px solid #E8E3DA; padding-right: 32px; }
        .ws-problem-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #9A9488; margin-bottom: 14px; }
        .ws-problem-text { font-size: 15px; color: #1A1A1A; line-height: 1.75; margin-bottom: 20px; }
        .ws-problem-text strong { font-weight: 500; }
        .ws-tags { display: flex; gap: 6px; flex-wrap: wrap; }
        .ws-tag { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 2px; border: 1px solid; }
        .ws-tag-c { color: #2D4A3D; border-color: #2D4A3D; background: rgba(45, 74, 61, 0.06); }
        .ws-tag-p { color: #E26B4F; border-color: #E26B4F; background: rgba(226, 107, 79, 0.06); }
        .ws-tag-g { color: #B594DC; border-color: #B594DC; background: rgba(181, 148, 220, 0.06); }
        .brief-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #9A9488; margin-bottom: 14px; }
        .brief-item { margin-bottom: 14px; }
        .brief-item-title { font-size: 11px; font-weight: 500; color: #1A1A1A; margin-bottom: 4px; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.06em; text-transform: uppercase; }
        .brief-item-text { font-size: 13px; color: #6B6B6B; line-height: 1.6; }
        
        .not-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .not-col { padding: 0 32px; }
        .not-col:first-child { border-right: 1px solid #E8E3DA; padding-left: 0; }
        .not-col:last-child { padding-right: 0; }
        .not-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 16px; }
        .not-label.old { color: #9A9488; }
        .not-label.new { color: #2D4A3D; }
        .not-item { font-size: 14px; line-height: 2.2; color: #C0B8AA; text-decoration: line-through; }
        .new-item { font-size: 15px; line-height: 2; color: #1A1A1A; font-style: italic; font-family: 'Instrument Serif', serif; }
        
        .cta-section { padding: 64px 40px; max-width: 900px; margin: 0 auto; text-align: center; }
        .cta-section h2 { font-family: 'Instrument Serif', serif; font-size: 2rem; font-weight: 400; margin-bottom: 12px; }
        .cta-section p { font-size: 15px; color: #6B6B6B; margin-bottom: 32px; }
        .cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        
        footer { padding: 20px 40px; border-top: 1px solid #E8E3DA; display: flex; justify-content: space-between; align-items: center; }
        .footer-copy { font-size: 12px; color: #9A9488; font-family: 'IBM Plex Mono', monospace; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 12px; color: #9A9488; text-decoration: none; font-family: 'IBM Plex Mono', monospace; }
        .footer-links a:hover { color: #1A1A1A; }
        
        @media(max-width: 700px) {
          nav, section, .hero, footer, .cta-section { padding-left: 20px; padding-right: 20px; }
          .dash-body { grid-template-columns: 1fr 1fr; }
          .ws-body { grid-template-columns: 1fr; }
          .ws-problem { border-right: none; padding-right: 0; border-bottom: 1px solid #E8E3DA; padding-bottom: 24px; margin-bottom: 4px; }
          .not-grid { grid-template-columns: 1fr; gap: 24px; }
          .not-col:first-child { border-right: none; border-bottom: 1px solid #E8E3DA; padding-bottom: 24px; }
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
        <div className="nav-right">
          <Link href="/" className="nav-back">← Back</Link>
          <Link href="/login?intent=school" className="nav-signin">Log in to create your own</Link>
        </div>
      </nav>

      <div className="hero">
        <div className="kicker">For educators &nbsp;·&nbsp; <span>Kelvi School</span></div>
        <h1>Your student is more<br />than a <em>number.</em></h1>
        <p className="hero-sub">Build discovery-based mathematics problem sets for your students — wherever you teach. See how each student thinks — their aha moments, the questions they ask, the ideas they're building — not just whether they got the answer right.</p>
        <div className="hero-actions">
          <a href="#dashboard" className="btn-primary">See the dashboard →</a>
          <a href="#worksheet" className="btn-secondary">See a sample problem</a>
        </div>
      </div>

      <section id="dashboard">
        <div className="section-label">01 · <span>What you see</span></div>
        <h2>Student thinking, <em>made visible.</em></h2>
        <p className="section-sub">Kelvi tracks how each student engages with mathematics — not just correct answers, but the depth and quality of their thinking. No grades. Just insight.</p>

        <div className="dashboard">
          <div className="dash-topbar">
            <div className="dash-topbar-title">Period 3 — Algebra</div>
            <div className="dash-topbar-meta">24 students &nbsp;·&nbsp; Week of Apr 26</div>
          </div>
          <div className="dash-body">
            <div className="dash-metric">
              <div className="dash-metric-label">Procedural</div>
              <div className="dash-metric-val p">68%</div>
            </div>
            <div className="dash-metric">
              <div className="dash-metric-label">Conceptual</div>
              <div className="dash-metric-val c">24%</div>
            </div>
            <div className="dash-metric">
              <div className="dash-metric-label">Generative</div>
              <div className="dash-metric-val g">8%</div>
            </div>
          </div>
          <div className="dash-bar">
            <span className="bar-label">Class thinking</span>
            <div className="bar-track">
              <div className="bar-p" style={{width: '68%'}}></div>
              <div className="bar-c" style={{width: '24%'}}></div>
              <div className="bar-g" style={{width: '8%'}}></div>
            </div>
          </div>
          <div className="dash-thinking">
            <div className="dash-thinking-label">Recent moments worth noting</div>
            <div className="thinking-card">
              <div className="thinking-dot" style={{background: '#E26B4F'}}></div>
              <div>
                <div className="thinking-student">Arya · aha moment</div>
                <div className="thinking-quote">"Oh — so fractions aren't just pieces, they're a relationship between two numbers?"</div>
              </div>
            </div>
            <div className="thinking-card">
              <div className="thinking-dot" style={{background: '#B594DC'}}></div>
              <div>
                <div className="thinking-student">Marcus · generative question</div>
                <div className="thinking-quote">"What if the denominator could be zero? What would that even mean?"</div>
              </div>
            </div>
            <div className="thinking-card">
              <div className="thinking-dot" style={{background: '#2D4A3D'}}></div>
              <div>
                <div className="thinking-student">Priya · stuck signal · worth a conversation</div>
                <div className="thinking-quote">"I keep getting the same wrong answer. I don't know what I'm missing."</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="worksheet">
        <div className="section-label">02 · <span>What a Kelvi mathematics problem looks like</span></div>
        <h2>Discovery-based, <em>by design.</em></h2>
        <p className="section-sub">Every Kelvi problem has a low floor and a high ceiling. Every student can begin. The strongest students never hit a wall. Below is a sample from a Grade 10 Geometry unit.</p>

        <div className="worksheet">
          <div className="ws-head">
            <div className="ws-head-title">Problem — Circles & Equations</div>
            <div className="ws-head-meta">Grade 10 · Geometry · Conceptual</div>
          </div>
          <div className="ws-body">
            <div className="ws-problem">
              <div className="ws-problem-label">The problem</div>
              <p className="ws-problem-text">
                A school courtyard is square, with sides of <strong>40 metres</strong>. Groundskeepers want to plant a circular garden that fits perfectly inside the courtyard — touching all four walls.
              </p>
              <p className="ws-problem-text">
                Write the equation of the circle. Then: what changes if the courtyard is rectangular instead of square? What if it's oval?
              </p>
              <div className="ws-tags" style={{marginTop: '20px'}}>
                <span className="ws-tag ws-tag-p">Procedural — write the equation</span>
                <span className="ws-tag ws-tag-c">Conceptual — rectangular courtyard</span>
                <span className="ws-tag ws-tag-g">Generative — oval courtyard</span>
              </div>
            </div>
            <div className="ws-brief">
              <div className="brief-label">Teacher brief</div>
              <div className="brief-item">
                <div className="brief-item-title">Entry point</div>
                <div className="brief-item-text">Every student can draw the square and circle. The procedural move — finding the centre and radius — is visible from the picture.</div>
              </div>
              <div className="brief-item">
                <div className="brief-item-title">The conceptual shift</div>
                <div className="brief-item-text">A rectangular courtyard breaks the symmetry. Students must choose which dimension constrains the circle — a genuine decision, not a procedure.</div>
              </div>
              <div className="brief-item">
                <div className="brief-item-title">The generative move</div>
                <div className="brief-item-text">An oval courtyard has no circle that touches all four sides. Students who reach this discover that "fitting inside" is not always possible — a deep geometric idea.</div>
              </div>
              <div className="brief-item">
                <div className="brief-item-title">Kelvi will not give the answer</div>
                <div className="brief-item-text">If a student says "I don't know where to start," Kelvi asks: "Can you draw it?" That's the only first move needed.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="section-label">03 · <span>What Kelvi does</span></div>
        <h2>Kelvi categorizes thinking. It helps students develop a <em>deep mathematical mindset.</em></h2>
        <p className="section-sub" style={{marginBottom: '36px'}}>Your students are more than any number Kelvi could assign. Kelvi gives you the picture. You bring the intuition.</p>
        <div className="not-grid">
          <div className="not-col">
            <div className="not-label new">Kelvi does</div>
            <div className="new-item">Categorize thinking: procedural, conceptual, generative</div>
            <div className="new-item">Surface aha moments, stuck signals, generative questions</div>
            <div className="new-item">Ask the question that moves thinking forward</div>
            <div className="new-item">Show patterns across your whole class</div>
            <div className="new-item">Keep a record of every mathematical conversation</div>
          </div>
          <div className="not-col">
            <div className="not-label old">Kelvi never</div>
            <div className="not-item">Replaces your instinct about a student</div>
            <div className="not-item">Reduces a child to a score</div>
            <div className="not-item">Tells a student how to solve a problem</div>
            <div className="not-item">Decides who is "a math person"</div>
            <div className="not-item">Substitutes for the teacher in the room</div>
          </div>
        </div>
      </section>

      <div className="cta-section">
        <h2>Ready to build your own problem set?</h2>
        <p>Discovery-based mathematics problem sets. Built around the questions that help students think like mathematicians.</p>
        <div className="cta-btns">
          <Link href="/login?intent=school" className="btn-primary">Create your account →</Link>
        </div>
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