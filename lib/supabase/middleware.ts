import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicCredentials } from "./public-env";

export async function updateSession(request: NextRequest) {
  const creds = getSupabasePublicCredentials();
  if (!creds) {
    console.error(
      "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL and/or anon key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel."
    );
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  let user: User | null = null;

  try {
    const supabase = createServerClient(creds.url, creds.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Next.js Edge: request.cookies are read-only — never call request.cookies.set.
        // Second arg is cache headers from @supabase/ssr (must be copied to the response).
        setAll(cookiesToSet, headersToSet) {
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          if (headersToSet && typeof headersToSet === "object") {
            Object.entries(headersToSet).forEach(([key, value]) => {
              supabaseResponse.headers.set(key, String(value));
            });
          }
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (e) {
    console.error("[middleware] Supabase session error:", e);
    return NextResponse.next({ request });
  }

  const path = request.nextUrl.pathname;

  // Signed-in users should use the Next app at `/school`, not static `public/school/index.html`.
  if (user && path === "/school/index.html") {
    const url = request.nextUrl.clone();
    url.pathname = "/school";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value);
    });
    return redirectResponse;
  }

  // Static student shell: same HTML is both marketing + full UI (localStorage `kelvi-name`).
  // Logged-in users should use `/solo` unless opening the full workspace from the app (?app=1).
  if (
    user &&
    path === "/student/index.html" &&
    !request.nextUrl.searchParams.has("app")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/solo";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value);
    });
    return redirectResponse;
  }

  const isAuthEntry =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password");

  /** Static Math Galaxy shell (`public/family/family.html`) — student-facing; may open without parent session when linked from parent dashboard. */
  const isPublicFamilyGalaxy = path === "/family/family.html";

  const isProtectedApp =
    path.startsWith("/family") ||
    path.startsWith("/school") ||
    path.startsWith("/solo") ||
    path.startsWith("/student") ||
    path.startsWith("/role-setup") ||
    path.startsWith("/post-login");

  if (!user && isProtectedApp && !isPublicFamilyGalaxy) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (path !== "/login") {
      url.searchParams.set("next", path);
    }
    return NextResponse.redirect(url);
  }

  if (user && isAuthEntry) {
    const url = request.nextUrl.clone();
    url.pathname = "/post-login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
