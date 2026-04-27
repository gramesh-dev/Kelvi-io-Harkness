'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function StudentProblemSet() {
  const params = useParams()
  const [problemSet, setProblemSet] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProblemSet() {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error } = await supabase
        .rpc('get_problem_set_for_student', { ps_id: params.problemId })
        .single()

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      setProblemSet(data)
      setLoading(false)
    }

    loadProblemSet()
  }, [params.problemId])

  if (loading) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F3'}}>
        <div style={{textAlign: 'center'}}>
          <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{animation: 'spin 2s linear infinite'}}>
            <circle cx="25" cy="10" r="5" fill="#E26B4F"/>
            <circle cx="38" cy="32" r="5" fill="#2D4A3D"/>
            <circle cx="12" cy="32" r="5" fill="#B594DC"/>
          </svg>
          <p style={{marginTop: '16px', color: '#6F6A61'}}>Loading problem set...</p>
        </div>
      </div>
    )
  }

  if (!problemSet) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F3'}}>
        <p style={{color: '#6F6A61'}}>Problem set not found</p>
      </div>
    )
  }

  const problems = problemSet.problems ? JSON.parse(problemSet.problems) : []

  return (
    <div style={{minHeight: '100vh', background: '#FAF8F3', padding: '40px 20px'}}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '60px', borderRadius: '8px', border: '1px solid #E8E3DA'}}>
        {/* Header */}
        <div style={{marginBottom: '48px'}}>
          <h1 style={{fontFamily: 'serif', fontSize: '2.5rem', marginBottom: '16px', color: '#1A1A1A'}}>
            {problemSet.title}
          </h1>
          <div style={{color: '#6F6A61', fontSize: '15px'}}>
            {problemSet.duration_minutes} minutes
          </div>
        </div>

        {/* Problems */}
        {problems.map((problem: any, index: number) => (
          <div key={problem.id} style={{marginBottom: '48px', paddingBottom: '48px', borderBottom: index < problems.length - 1 ? '1px solid #E8E3DA' : 'none'}}>
            <h2 style={{fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#1A1A1A'}}>
              {problem.number}. {problem.title}
            </h2>
            <div style={{fontSize: '16px', lineHeight: 1.7, color: '#2F2B25', whiteSpace: 'pre-wrap'}}>
              {problem.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}