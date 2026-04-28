'use client'
export default function Home() {
  return (
    <>
      <style jsx>{`
        nav { padding: 18px 40px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E8E3DA; }
        .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #1A1A1A; }
        .logo-word { font-family: 'Instrument Serif', serif; font-size: 28px; line-height: 1; }
        .nav-signin { font-size: 13px; color: #6B6B6B; text-decoration: none; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.06em; border: 1px solid #D9D4C4; padding: 7px 16px; border-radius: 2px; transition: all .15s; }
        .nav-signin:hover { background: #1A1A1A; color: #FAF8F3; border-color: #1A1A1A; }
        .hero { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 64px 40px 48px; }
        .tagline { font-family: 'Instrument Serif', serif; font-size: clamp(2.8rem, 6vw, 5rem); font-weight: 400; line-height: 1.08; letter-spacing: -0.02em; margin-bottom: 20px; color: #1A1A1A; }
        .tagline em { font-style: italic; color: #E26B4F; }
        .sub { font-size: 17px; color: #6B6B6B; line-height: 1.65; max-width: 420px; margin: 0 auto 16px; }
        .sub-tag { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #9A9488; margin: 0 auto 48px; text-align: center; }
        .select-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9A9488; margin-bottom: 16px; }
        .select-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .select-btn { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 24px 32px; border-radius: 4px; border: none; cursor: pointer; text-decoration: none; min-width: 200px; transition: transform .15s, box-shadow .15s; }
        .select-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .select-btn-teacher { background: #2D4A3D; color: #FAF8F3; }
        .select-btn-learner { background: #E26B4F; color: #FAF8F3; }
        .select-btn-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.65; }
        .select-btn-title { font-family: 'Instrument Serif', serif; font-size: 24px; font-weight: 400; line-height: 1; }
        .select-btn-sub { font-size: 12px; line-height: 1.5; opacity: 0.75; text-align: left; max-width: 180px; }
        .difference { border-top: 1px solid #E8E3DA; padding: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 0; max-width: 720px; margin: 0 auto; width: 100%; }
        .diff-col { padding: 0 32px; }
        .diff-col:first-child { border-right: 1px solid #E8E3DA; padding-left: 0; }
        .diff-col:last-child { padding-right: 0; }
        .diff-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 16px; }
        .diff-label.old { color: #9A9488; }
        .diff-label.kelvi { color: #E26B4F; }
        .diff-item { font-size: 13px; line-height: 2; color: #6B6B6B; }
        .diff-item.old { text-decoration: line-through; color: #C0B8AA; }
        .diff-item.kelvi { color: #1A1A1A; font-style: italic; font-family: 'Instrument Serif', serif; font-size: 15px; }
        footer { padding: 20px 40px; border-top: 1px solid #E8E3DA; display: flex; justify-content: space-between; align-items: center; }
        .footer-copy { font-size: 12px; color: #9A9488; font-family: 'IBM Plex Mono', monospace; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 12px; color: #9A9488; text-decoration: none; font-family: 'IBM Plex Mono', monospace; transition: color .12s; }
        .footer-links a:hover { color: #1A1A1A; }
      `}</style>

      <nav>
        <a href="/" className="logo">
          <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M 50 6 C 65 4, 80 14, 78 32 C 76 48, 60 52, 44 50 C 28 48, 24 32, 28 18 C 32 8, 40 6, 50 6 Z" fill="#E26B4F"/>
            <path d="M 22 56 C 36 54, 44 64, 42 80 C 40 92, 28 96, 16 92 C 6 88, 4 76, 8 66 C 12 58, 16 56, 22 56 Z" fill="#2D4A3D"/>
            <path d="M 70 56 C 84 56, 94 64, 92 78 C 90 92, 78 96, 66 92 C 54 88, 52 76, 56 66 C 60 58, 64 56, 70 56 Z" fill="#B594DC"/>
          </svg>
          <span className="logo-word">kelvi</span>
        </a>
        <a href="/login" className="nav-signin">Sign in</a>
      </nav>

      <main className="hero">
        <h1 className="tagline">The question<br />is the <em>answer.</em></h1>
        <p className="sub">Being wrong is where mathematics begins. Discover the questions only you would think to ask.</p>
        <p className="sub-tag">Discussion-based, discovery-driven, Socratic mathematics — for everyone, everywhere.</p>

        <div className="select-label">Who are you?</div>
        <div className="select-btns">
          <a href="/login?intent=school" className="select-btn select-btn-teacher">
            <span className="select-btn-label">For educators</span>
            <span className="select-btn-title">I'm a teacher</span>
            <span className="select-btn-sub">Build discovery-based curriculum. See how your students think.</span>
          </a>
          <a href="/learner" className="select-btn select-btn-learner">
            <span className="select-btn-label">For learners</span>
            <span className="select-btn-title">I'm a learner</span>
            <span className="select-btn-sub">Explore the Math Galaxy or get help with a problem.</span>
          </a>
        </div>
      </main>

      <div className="difference">
        <div className="diff-col">
          <div className="diff-label old">Everywhere else</div>
          <div className="diff-item old">Badges and streaks</div>
          <div className="diff-item old">You got 7 out of 10</div>
          <div className="diff-item old">Here's how to do it</div>
          <div className="diff-item old">Next lesson unlocked</div>
          <div className="diff-item old">Watch this video</div>
        </div>
        <div className="diff-col">
          <div className="diff-label kelvi">Kelvi</div>
          <div className="diff-item kelvi">What do you notice?</div>
          <div className="diff-item kelvi">Where would you start?</div>
          <div className="diff-item kelvi">Why do you think that works?</div>
          <div className="diff-item kelvi">What if you tried it differently?</div>
          <div className="diff-item kelvi">What are you wondering?</div>
        </div>
      </div>

      <footer>
        <span className="footer-copy">© 2026 Kelvi</span>
        <div className="footer-links">
          <a href="/about">About</a>
          <a href="/privacy">Privacy</a>
          <a href="/contact">Contact</a>
        </div>
      </footer>
    </>
  )
}