"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isInviteOnlyModeEnabled } from "@/lib/auth/invite-only";

const inviteOnlyMode = isInviteOnlyModeEnabled();

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet" />
        
        <style jsx global>{`
          body { font-family: 'IBM Plex Sans', system-ui, sans-serif; background: #FAF8F3; }
        `}</style>

        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3] px-4">
          <div className="w-full max-w-md text-center">
            <div style={{background: '#fff', borderRadius: '4px', border: '1px solid #E8E3DA', padding: '48px 32px'}}>
              <div style={{width: '64px', height: '64px', background: '#F5EDE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'}}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E26B4F" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 style={{fontFamily: "'Instrument Serif', serif", fontSize: '1.75rem', fontWeight: 400, color: '#1A1A1A', marginBottom: '12px'}}>
                Check your email
              </h2>
              <p style={{fontSize: '15px', color: '#6B6B6B', lineHeight: 1.6}}>
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
              </p>
              <div style={{marginTop: '32px'}}>
                <Link href="/login" style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 24px', background: '#E26B4F', color: '#fff', fontSize: '14px', fontWeight: 500, borderRadius: '2px', textDecoration: 'none', transition: 'all 0.15s'}}>
                  Go to login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (inviteOnlyMode) {
    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet" />
        
        <style jsx global>{`
          body { font-family: 'IBM Plex Sans', system-ui, sans-serif; background: #FAF8F3; }
        `}</style>

        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3] px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
                <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 50 6 C 65 4, 80 14, 78 32 C 76 48, 60 52, 44 50 C 28 48, 24 32, 28 18 C 32 8, 40 6, 50 6 Z" fill="#E26B4F"/>
                  <path d="M 22 56 C 36 54, 44 64, 42 80 C 40 92, 28 96, 16 92 C 6 88, 4 76, 8 66 C 12 58, 16 56, 22 56 Z" fill="#2D4A3D"/>
                  <path d="M 70 56 C 84 56, 94 64, 92 78 C 90 92, 78 96, 66 92 C 54 88, 52 76, 56 66 C 60 58, 64 56, 70 56 Z" fill="#B594DC"/>
                </svg>
                <span style={{fontFamily: "'Instrument Serif', serif", fontSize: '32px', color: '#1A1A1A'}}>kelvi</span>
              </Link>
              <p style={{fontSize: '15px', color: '#6B6B6B'}}>Invite-only access</p>
            </div>
            
            <div style={{background: '#fff', borderRadius: '4px', border: '1px solid #E8E3DA', padding: '32px', textAlign: 'center'}}>
              <p style={{fontSize: '15px', color: '#1A1A1A', marginBottom: '16px'}}>
                Sign up is temporarily disabled while we run closed beta testing.
              </p>
              <p style={{fontSize: '14px', color: '#6B6B6B', marginBottom: '24px'}}>
                Ask an admin for an invite email, then come back to log in.
              </p>
              <Link href="/login" style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 24px', background: '#E26B4F', color: '#fff', fontSize: '14px', fontWeight: 500, borderRadius: '2px', textDecoration: 'none'}}>
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet" />
      
      <style jsx global>{`
        body { font-family: 'IBM Plex Sans', system-ui, sans-serif; background: #FAF8F3; }
      `}</style>

      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3] px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M 50 6 C 65 4, 80 14, 78 32 C 76 48, 60 52, 44 50 C 28 48, 24 32, 28 18 C 32 8, 40 6, 50 6 Z" fill="#E26B4F"/>
                <path d="M 22 56 C 36 54, 44 64, 42 80 C 40 92, 28 96, 16 92 C 6 88, 4 76, 8 66 C 12 58, 16 56, 22 56 Z" fill="#2D4A3D"/>
                <path d="M 70 56 C 84 56, 94 64, 92 78 C 90 92, 78 96, 66 92 C 54 88, 52 76, 56 66 C 60 58, 64 56, 70 56 Z" fill="#B594DC"/>
              </svg>
              <span style={{fontFamily: "'Instrument Serif', serif", fontSize: '32px', color: '#1A1A1A'}}>kelvi</span>
            </Link>
            
            <h1 style={{fontFamily: "'Instrument Serif', serif", fontSize: '2rem', fontWeight: 400, lineHeight: 1.2, marginBottom: '8px', color: '#1A1A1A'}}>
              Create your account
            </h1>
            <p style={{fontSize: '15px', color: '#6B6B6B', lineHeight: 1.6}}>
              Join Kelvi and start your mathematical journey
            </p>
          </div>

          {/* Form Card */}
          <form
            onSubmit={handleSignup}
            style={{background: '#fff', borderRadius: '4px', border: '1px solid #E8E3DA', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px'}}
          >
            {error && (
              <div style={{padding: '12px 16px', borderRadius: '4px', background: '#FEF2F2', color: '#991B1B', fontSize: '14px', border: '1px solid #FECACA'}}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="fullName" style={{display: 'block', fontSize: '13px', fontWeight: 500, color: '#1A1A1A', marginBottom: '6px', fontFamily: "'IBM Plex Sans', sans-serif"}}>
                Your name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{width: '100%', padding: '10px 14px', border: '1px solid #E8E3DA', borderRadius: '2px', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif"}}
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label htmlFor="email" style={{display: 'block', fontSize: '13px', fontWeight: 500, color: '#1A1A1A', marginBottom: '6px', fontFamily: "'IBM Plex Sans', sans-serif"}}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{width: '100%', padding: '10px 14px', border: '1px solid #E8E3DA', borderRadius: '2px', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif"}}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" style={{display: 'block', fontSize: '13px', fontWeight: 500, color: '#1A1A1A', marginBottom: '6px', fontFamily: "'IBM Plex Sans', sans-serif"}}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{width: '100%', padding: '10px 14px', border: '1px solid #E8E3DA', borderRadius: '2px', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif"}}
                placeholder="At least 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: '#E26B4F',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '2px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: loading ? 0.5 : 1,
                fontFamily: "'IBM Plex Sans', sans-serif"
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#C4543A';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#E26B4F';
              }}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p style={{textAlign: 'center', fontSize: '14px', color: '#6B6B6B', fontFamily: "'IBM Plex Sans', sans-serif"}}>
              Already have an account?{" "}
              <Link href="/login" style={{color: '#E26B4F', fontWeight: 500, textDecoration: 'none'}}>
                Log in
              </Link>
            </p>
          </form>

          {/* Back link */}
          <div style={{textAlign: 'center', marginTop: '24px'}}>
            <Link href="/" style={{fontSize: '13px', color: '#9A9488', textDecoration: 'none', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em'}}>
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}