/** Set on `profiles.metadata` when the user finishes `/role-setup` (any path). */
export const KELVI_ROLE_SETUP_METADATA_KEY = "kelvi_completed_role_setup" as const;

export function hasCompletedKelviRoleSetup(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return metadata?.[KELVI_ROLE_SETUP_METADATA_KEY] === true;
}
