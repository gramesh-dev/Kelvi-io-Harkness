import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicCredentials } from "@/lib/supabase/public-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CookieSpec = { name: string; value: string; options: object };

/**
 * OAuth / magic-link PKCE callback.
 *
 * Uses @supabase/ssr createServerClient with cookie getAll/setAll, then
 * supabase.auth.exchangeCodeForSession(code). Session cookies from setAll are
 * buffered and applied to the redirect Response (Next.js does not flush
 * cookies().set from next/headers into a redirect on Vercel).
 *
 * Redirect runs only after Set-Cookie specs are attached. Uses
 * getSupabasePublicCredentials() only (normalized base URL, never /rest/v1) —
 * never the build placeholder, so exchange always targets the real project.
 */
export async function GET(request: NextRequest) {
  const creds = getSupabasePublicCredentials();
  if (!creds) {
    const u = request.nextUrl.clone();
    u.pathname = "/login";
    u.search = "?error=config";
    return NextResponse.redirect(u);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    const u = request.nextUrl.clone();
    u.pathname = "/login";
    u.search = "?error=auth";
    return NextResponse.redirect(u);
  }

  const pendingCookies: CookieSpec[] = [];
  let realRef: string;
  try {
    realRef = new URL(creds.url).hostname.split(".")[0];
  } catch {
    const u = request.nextUrl.clone();
    u.pathname = "/login";
    u.search = "?error=config";
    return NextResponse.redirect(u);
  }

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
      setAll: (cookiesToSet) => {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[callback] exchangeCodeForSession", error.message);
    const u = request.nextUrl.clone();
    u.pathname = "/login";
    u.searchParams.set("error", "auth");
    return NextResponse.redirect(u);
  }

  const destination = request.nextUrl.clone();
  destination.pathname = "/post-login";
  destination.search = "";

  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "no-store, must-revalidate");

  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(
      name,
      value,
      options as Parameters<typeof response.cookies.set>[2]
    );
  }

  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-placeholder-")) {
      response.cookies.delete(c.name);
    }
  }

  return response;
}
