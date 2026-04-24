import type { SupabaseClient, User } from "@supabase/supabase-js";

export const BETA_ALLOWED_ROLES = ["family", "school", "individual"] as const;
export type BetaAllowedRole = (typeof BETA_ALLOWED_ROLES)[number];
export type BetaInviteStatus = "pending" | "accepted" | "revoked";

type InviteAccessEvaluation = {
  allowed: boolean;
  isAdmin: boolean;
  inviteStatus: BetaInviteStatus | null;
};

function enabledValue(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isInviteOnlyModeEnabled(): boolean {
  return enabledValue(
    process.env.INVITE_ONLY_MODE ?? process.env.NEXT_PUBLIC_INVITE_ONLY_MODE
  );
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getBootstrapAdminEmails(): string[] {
  const raw = process.env.INVITE_ONLY_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((x) => normalizeEmail(x))
    .filter(Boolean);
}

export function isBootstrapAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getBootstrapAdminEmails().includes(normalizeEmail(email));
}

export async function isPlatformAdmin(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<boolean> {
  const adminEmailsParsed = getBootstrapAdminEmails();
  const userEmail = normalizeEmail(email ?? "");
  const isBootstrap = adminEmailsParsed.includes(userEmail);

  if (isBootstrap) {
    return true;
  }

  const { data } = await supabase
    .from("platform_roles")
    .select("id")
    .eq("profile_id", userId)
    .eq("role", "platform_admin")
    .maybeSingle();

  return Boolean(data);
}

export async function evaluateInviteOnlyAccess(
  supabase: SupabaseClient,
  user: User
): Promise<InviteAccessEvaluation> {
  if (!isInviteOnlyModeEnabled()) {
    return { allowed: true, isAdmin: false, inviteStatus: null };
  }

  const email = normalizeEmail(user.email ?? "");
  if (!email) {
    return { allowed: false, isAdmin: false, inviteStatus: null };
  }

  const admin = await isPlatformAdmin(supabase, user.id, email);
  if (admin) {
    return { allowed: true, isAdmin: true, inviteStatus: null };
  }

  const { data: invite } = await supabase
    .from("beta_access_invites")
    .select("status")
    .eq("email", email)
    .maybeSingle();

  const status = (invite?.status ?? null) as BetaInviteStatus | null;
  const allowed = status === "pending" || status === "accepted";
  return { allowed, isAdmin: false, inviteStatus: status };
}
