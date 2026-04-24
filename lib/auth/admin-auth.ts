import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient, createClientFromRequest } from "@/lib/supabase/server";
import { isPlatformAdmin, normalizeEmail } from "@/lib/auth/invite-only";
import {
  hasRealSupabasePublicConfig,
  normalizeSupabaseProjectUrl,
} from "@/lib/supabase/public-env";

export type PlatformAdminAuthOk = {
  ok: true;
  user: User;
  email: string;
};

/** Temporary production diagnostics (no cookie values or tokens). */
export type AdminAuthFailureDebug = {
  route: string;
  hasCookieHeader: boolean;
  cookieNames: string[];
  supabaseCookieNames: string[];
  getUserEmail: string | null;
  getUserError: string | null;
  usesSameAdminHelper: true;
};

export type PlatformAdminAuthFail = {
  ok: false;
  status: 401 | 403 | 503;
  code:
    | "not-authenticated"
    | "not-platform-admin"
    | "misconfigured_public_env"
    | "placeholder_session_cookies";
  /** Set for misconfiguration / cookie mismatch so API routes can return it verbatim. */
  message?: string;
  debug?: AdminAuthFailureDebug;
};

export type PlatformAdminAuthResult = PlatformAdminAuthOk | PlatformAdminAuthFail;

export type GetCurrentPlatformAdminOptions = {
  /** When set, Supabase reads cookies from this request (Route Handlers / Vercel). */
  request?: NextRequest;
  /** When set and auth fails, response includes `debug` (temporary). */
  debugRoute?: string;
};

async function buildFailureDebug(
  route: string,
  request: NextRequest | undefined,
  getUserEmail: string | null,
  getUserError: string | null
): Promise<AdminAuthFailureDebug> {
  const hasCookieHeader = request
    ? Boolean(request.headers.get("cookie"))
    : Boolean((await headers()).get("cookie"));
  const all = request ? request.cookies.getAll() : (await cookies()).getAll();
  const cookieNames = all.map((c) => c.name);
  const supabaseCookieNames = cookieNames.filter((n) => n.startsWith("sb-"));
  return {
    route,
    hasCookieHeader,
    cookieNames,
    supabaseCookieNames,
    getUserEmail,
    getUserError,
    usesSameAdminHelper: true,
  };
}

function onlyPlaceholderSupabaseCookies(supabaseCookieNames: string[]): boolean {
  if (supabaseCookieNames.length === 0) return false;
  return supabaseCookieNames.every((n) => n.includes("placeholder"));
}

function expectedSessionCookiePrefix(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    const host = new URL(normalizeSupabaseProjectUrl(raw)).hostname;
    const ref = host.split(".")[0];
    return ref ? `sb-${ref}-` : null;
  } catch {
    return null;
  }
}

/**
 * Canonical platform-admin check for server code (RSC, Route Handlers).
 * Uses auth.getUser() only — never getSession() for authorization. No redirects.
 *
 * In Route Handlers on Vercel, pass `{ request }` so cookies are read from the
 * incoming `NextRequest` (same source the browser sent). RSC pages call with no
 * args (`createClient()` + `cookies()`).
 */
export async function getCurrentPlatformAdmin(
  options?: GetCurrentPlatformAdminOptions
): Promise<PlatformAdminAuthResult> {
  const request = options?.request;
  const debugRoute = options?.debugRoute;

  if (!hasRealSupabasePublicConfig()) {
    const msg =
      "This server is missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY (or publishable key). Add them for this Vercel environment (including Preview), then redeploy.";
    const base = {
      ok: false as const,
      status: 503 as const,
      code: "misconfigured_public_env" as const,
      message: msg,
    };
    return debugRoute
      ? { ...base, debug: await buildFailureDebug(debugRoute, request, null, null) }
      : base;
  }

  const supabase = request ? createClientFromRequest(request) : await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const getUserError = error?.message ?? null;
  const getUserEmail = user?.email ?? null;

  if (error || !user) {
    const debug = debugRoute ? await buildFailureDebug(debugRoute, request, getUserEmail, getUserError) : undefined;
    const mismatch =
      debug &&
      onlyPlaceholderSupabaseCookies(debug.supabaseCookieNames) &&
      getUserError === "Auth session missing!";
    if (mismatch) {
      const prefix = expectedSessionCookiePrefix();
      const msg =
        "Your browser only has Supabase cookies from a placeholder build (sb-placeholder-*), not a real session (sb-<project-ref>-auth-token.*). In Vercel: enable NEXT_PUBLIC_SUPABASE_URL and the anon/publishable key for Preview and Production, redeploy, then clear site data for this origin and sign in again.";
      const base = {
        ok: false as const,
        status: 401 as const,
        code: "placeholder_session_cookies" as const,
        message: prefix ? `${msg} Expected cookie prefix: ${prefix}` : msg,
      };
      return debug ? { ...base, debug } : base;
    }
    const base = { ok: false as const, status: 401 as const, code: "not-authenticated" as const };
    return debug ? { ...base, debug } : base;
  }

  const email = normalizeEmail(user.email ?? "");
  if (!email) {
    const base = { ok: false as const, status: 401 as const, code: "not-authenticated" as const };
    return debugRoute
      ? {
          ...base,
          debug: await buildFailureDebug(debugRoute, request, null, getUserError),
        }
      : base;
  }

  const admin = await isPlatformAdmin(supabase, user.id, email);
  if (!admin) {
    const base = { ok: false as const, status: 403 as const, code: "not-platform-admin" as const };
    return debugRoute
      ? { ...base, debug: await buildFailureDebug(debugRoute, request, email, null) }
      : base;
  }

  return { ok: true, user, email };
}
