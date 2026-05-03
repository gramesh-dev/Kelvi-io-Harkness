import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { getSupabasePublicCredentials } from '@/lib/supabase/public-env'

export async function middleware(request: NextRequest) {
  // Refresh session cookies
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  // Protect all /harkness routes
  if (pathname.startsWith('/harkness')) {
    const creds = getSupabasePublicCredentials()
    if (!creds) return response

    const supabase = createServerClient(creds.url, creds.anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
