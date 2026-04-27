import { createClient } from '@/lib/supabase/server'

export async function getPostAuthRedirectPath(): Promise<string> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return '/login'
  }

  // Get user role from metadata
  const role = user.user_metadata?.role

  // Route based on role
  if (role === 'teacher') {
    return '/teach'
  } else if (role === 'family') {
    return '/family'
  } else if (role === 'student') {
    return '/student'
  }

  // Default: send to role selection if no role set
  return '/onboarding'
}