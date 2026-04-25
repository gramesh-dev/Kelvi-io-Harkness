import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicCredentials } from "./public-env";
import {
  evaluateInviteOnlyAccess,
  isInviteOnlyModeEnabled,
} from "@/lib/auth/invite-only";
import {
  logFamilyToLoginDebug,
  pickSupabaseCookieNames,
  safeGetUserErrorMessage,
} from "@/lib/auth/family-to-login-debug";

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

    const { data, error: getUserError } = await supabase.auth.getUser();
    user = data.user;

    const path = request.nextUrl.pathname;

    /** Static marketing / preview HTML — not the Next app under `/school` or `/family`. */
    const isPublicMarketingShell =
      path === "/school/index.html" || path === "/family/index.html";

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

    // Next.js Server Actions (next-action): refresh cookies only; no invite-gate redirects.
    const isServerActionRequest = Boolean(request.headers.get("next-action"));
    if (isServerActionRequest) {
      return supabaseResponse;
    }

    // Keep /school/index.html as the static marketing preview even when signed in
    // (platform admins often have no school org; Next /school layout would bounce them).

    if (user && path === "/student/index.html" && !request.nextUrl.searchParams.has("app")) {
      return redirectWithCookies("/solo");
    }

    const isAuthEntry =
      path.startsWith("/login") ||
      path.startsWith("/signup") ||
      path.startsWith("/forgot-password");

    const isPublicFamilyGalaxy = path === "/family/family.html";

    const isProtectedApp =
      !isPublicMarketingShell &&
      (path.startsWith("/family") ||
        path.startsWith("/school") ||
        path.startsWith("/admin") ||
        path.startsWith("/solo") ||
        path.startsWith("/student") ||
        path.startsWith("/role-setup") ||
        path.startsWith("/post-login"));

    if (user && isInviteOnlyModeEnabled()) {
      const access = await evaluateInviteOnlyAccess(supabase, user);
      const inviteGatePaths =
        isProtectedApp || path.startsWith("/post-login") || path.startsWith("/signup");
      if (!access.allowed && inviteGatePaths && !path.startsWith("/api/auth/signout")) {
        return redirectWithCookies("/api/auth/signout", { next: "/login?invite=required" });
      }
    }

    if (!user && isProtectedApp && !isPublicFamilyGalaxy) {
      if (path.startsWith("/family")) {
        logFamilyToLoginDebug({
          route: "/family",
          stage: "proxy",
          hasCookieHeader: Boolean(request.headers.get("cookie")),
          supabaseCookieNames: pickSupabaseCookieNames(request.cookies.getAll()),
          getUserEmail: null,
          getUserError: safeGetUserErrorMessage(getUserError),
          redirectReason: "middleware-no-user-on-family-route",
        });
      }
      return redirectWithCookies("/login", path !== "/login" ? { next: path } : undefined);
    }

    if (user && isAuthEntry) {
      const intent = request.nextUrl.searchParams.get("intent");
      // Already signed in: product intents go to previews / demo — not /post-login (admins
      // would loop back to /admin; school/family Next layouts also require org membership).
      if (intent === "school") {
        return redirectWithCookies("/school/index.html");
      }
      if (intent === "family") {
        return redirectWithCookies("/family/index.html");
      }
      if (intent === "student") {
        return redirectWithCookies("/student/dashboard");
      }
      return redirectWithCookies("/post-login");
    }

    return supabaseResponse;
  } catch (e) {
    console.error("[middleware] updateSession fatal:", e);
    return NextResponse.next({ request });
  }
}
