import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicCredentials } from "./public-env";

function copyCookiesTo(from: NextResponse, to: NextResponse) {
  try {
    from.cookies.getAll().forEach(({ name, value }) => {
      try {
        to.cookies.set(name, value);
      } catch {
        /* ignore single-cookie failures on Edge */
      }
    });
  } catch {
    /* ignore */
  }
}

function redirectPreservingCookies(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
  searchParams?: Record<string, string>
) {
  const url = new URL(pathname, request.url);
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = NextResponse.redirect(url);
  copyCookiesTo(supabaseResponse, res);
  return res;
}

export async function updateSession(request: NextRequest) {
  try {
    const creds = getSupabasePublicCredentials();
    if (!creds) {
      console.error(
        "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL and/or anon key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel."
      );
      return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });

    let user: User | null = null;

    const supabase = createServerClient(creds.url, creds.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              supabaseResponse.cookies.set(name, value, options ?? {});
            } catch (e) {
              console.error("[middleware] cookie set failed:", name, e);
            }
          });
          if (headersToSet && typeof headersToSet === "object") {
            Object.entries(headersToSet).forEach(([key, value]) => {
              try {
                supabaseResponse.headers.set(key, String(value));
              } catch {
                /* ignore */
              }
            });
          }
        },
      },
    });

    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (e) {
      console.error("[middleware] Supabase getUser error:", e);
      return NextResponse.next({ request });
    }

    const path = request.nextUrl.pathname;

    if (user && path === "/school/index.html") {
      return redirectPreservingCookies(request, supabaseResponse, "/school");
    }

    if (
      user &&
      path === "/student/index.html" &&
      !request.nextUrl.searchParams.has("app")
    ) {
      return redirectPreservingCookies(request, supabaseResponse, "/solo");
    }

    const isAuthEntry =
      path.startsWith("/login") ||
      path.startsWith("/signup") ||
      path.startsWith("/forgot-password");

    const isPublicFamilyGalaxy = path === "/family/family.html";

    const isProtectedApp =
      path.startsWith("/family") ||
      path.startsWith("/school") ||
      path.startsWith("/solo") ||
      path.startsWith("/student") ||
      path.startsWith("/role-setup") ||
      path.startsWith("/post-login");

    if (!user && isProtectedApp && !isPublicFamilyGalaxy) {
      const qp =
        path !== "/login" ? { next: path } : undefined;
      return redirectPreservingCookies(
        request,
        supabaseResponse,
        "/login",
        qp
      );
    }

    if (user && isAuthEntry) {
      return redirectPreservingCookies(request, supabaseResponse, "/post-login");
    }

    return supabaseResponse;
  } catch (e) {
    console.error("[middleware] updateSession fatal:", e);
    return NextResponse.next({ request });
  }
}
