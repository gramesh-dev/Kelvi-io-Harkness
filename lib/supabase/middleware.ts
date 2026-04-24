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
      console.error(
        "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL and/or anon key."
      );
      return NextResponse.next({ request });
    }

    // Official Supabase SSR pattern:
    // 1. supabaseResponse starts as NextResponse.next({ request })
    // 2. setAll writes tokens to BOTH request.cookies AND supabaseResponse.cookies
    // 3. supabaseResponse (or a redirect that carries its cookies) is always returned
    let supabaseResponse = NextResponse.next({ request });

    // Collect cookies with full options so redirects can copy them correctly.
    // copyCookiesTo(supabaseResponse) would lose Secure/HttpOnly/SameSite/Path.
    type CookieSpec = { name: string; value: string; options: object };
    const pendingCookies: CookieSpec[] = [];

    let user: User | null = null;

    const supabase = createServerClient(creds.url, creds.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Capture full specs so redirect responses get all cookie attributes.
          pendingCookies.push(...cookiesToSet);
          // Write to request so downstream Node.js handlers see refreshed tokens.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Recreate with updated request so the forwarded request carries the tokens.
          supabaseResponse = NextResponse.next({ request });
          // Write to response so the browser stores the refreshed tokens.
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

    // IMPORTANT (official Supabase guidance): do not put any logic between
    // createServerClient and getUser(). getUser() refreshes the session and
    // calls setAll if new tokens were issued.
    const { data } = await supabase.auth.getUser();
    user = data.user;

    const path = request.nextUrl.pathname;

    // Helper: build a redirect that carries all refreshed session cookies with
    // their original attributes (Secure, HttpOnly, SameSite, Path, etc.).
    function redirectWithCookies(
      pathname: string,
      searchParams?: Record<string, string>
    ): NextResponse {
      const url = new URL(pathname, request.url);
      if (searchParams) {
        Object.entries(searchParams).forEach(([k, v]) =>
          url.searchParams.set(k, v)
        );
      }
      const res = NextResponse.redirect(url);
      pendingCookies.forEach(({ name, value, options }) => {
        res.cookies.set(
          name,
          value,
          options as Parameters<typeof res.cookies.set>[2]
        );
      });
      return res;
    }

    console.log("[middleware]", {
      path,
      method: request.method,
      hasUser: Boolean(user),
      userEmail: user?.email ?? null,
      inviteOnlyEnabled: isInviteOnlyModeEnabled(),
      hasAdminEmails: Boolean(process.env.INVITE_ONLY_ADMIN_EMAILS),
      adminEmailsValue: (process.env.INVITE_ONLY_ADMIN_EMAILS ?? "").slice(0, 40),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    });

    if (user && path === "/school/index.html") {
      return redirectWithCookies("/school");
    }

    if (
      user &&
      path === "/student/index.html" &&
      !request.nextUrl.searchParams.has("app")
    ) {
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

    const isAdminActionRequest = path.startsWith("/admin") && request.method !== "GET";
    const isServerActionRequest = Boolean(request.headers.get("next-action"));

    // Server actions and admin POSTs: session has been refreshed above.
    // Return supabaseResponse (not an early exit before getUser) so cookies
    // are always propagated. Skip redirect logic — actions do their own checks.
    if (isAdminActionRequest || isServerActionRequest) {
      return supabaseResponse;
    }

    if (user && isInviteOnlyModeEnabled()) {
      const access = await evaluateInviteOnlyAccess(supabase, user);
      const inviteGatePaths =
        isProtectedApp || path.startsWith("/post-login") || path.startsWith("/signup");
      console.log("[middleware] invite-gate", {
        path,
        allowed: access.allowed,
        isAdmin: access.isAdmin,
        inviteStatus: access.inviteStatus,
        inviteGatePaths,
      });
      if (!access.allowed && inviteGatePaths && !path.startsWith("/api/auth/signout")) {
        console.log("[middleware] invite-gate BLOCKING");
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
