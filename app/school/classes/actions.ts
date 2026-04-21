"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateClassFormState = { error?: string } | undefined;

const RLS_HINT =
  "If this persists, apply the migration `20260421120000_school_staff_create_classrooms.sql` in Supabase SQL Editor, or set SUPABASE_SERVICE_ROLE_KEY in .env.local (server-only) for inserts after verification.";

/**
 * Create a classroom in the teacher's school org and link the caller as lead teacher.
 *
 * Uses the session client when possible. If RLS blocks teachers (policies not migrated yet),
 * falls back to service-role inserts **only after** the same membership checks — same pattern as
 * onboarding/role-setup.
 */
export async function createClassroomAction(
  _prev: CreateClassFormState,
  formData: FormData
): Promise<CreateClassFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Class name is required." };
  }

  const gradeLevel = String(formData.get("grade_level") ?? "").trim() || null;
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const academicYear = String(formData.get("academic_year") ?? "").trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: memberships, error: memErr } = await supabase
    .from("org_memberships")
    .select("org_id, role, organizations(id, name, type)")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .in("role", ["school_admin", "teacher"]);

  if (memErr) {
    return { error: memErr.message };
  }

  const school = memberships?.find((m) => {
    const o = m.organizations as { type?: string } | { type?: string }[] | null | undefined;
    const t = Array.isArray(o) ? o[0]?.type : o?.type;
    return t === "school";
  });

  if (!school) {
    return { error: "No school membership found." };
  }

  const orgId = school.org_id as string;

  const row = {
    org_id: orgId,
    name,
    grade_level: gradeLevel,
    subject,
    academic_year: academicYear,
  };

  let created: { id: string } | null = null;
  let insertErr: { message: string } | null = null;

  const tryUser = await supabase.from("classrooms").insert(row).select("id").single();
  if (tryUser.data) {
    created = tryUser.data;
  } else {
    insertErr = tryUser.error;
  }

  const rlsBlocked =
    insertErr?.message?.includes("row-level security") ?? false;
  const canUseService =
    typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string" &&
    process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length > 0;

  if (!created && rlsBlocked && canUseService) {
    const admin = createServiceRoleClient();
    const retry = await admin.from("classrooms").insert(row).select("id").single();
    if (retry.data) {
      created = retry.data;
      insertErr = null;
    } else {
      insertErr = retry.error;
    }
  }

  if (!created) {
    const msg = insertErr?.message ?? "Could not create class.";
    if (msg.includes("row-level security")) {
      return { error: `${msg} ${RLS_HINT}` };
    }
    return { error: msg };
  }

  let linkErr = (
    await supabase.from("classroom_teachers").insert({
      classroom_id: created.id,
      profile_id: user.id,
    })
  ).error;

  if (linkErr?.message?.includes("row-level security") && canUseService) {
    linkErr = (
      await createServiceRoleClient().from("classroom_teachers").insert({
        classroom_id: created.id,
        profile_id: user.id,
      })
    ).error;
  }

  if (linkErr) {
    return {
      error: `${linkErr.message} ${RLS_HINT}`,
    };
  }

  revalidatePath("/school");
  revalidatePath("/school/classes");
  redirect(`/school/classes?created=${encodeURIComponent(created.id)}`);
}
