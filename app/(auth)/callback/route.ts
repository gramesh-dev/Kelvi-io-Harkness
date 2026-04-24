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

    // The PKCE code verifier cookie name is derived from the Supabase project
    // ref (e.g. "sb-bewxjautfsgpzafrfowl-auth-token-code-verifier"). If the
    // browser client was initialised with a placeholder URL (because
    // NEXT_PUBLIC_SUPABASE_URL was not set for this Vercel environment at
    // build time), the verifier ends up stored as
    // "sb-placeholder-auth-token-code-verifier". The server client uses the
    // real URL, so it looks for the wrong name and exchangeCodeForSession
    // silently fails. We remap any mismatched verifier cookie so both names
    // are visible to the server client.
    const realRef = new URL(creds.url).hostname.split(".")[0];
    const getAll = () => {
      const incoming = request.cookies.getAll();
      const extras: { name: string; value: string }[] = [];
      for (const c of incoming) {
        const m = c.name.match(/^sb-(.+)-auth-token-code-verifier$/);
        if (m && m[1] !== realRef) {
          extras.push({
            name: `sb-${realRef}-auth-token-code-verifier`,
            value: c.value,
          });
        }
      }
      return extras.length ? [...incoming, ...extras] : incoming;
    };

    const supabase = createServerClient(creds.url, creds.anonKey, {
      cookies: {
        getAll,
        setAll: (cookies) => {
          pendingCookies.push(...cookies);
        },
      },
    });

    const remappedVerifier = getAll().find(
      (c) => c.name === `sb-${realRef}-auth-token-code-verifier`
    );
    console.log("[callback] pre-exchange", {
      realRef,
      verifierFound: !!remappedVerifier,
      cookieNames: request.cookies.getAll().map((c) => c.name),
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
