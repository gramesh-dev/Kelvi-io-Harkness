"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasRealSupabasePublicConfig } from "@/lib/supabase/public-env";
import { isInviteOnlyModeEnabled } from "@/lib/auth/invite-only";

const inviteOnlyMode = isInviteOnlyModeEnabled();

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordResetOk, setPasswordResetOk] = useState(false);
  const router = useRouter();

  const [intentProduct, setIntentProduct] = useState<string | null>(null);
  const [signupHref, setSignupHref] = useState("/signup");
  const [callbackHint, setCallbackHint] = useState("");
  const [inviteRequired, setInviteRequired] = useState(false);
  const [configError, setConfigError] = useState(false);

  const supabaseReady = hasRealSupabasePublicConfig();

  useEffect(() => {
    setCallbackHint(`${window.location.origin}/callback`);
    const p = new URLSearchParams(window.location.search);
    if (p.get("reset") === "success") setPasswordResetOk(true);
    if (p.get("invite") === "required") setInviteRequired(true);
    if (p.get("error") === "config") setConfigError(true);
    const intent = p.get("intent");
    const labels: Record<string, string> = {
      school: "Harkness",
      family: "Harkness",
      student: "Harkness",
    };
    if (intent && labels[intent]) {
      setIntentProduct(labels[intent]);
      try {
        sessionStorage.setItem("harkness_intent", intent);
      } catch {
        /* ignore */
      }
      setSignupHref(`/signup?intent=${encodeURIComponent(intent)}`);
    }
  }, []);

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (oauthError) setError(oauthError.message)
    } catch {
      setError('Could not start Google sign-in. Please try again.')
    }
    setLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      router.push(next);
    } else {
      router.push("/post-login");
    }
    router.refresh();
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
              
            </Link>
            
            {intentProduct && (
              <p style={{fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9A9488', marginBottom: '16px'}}>
                {intentProduct}
              </p>
            )}
            
            <h1 style={{fontFamily: "'Instrument Serif', serif", fontSize: '2rem', fontWeight: 400, lineHeight: 1.2, marginBottom: '8px', color: '#1A1A1A'}}>
              Sign in
            </h1>
            <p style={{fontSize: '15px', color: '#6B6B6B', lineHeight: 1.6}}>
              Sign in or create an account to get started
            </p>
          </div>

          {/* Form Card */}
          <div style={{background: '#fff', borderRadius: '4px', border: '1px solid #E8E3DA', padding: '32px'}}>
            
            {/* Alerts */}
            {error && (
              <div style={{padding: '12px 16px', borderRadius: '4px', background: '#FEF2F2', color: '#991B1B', fontSize: '14px', marginBottom: '20px', border: '1px solid #FECACA'}}>
                {error}
              </div>
            )}

            {passwordResetOk && (
              <div style={{padding: '12px 16px', borderRadius: '4px', background: '#F0FDF4', color: '#166534', fontSize: '14px', marginBottom: '20px', border: '1px solid #BBF7D0'}}>
                Your password was updated. Sign in with your new password.
              </div>
            )}

            {inviteRequired && (
              <div style={{padding: '12px 16px', borderRadius: '4px', background: '#FFFBEB', color: '#78350F', fontSize: '14px', marginBottom: '20px', border: '1px solid #FDE68A'}}>
                This environment is invite-only right now. Ask an admin to add your email before signing in.
              </div>
            )}

                        {/* Google Button */}
            <button type="button" onClick={handleGoogle} disabled={loading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 24px', border: '1px solid #E8E3DA', borderRadius: 6, background: '#fff', color: '#1A1A1A', fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 16 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#FAF8F3' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: '#E8E3DA' }} />
              <span style={{ fontSize: 12, color: '#9A9488', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#E8E3DA' }} />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
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
                  placeholder="••••••••"
                />
                <div style={{marginTop: '8px', textAlign: 'right'}}>
                  <Link href="/forgot-password" style={{fontSize: '13px', color: '#E26B4F', fontWeight: 500, textDecoration: 'none'}}>
                    Forgot password?
                  </Link>
                </div>
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
                {loading ? "Signing in..." : "Continue with email"}
              </button>
            </form>

            {/* Sign up link */}
            {inviteOnlyMode ? (
              <p style={{textAlign: 'center', fontSize: '14px', color: '#6B6B6B', marginTop: '24px', fontFamily: "'IBM Plex Sans', sans-serif"}}>
                Invite-only beta is enabled. Ask an admin for access.
              </p>
            ) : (
              <p style={{textAlign: 'center', fontSize: '14px', color: '#6B6B6B', marginTop: '24px', fontFamily: "'IBM Plex Sans', sans-serif"}}>
                Don't have an account?{" "}
                <Link href={signupHref} style={{color: '#E26B4F', fontWeight: 500, textDecoration: 'none'}}>
                  Sign up
                </Link>
              </p>
            )}
          </div>

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