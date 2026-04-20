import { createClient } from "@/lib/supabase/server";
import {
  resolvePrimaryHomePath,
  type MembershipRow,
} from "@/lib/auth/home-path";

/** Map internal home paths to URLs (Next routes + static shells in `public/`). */
export function mapHomePathToDashboardUrl(internal: string): string {
  switch (internal) {
    case "/school":
      return "/school/index.html";
    case "/family":
      return "/family";
    case "/solo":
      return "/student/index.html";
    default:
      return "/role-setup";
  }
}

/**
 * Where to send the user after OAuth or email sign-in.
 * - Has org membership → school / family (or solo → student shell)
 * - Marked student learner in profile metadata → student shell
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("id", user.id)
    .maybeSingle();

  const meta = (profile?.metadata ?? {}) as Record<string, unknown>;
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

  if (segment === "student") {
    return "/student/index.html";
  }

  return "/role-setup";
}
