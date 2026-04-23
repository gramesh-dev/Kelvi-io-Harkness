import { createClient } from "@/lib/supabase/server";
import {
  resolvePrimaryHomePath,
  type MembershipRow,
} from "@/lib/auth/home-path";
import { hasCompletedKelviRoleSetup } from "@/lib/auth/role-setup";
import {
  evaluateInviteOnlyAccess,
  isInviteOnlyModeEnabled,
  isPlatformAdmin,
} from "@/lib/auth/invite-only";
import { recordInviteOnlyLogin } from "@/lib/auth/invite-only-server";

/** Map internal home paths to URLs (Next routes + static shells in `public/`). */
export function mapHomePathToDashboardUrl(internal: string): string {
  switch (internal) {
    case "/school":
      // Next.js app route (`app/school`) — real session + avoids redirect loop with `/login`.
      return "/school";
    case "/family":
      return "/family";
    case "/solo":
      return "/solo";
    default:
      return "/role-setup";
  }
}

/**
 * Where to send the user after OAuth or email sign-in.
 * - Has org membership → school / family / solo (Next app routes)
 * - Student segment but no org yet → role-setup (not static `student/index.html`)
 * - Otherwise → role + org wizard
 */
export async function getPostAuthRedirectPath(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/login";
  }

  let isPlatformAdminUser = await isPlatformAdmin(supabase, user.id, user.email ?? null);
  if (isInviteOnlyModeEnabled()) {
    const access = await evaluateInviteOnlyAccess(supabase, user);
    if (!access.allowed) {
      await supabase.auth.signOut();
      return "/login?invite=required";
    }
    isPlatformAdminUser = access.isAdmin || isPlatformAdminUser;
    if (!access.isAdmin && user.email) {
      await recordInviteOnlyLogin(user.email);
    }
  }

  if (isPlatformAdminUser) {
    return "/admin";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("id", user.id)
    .maybeSingle();

  const meta = (profile?.metadata ?? {}) as Record<string, unknown>;

  if (!hasCompletedKelviRoleSetup(meta)) {
    return "/role-setup";
  }

  const segment = meta.kelvi_segment as string | undefined;

  const { data: memberships } = await supabase
    .from("org_memberships")
    .select("role, organizations(type)")
    .eq("profile_id", user.id);

  const rows = (memberships ?? []) as unknown as MembershipRow[];
  const primary = resolvePrimaryHomePath(rows);

  if (primary !== "/onboarding") {
    return mapHomePathToDashboardUrl(primary);
  }

  // Segment set but no org (shouldn't happen after role-setup) — finish provisioning.
  if (segment === "student") {
    return "/role-setup";
  }

  return "/role-setup";
}
