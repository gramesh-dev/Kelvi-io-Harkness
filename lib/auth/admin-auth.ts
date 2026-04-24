import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin, normalizeEmail } from "@/lib/auth/invite-only";
import type { User } from "@supabase/supabase-js";

export type PlatformAdminAuthOk = {
  ok: true;
  user: User;
  email: string;
};

export type PlatformAdminAuthFail = {
  ok: false;
  status: 401 | 403;
  code: "not-authenticated" | "not-platform-admin";
};

export type PlatformAdminAuthResult = PlatformAdminAuthOk | PlatformAdminAuthFail;

/**
 * Canonical platform-admin check for server code (RSC, Route Handlers).
 * Uses the Supabase SSR server client and auth.getUser() only — never getSession()
 * for authorization. No redirects.
 */
export async function getCurrentPlatformAdmin(): Promise<PlatformAdminAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, code: "not-authenticated" };
  }

  const email = normalizeEmail(user.email ?? "");
  if (!email) {
    return { ok: false, status: 401, code: "not-authenticated" };
  }

  const admin = await isPlatformAdmin(supabase, user.id, email);
  if (!admin) {
    return { ok: false, status: 403, code: "not-platform-admin" };
  }

  return { ok: true, user, email };
}
