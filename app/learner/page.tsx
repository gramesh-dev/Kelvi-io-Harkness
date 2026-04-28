'use client'

import Link from 'next/link'

export default function LearnerPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet" />

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'IBM Plex Sans', system-ui, sans-serif; background: #FAF8F3; color: #1A1A1A; line-height: 1.6; }
      `}</style>

      <style jsx>{`
        nav { padding: 18px 40px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E8E3DA; position: sticky; top: 0; background: #FAF8F3; z-index: 50; }
        .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #1A1A1A; }
        .logo-word { font-family: 'Instrument Serif', serif; font-size: 26px; line-height: 1; }
        .nav-back { font-size: 13px; color: #6B6B6B; text-decoration: none; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.06em; }
        .nav-back:hover { color: #1A1A1A; }

        .hero { padding: 72px 40px 64px; max-width: 860px; margin: 0 auto; text-align: center; border-bottom: 1px solid #E8E3DA; }
        .kicker { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9A9488; margin-bottom: 20px; }
        h1 { font-family: 'Instrument Serif', serif; font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 400; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 20px; }
        h1 em { font-style: italic; color: #E26B4F; }
        .hero-sub { font-size: 17px; color: #6B6B6B; line-height: 1.7; max-width: 480px; margin: 0 auto; }

        .age-select { padding: 64px 40px; max-width: 860px; margin: 0 auto; }
        .age-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9A9488; text-align: center; margin-bottom: 28px; }
        .age-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

        .age-card { border-radius: 4px; padding: 36px; border: 1px solid #E8E3DA; background: #fff; display: flex; flex-direction: column; }
        .age-card-kicker { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 16px; }
        .age-card-title { font-family: 'Instrument Serif', serif; font-size: 26px; font-weight: 400; line-height: 1.15; margin-bottom: 12px; }
        .age-card-title em { font-style: italic; }
        .age-card-sub { font-size: 14px; color: #6B6B6B; line-height: 1.65; margin-bottom: 28px; flex: 1; }
        .age-card-actions { display: flex; flex-direction: column; gap: 10px; }

        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 22px; border-radius: 2px; font-size: 13px; font-weight: 500; text-decoration: none; transition: all .15s; border: 1px solid transparent; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; }
        .btn-coral { background: #E26B4F; color: #fff; border-color: #E26B4F; }
        .btn-coral:hover { background: #C4543A; border-color: #C4543A; }
        .btn-purple-outline { background: transparent; color: #8E68BE; border-color: #8E68BE; }
        .btn-purple-outline:hover { background: #8E68BE; color: #fff; }

        @media (max-width: 720px) {
          .age-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav>
        <Link href="/" className="logo">
          <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
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

          {/* UNDER 13 */}
          <div className="age-card">
            <div className="age-card-kicker" style={{color: '#E26B4F'}}>Ages 5 – 13</div>
            <div className="age-card-title">Explore the <em>Math Galaxy</em></div>
            <p className="age-card-sub">Nine planets. Fractions, Geometry, Algebra, and more. Click a planet, get a question you can&apos;t stop thinking about, and go from there. No timer. No score.</p>
            <div className="age-card-actions">
              <Link href="/login?intent=family" className="btn btn-coral">Get started — ask a parent first →</Link>
            </div>
          </div>

          {/* OVER 13 */}
          <div className="age-card">
            <div className="age-card-kicker" style={{color: '#8E68BE'}}>Ages 13 and up</div>
            <div className="age-card-title">Explore or get <em>homework help</em></div>
            <p className="age-card-sub">Wander the Math Galaxy on your own, or bring a problem you&apos;re stuck on. Take a photo of your homework or just type it in. Kelvi thinks through it with you — it never just gives you the answer.</p>
            <div className="age-card-actions">
              <Link href="/login?intent=family" className="btn btn-coral">Open the Math Galaxy →</Link>
              <Link href="/login?intent=student" className="btn btn-purple-outline">Get homework help →</Link>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
