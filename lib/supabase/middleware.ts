import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicCredentials } from "./public-env";
import {
  evaluateInviteOnlyAccess,
  isInviteOnlyModeEnabled,
} from "@/lib/auth/invite-only";

export async function updateSession(request: NextRequest) {
  try {
    const creds = getSupabasePublicCredentials();
    if (!creds) {
      console.error("[middleware] Missing NEXT_PUBLIC_SUPABASE_URL and/or anon key.");
      return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });

    type CookieSpec = { name: string; value: string; options: object };
    const pendingCookies: CookieSpec[] = [];

    let user: User | null = null;

    const supabase = createServerClient(creds.url, creds.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet);
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(
              name,
              value,
              options as Parameters<typeof supabaseResponse.cookies.set>[2]
            );
          });
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    user = data.user;

    const path = request.nextUrl.pathname;

    function redirectWithCookies(
      pathname: string,
      searchParams?: Record<string, string>
    ): NextResponse {
      const url = new URL(pathname, request.url);
      if (searchParams) {
        Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
      }
      const res = NextResponse.redirect(url);
      pendingCookies.forEach(({ name, value, options }) => {
        res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
      });
      return res;
    }

    // Admin JSON mutations: refresh session cookies only; never invite-gate or auth redirects.
    const isApiAdminActionsPost =
      path === "/api/admin/actions" && request.method === "POST";
    const isServerActionRequest = Boolean(request.headers.get("next-action"));
    if (isApiAdminActionsPost || isServerActionRequest) {
      return supabaseResponse;
    }

    if (user && path === "/school/index.html") {
      return redirectWithCookies("/school");
    }

    if (user && path === "/student/index.html" && !request.nextUrl.searchParams.has("app")) {
      return redirectWithCookies("/solo");
    }

    const isAuthEntry =
      path.startsWith("/login") ||
      path.startsWith("/signup") ||
      path.startsWith("/forgot-password");

    const isPublicFamilyGalaxy = path === "/family/family.html";

    const isProtectedApp =
      path.startsWith("/family") ||
      path.startsWith("/school") ||
      path.startsWith("/admin") ||
      path.startsWith("/solo") ||
      path.startsWith("/student") ||
      path.startsWith("/role-setup") ||
      path.startsWith("/post-login");

    if (user && isInviteOnlyModeEnabled()) {
      const access = await evaluateInviteOnlyAccess(supabase, user);
      const inviteGatePaths =
        isProtectedApp || path.startsWith("/post-login") || path.startsWith("/signup");
      if (!access.allowed && inviteGatePaths && !path.startsWith("/api/auth/signout")) {
        return redirectWithCookies("/api/auth/signout", { next: "/login?invite=required" });
      }
    }

    if (!user && isProtectedApp && !isPublicFamilyGalaxy) {
      return redirectWithCookies("/login", path !== "/login" ? { next: path } : undefined);
    }

    if (user && isAuthEntry) {
      return redirectWithCookies("/post-login");
    }

    return supabaseResponse;
  } catch (e) {
    console.error("[middleware] updateSession fatal:", e);
    return NextResponse.next({ request });
  }
}
