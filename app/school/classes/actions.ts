"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getClassroomForStaff } from "@/lib/school/classroom-access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateClassFormState = { error?: string } | undefined;

export type RosterInviteFormState =
  | { error?: string; ok?: boolean; inviteUrl?: string }
  | undefined;

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
  redirect(`/school/classes/${created.id}`);
}

/**
 * Invite-only roster: create a pending invite. Parent opens link, signs in with that email,
 * accepts — then student + SOA + roster + guardian row are created (see migration + RPC).
 */
export async function createRosterInviteAction(
  _prev: RosterInviteFormState,
  formData: FormData
): Promise<RosterInviteFormState> {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const parentEmail = String(formData.get("parent_email") ?? "").trim();
  const childFullName = String(formData.get("child_full_name") ?? "").trim();
  const childDisplayName = String(formData.get("child_display_name") ?? "").trim() || null;

  if (!classroomId) {
    return { error: "Missing class." };
  }
  if (!parentEmail) {
    return { error: "Parent or guardian email is required." };
  }
  if (!childFullName) {
    return { error: "Student name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const classroom = await getClassroomForStaff(supabase, user.id, classroomId);
  if (!classroom) {
    return { error: "Class not found or you do not have access." };
  }

  const { data: inviteId, error: rpcError } = await supabase.rpc("create_classroom_roster_invite", {
    p_classroom_id: classroomId,
    p_parent_email: parentEmail,
    p_child_full_name: childFullName,
    p_child_display_name: childDisplayName,
  });

  if (rpcError || !inviteId) {
    return { error: rpcError?.message ?? "Could not create invitation." };
  }

  const { data: row } = await supabase
    .from("classroom_roster_invites")
    .select("token")
    .eq("id", inviteId as string)
    .single();

  if (!row?.token) {
    return { error: "Invite created but could not load link. Refresh and try again." };
  }

  const rawBase =
    (typeof process.env.NEXT_PUBLIC_SITE_URL === "string" && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
    (typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL.trim()) ||
    "";
  const base = rawBase.replace(/\/$/, "");
  const inviteUrl =
    base.length > 0
      ? `${base}/roster-invite/${row.token}`
      : `/roster-invite/${row.token}`;

  revalidatePath("/school/classes");
  revalidatePath(`/school/classes/${classroomId}`);
  return { ok: true, inviteUrl };
}
