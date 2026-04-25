import { createServiceClient } from "@/lib/supabase/service";
import { normalizeEmail } from "@/lib/auth/invite-only";

export async function recordInviteOnlyLogin(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const admin = createServiceClient();
  const { data } = await admin
    .from("beta_access_invites")
    .select("status, accepted_at, login_count")
    .eq("email", normalized)
    .maybeSingle();

  if (!data || data.status === "revoked") {
    return;
  }

  const nowIso = new Date().toISOString();
  await admin
    .from("beta_access_invites")
    .update({
      status: "accepted",
      accepted_at: data.accepted_at ?? nowIso,
      last_login_at: nowIso,
      login_count: (data.login_count ?? 0) + 1,
    })
    .eq("email", normalized);
}
