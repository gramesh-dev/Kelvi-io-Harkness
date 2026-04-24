import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicCredentialsOrPlaceholder } from "@/lib/supabase/public-env";

/**
 * OAuth PKCE callback.
 *
 * IMPORTANT: we use createServerClient directly (not createClient from
 * lib/supabase/server) so we can capture the session cookies from setAll and
 * explicitly set them on the NextResponse.redirect() object.
 *
 * Using createClient() relies on cookies() from next/headers, whose .set()
 * calls do NOT automatically merge into a NextResponse.redirect() — so on
 * Vercel the session tokens were never sent to the browser, producing the
 * "no Supabase cookies in browser" symptom.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const creds = getSupabasePublicCredentialsOrPlaceholder();

    // Collect every Set-Cookie that Supabase wants to issue (session tokens).
    type CookieSpec = { name: string; value: string; options: object };
    const pendingCookies: CookieSpec[] = [];

    const supabase = createServerClient(creds.url, creds.anonKey, {
      cookies: {
        getAll: () => {
          // Parse request cookies for PKCE code verifier.
          const pairs: { name: string; value: string }[] = [];
          request.headers
            .get("cookie")
            ?.split(";")
            .forEach((part) => {
              const [k, ...rest] = part.trim().split("=");
              if (k) pairs.push({ name: k.trim(), value: rest.join("=").trim() });
            });
          return pairs;
        },
        setAll: (cookies) => {
          // Capture — do NOT call next/headers cookies() here.
          pendingCookies.push(...cookies);
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(`${origin}/post-login`);
      // Apply session cookies with full attributes (Secure, HttpOnly, SameSite, Path).
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
