import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicCredentialsOrPlaceholder } from "@/lib/supabase/public-env";

/**
 * OAuth PKCE callback.
 *
 * We use createServerClient directly (NOT createClient from lib/supabase/server)
 * because cookies().set() mutations from next/headers are NOT flushed into a
 * NextResponse.redirect() response object — the tokens were never reaching the
 * browser on Vercel, causing "no sb-* cookies" and a permanent login redirect.
 *
 * Fix: capture cookies in setAll → explicitly apply to the redirect response.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const creds = getSupabasePublicCredentialsOrPlaceholder();

    type CookieSpec = { name: string; value: string; options: object };
    const pendingCookies: CookieSpec[] = [];

    const supabase = createServerClient(creds.url, creds.anonKey, {
      cookies: {
        // NextRequest.cookies gives proper parsed access to the cookie header
        // (includes the PKCE code verifier stored by the browser-side auth helper).
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          pendingCookies.push(...cookies);
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[callback] exchangeCodeForSession", {
      error: error?.message ?? null,
      cookiesSet: pendingCookies.map((c) => c.name),
    });

    if (!error) {
      const response = NextResponse.redirect(`${origin}/post-login`);
      // Explicitly set every session cookie (with full Secure/HttpOnly/SameSite/Path
      // attributes) on the redirect response so the browser receives them.
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(
          name,
          value,
          options as Parameters<typeof response.cookies.set>[2]
        );
      });
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
