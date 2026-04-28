"use client";

import { useEffect, useState } from "react";
import { submitFamilyOrg, submitSchoolOrg, submitStudentSegment } from "./actions";

type Role = "school" | "family" | "student" | null;

export function RoleSetupWizard() {
  const [role, setRole] = useState<Role>(null);
  const [orgName, setOrgName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kelvi_signup_intent");
      if (raw === "school" || raw === "family" || raw === "student") {
        setRole(raw);
      }
      sessionStorage.removeItem("kelvi_signup_intent");
    } catch {}
  }, []);

  async function onSchoolSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("orgName", orgName);
      const res = await submitSchoolOrg(fd);
      if (res?.error) setError(res.error);
    } finally {
      setLoading(false);
    }
  }

  async function onFamilySubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("familyName", familyName);
      const res = await submitFamilyOrg(fd);
      if (res?.error) setError(res.error);
    } finally {
      setLoading(false);
    }
  }

  async function onStudentContinue() {
    setLoading(true);
    setError(null);
    try {
      const res = await submitStudentSegment();
      if (res?.error) setError(res.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet" />
      
      <style jsx global>{`
        body { font-family: 'IBM Plex Sans', system-ui, sans-serif; background: #FAF8F3; }
      `}</style>

      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F3', padding: '20px'}}>
        <div style={{width: '100%', maxWidth: '560px'}}>
          
          {/* Logo & Header */}
          <div style={{textAlign: 'center', marginBottom: '40px'}}>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '24px'}}>
              <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M 50 6 C 65 4, 80 14, 78 32 C 76 48, 60 52, 44 50 C 28 48, 24 32, 28 18 C 32 8, 40 6, 50 6 Z" fill="#E26B4F"/>
                <path d="M 22 56 C 36 54, 44 64, 42 80 C 40 92, 28 96, 16 92 C 6 88, 4 76, 8 66 C 12 58, 16 56, 22 56 Z" fill="#2D4A3D"/>
                <path d="M 70 56 C 84 56, 94 64, 92 78 C 90 92, 78 96, 66 92 C 54 88, 52 76, 56 66 C 60 58, 64 56, 70 56 Z" fill="#B594DC"/>
              </svg>
              <span style={{fontFamily: "'Instrument Serif', serif", fontSize: '32px', color: '#1A1A1A'}}>kelvi</span>
            </div>
            
            {!role && (
              <>
                <h1 style={{fontFamily: "'Instrument Serif', serif", fontSize: '2rem', fontWeight: 400, marginBottom: '12px', color: '#1A1A1A'}}>
                  Who are you here as?
                </h1>
                <p style={{fontSize: '15px', color: '#6B6B6B', lineHeight: 1.6}}>
                  Choose one. You can add more detail later in settings.
                </p>
              </>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <div style={{padding: '12px 16px', borderRadius: '4px', background: '#FEF2F2', color: '#991B1B', fontSize: '14px', marginBottom: '20px', border: '1px solid #FECACA'}}>
              {error}
            </div>
          )}

          {/* Role Selection */}
          {!role && (
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px'}}>
              <button
                onClick={() => setRole("school")}
                style={{
                  background: '#fff',
                  border: '1px solid #E8E3DA',
                  borderRadius: '4px',
                  padding: '24px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#E26B4F'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E8E3DA'}
              >
                <div style={{fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E26B4F', marginBottom: '8px'}}>
                  Kelvi School
                </div>
                <div style={{fontFamily: "'Instrument Serif', serif", fontSize: '1.25rem', fontWeight: 400, color: '#1A1A1A', marginBottom: '8px'}}>
                  Teacher
                </div>
                <div style={{fontSize: '12px', color: '#6F6A61', lineHeight: 1.5}}>
                  Classroom & school workspace
                </div>
              </button>

              <button
                onClick={() => setRole("family")}
                style={{
                  background: '#fff',
                  border: '1px solid #E8E3DA',
                  borderRadius: '4px',
                  padding: '24px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2D4A3D'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E8E3DA'}
              >
                <div style={{fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2D4A3D', marginBottom: '8px'}}>
                  Kelvi Family
                </div>
                <div style={{fontFamily: "'Instrument Serif', serif", fontSize: '1.25rem', fontWeight: 400, color: '#1A1A1A', marginBottom: '8px'}}>
                  Parent
                </div>
                <div style={{fontSize: '12px', color: '#6F6A61', lineHeight: 1.5}}>
                  Home learning space
                </div>
              </button>

              <button
                onClick={() => setRole("student")}
                style={{
                  background: '#fff',
                  border: '1px solid #E8E3DA',
                  borderRadius: '4px',
                  padding: '24px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#B594DC'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E8E3DA'}
              >
                <div style={{fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B594DC', marginBottom: '8px'}}>
                  Kelvi Student
                </div>
                <div style={{fontFamily: "'Instrument Serif', serif", fontSize: '1.25rem', fontWeight: 400, color: '#1A1A1A', marginBottom: '8px'}}>
                  Student
                </div>
                <div style={{fontSize: '12px', color: '#6F6A61', lineHeight: 1.5}}>
                  Practice & thinking partner
                </div>
              </button>
            </div>
          )}

          {/* Teacher Form */}
          {role === "school" && (
            <div style={{background: '#fff', border: '1px solid #E8E3DA', borderRadius: '4px', padding: '32px'}}>
              <button
                onClick={() => { setRole(null); setOrgName(""); setError(null); }}
                style={{fontSize: '13px', color: '#E26B4F', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '24px', padding: 0}}
              >
                ← Back
              </button>
              
              <h2 style={{fontFamily: "'Instrument Serif', serif", fontSize: '1.5rem', fontWeight: 400, marginBottom: '8px', color: '#1A1A1A'}}>
                School or organization
              </h2>
              <p style={{fontSize: '14px', color: '#6B6B6B', marginBottom: '24px', lineHeight: 1.6}}>
                What school or organization are you teaching at?
              </p>

              <form onSubmit={onSchoolSubmit}>
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', fontSize: '13px', fontWeight: 500, color: '#1A1A1A', marginBottom: '6px'}}>
                    Organization name
                  </label>
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    placeholder="e.g. Phillips Exeter Academy"
                    style={{width: '100%', padding: '10px 14px', border: '1px solid #E8E3DA', borderRadius: '2px', fontSize: '14px', outline: 'none'}}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    background: loading ? '#9A9488' : '#E26B4F',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '2px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? "Saving..." : "Continue"}
                </button>
              </form>
            </div>
          )}

          {/* Family Form */}
          {role === "family" && (
            <div style={{background: '#fff', border: '1px solid #E8E3DA', borderRadius: '4px', padding: '32px'}}>
              <button
                onClick={() => { setRole(null); setFamilyName(""); setError(null); }}
                style={{fontSize: '13px', color: '#2D4A3D', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '24px', padding: 0}}
              >
                ← Back
              </button>
              
              <h2 style={{fontFamily: "'Instrument Serif', serif", fontSize: '1.5rem', fontWeight: 400, marginBottom: '8px', color: '#1A1A1A'}}>
                Family name
              </h2>
              <p style={{fontSize: '14px', color: '#6B6B6B', marginBottom: '24px', lineHeight: 1.6}}>
                What should we call your family learning space?
              </p>

              <form onSubmit={onFamilySubmit}>
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', fontSize: '13px', fontWeight: 500, color: '#1A1A1A', marginBottom: '6px'}}>
                    Family name
                  </label>
                  <input
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    required
                    placeholder="The Smith Family"
                    style={{width: '100%', padding: '10px 14px', border: '1px solid #E8E3DA', borderRadius: '2px', fontSize: '14px', outline: 'none'}}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    background: loading ? '#9A9488' : '#2D4A3D',
                    color: '#FAF8F3',
                    border: 'none',
                    borderRadius: '2px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? "Saving..." : "Continue"}
                </button>
              </form>
            </div>
          )}

          {/* Student Confirmation */}
          {role === "student" && (
            <div style={{background: '#fff', border: '1px solid #E8E3DA', borderRadius: '4px', padding: '32px'}}>
              <button
                onClick={() => { setRole(null); setError(null); }}
                style={{fontSize: '13px', color: '#B594DC', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '24px', padding: 0}}
              >
                ← Back
              </button>
              
              <h2 style={{fontFamily: "'Instrument Serif', serif", fontSize: '1.5rem', fontWeight: 400, marginBottom: '8px', color: '#1A1A1A'}}>
                Ready to learn
              </h2>
              <p style={{fontSize: '14px', color: '#6B6B6B', marginBottom: '24px', lineHeight: 1.6}}>
                You'll use the student practice space. You can fill out more profile details later.
              </p>

              <button
                onClick={onStudentContinue}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: loading ? '#9A9488' : '#B594DC',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? "Saving..." : "Continue to student home"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}