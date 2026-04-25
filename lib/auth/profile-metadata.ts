import { createServiceClient } from "@/lib/supabase/service";
import {
  KELVI_ROLE_SETUP_METADATA_KEY,
} from "@/lib/auth/role-setup";

/** Persists that the user finished `/role-setup` (school, family, or student path). */
export async function markKelviRoleSetupComplete(
  userId: string
): Promise<{ error?: string }> {
  const admin = createServiceClient();
  const { data: profile, error: fetchError } = await admin
    .from("profiles")
    .select("metadata")
    .eq("id", userId)
    .single();

  if (fetchError) {
    return { error: fetchError.message };
  }

  const meta = (profile?.metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin.from("profiles").update({
    metadata: { ...meta, [KELVI_ROLE_SETUP_METADATA_KEY]: true },
  })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }
  return {};
}
