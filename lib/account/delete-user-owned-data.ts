import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Removes rows that reference this profile so auth.admin.deleteUser can succeed.
 * Uses service-role Supabase client (bypasses RLS). Mirrors `delete_own_account_data` SQL.
 */
export async function deleteUserOwnedData(
  admin: SupabaseClient,
  profileId: string
): Promise<{ error: string | null }> {
  const err = async (message: string) => ({ error: message });

  const { error: e1 } = await admin
    .from("learning_sessions")
    .delete()
    .eq("initiated_by", profileId);
  if (e1) return err(e1.message);

  const { data: soloRows, error: eSolo } = await admin
    .from("students")
    .select("id")
    .eq("profile_id", profileId);
  if (eSolo) return err(eSolo.message);

  const soloIds = (soloRows ?? []).map((r) => r.id as string);
  if (soloIds.length > 0) {
    const { error: e2 } = await admin
      .from("learning_sessions")
      .delete()
      .in("student_id", soloIds);
    if (e2) return err(e2.message);

    const { error: e3 } = await admin
      .from("submissions")
      .delete()
      .in("student_id", soloIds);
    if (e3) return err(e3.message);

    const { error: e4 } = await admin
      .from("progress_snapshots")
      .delete()
      .in("student_id", soloIds);
    if (e4) return err(e4.message);

    const { error: e5 } = await admin
      .from("ai_artifacts")
      .delete()
      .in("student_id", soloIds);
    if (e5) return err(e5.message);

    const { error: e6 } = await admin
      .from("ai_interactions")
      .delete()
      .in("student_id", soloIds);
    if (e6) return err(e6.message);
  }

  const { error: e7 } = await admin
    .from("students")
    .delete()
    .eq("profile_id", profileId);
  if (e7) return err(e7.message);

  const { error: e8 } = await admin
    .from("parental_consents")
    .delete()
    .eq("consenting_adult", profileId);
  if (e8) return err(e8.message);

  const { error: e9 } = await admin
    .from("assignments")
    .delete()
    .eq("created_by", profileId);
  if (e9) return err(e9.message);

  const { error: e10 } = await admin
    .from("invitations")
    .delete()
    .eq("invited_by", profileId);
  if (e10) return err(e10.message);

  const { error: e11 } = await admin
    .from("audit_logs")
    .delete()
    .eq("actor_id", profileId);
  if (e11) return err(e11.message);

  const { error: e12 } = await admin.from("events").delete().eq("actor_id", profileId);
  if (e12) return err(e12.message);

  const { error: e13 } = await admin
    .from("platform_roles")
    .update({ granted_by: null })
    .eq("granted_by", profileId);
  if (e13) return err(e13.message);

  return { error: null };
}
