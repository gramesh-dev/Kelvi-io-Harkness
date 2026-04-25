/** Rows from org_memberships + nested organizations(type). */
export type MembershipRow = {
  role: string;
  organizations: { type: string } | null;
};

/**
 * Primary home path after login. Priority: school (staff) → family → solo.
 * Internal roles differ from student records; UI can say "learner" for solo.
 */
export function resolvePrimaryHomePath(
  memberships: MembershipRow[] | null | undefined
): string {
  const list = memberships ?? [];
  if (list.length === 0) return "/onboarding";

  const schoolStaff = list.find(
    (m) =>
      m.organizations?.type === "school" &&
      (m.role === "school_admin" || m.role === "teacher")
  );
  if (schoolStaff) return "/school";

  const family = list.find((m) => m.organizations?.type === "family");
  if (family) return "/family";

  const solo = list.find(
    (m) => m.organizations?.type === "solo" && m.role === "solo_learner"
  );
  if (solo) return "/solo";

  return "/onboarding";
}

export function hasFamilyAccess(m: MembershipRow[] | null | undefined) {
  return (m ?? []).some((x) => x.organizations?.type === "family");
}

export function hasSchoolAccess(m: MembershipRow[] | null | undefined) {
  return (m ?? []).some(
    (x) =>
      x.organizations?.type === "school" &&
      (x.role === "school_admin" || x.role === "teacher")
  );
}

export function hasSoloAccess(m: MembershipRow[] | null | undefined) {
  return (m ?? []).some(
    (x) => x.organizations?.type === "solo" && x.role === "solo_learner"
  );
}
