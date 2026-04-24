import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient, createClientFromRequest } from "@/lib/supabase/server";
import { isPlatformAdmin, normalizeEmail } from "@/lib/auth/invite-only";

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
  status: 401 | 403;
  code: "not-authenticated" | "not-platform-admin";
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
  const supabase = request ? createClientFromRequest(request) : await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const getUserError = error?.message ?? null;
  const getUserEmail = user?.email ?? null;

  if (error || !user) {
    const base = { ok: false as const, status: 401 as const, code: "not-authenticated" as const };
    return debugRoute
      ? {
          ...base,
          debug: await buildFailureDebug(debugRoute, request, getUserEmail, getUserError),
        }
      : base;
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
