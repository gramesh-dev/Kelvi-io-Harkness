"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function addChild(formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const displayName = formData.get("displayName") as string;
  const gradeLevel = formData.get("gradeLevel") as string;
  const dateOfBirth = formData.get("dateOfBirth") as string;

  if (!fullName?.trim()) {
    return { error: "Child's name is required" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: memberships } = await supabase
    .from("org_memberships")
    .select("org_id, role, organizations(type)")
    .eq("profile_id", user.id)
    .eq("is_active", true);

  const familyOrg = memberships?.find(
    (m: any) => m.organizations?.type === "family"
  );

  if (!familyOrg) {
    return { error: "No family organization found. Complete onboarding first." };
  }

  const { data, error } = await supabase.rpc("create_student", {
    p_org_id: familyOrg.org_id,
    p_full_name: fullName.trim(),
    p_display_name: displayName?.trim() || null,
    p_date_of_birth: dateOfBirth || null,
    p_grade_level: gradeLevel?.trim() || null,
    p_relationship: "parent",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/family");
  revalidatePath("/family/children");
  return { studentId: data };
}

export async function updateChild(studentId: string, formData: FormData) {
  if (!studentId) {
    return { error: "Missing student" };
  }

  const fullName = (formData.get("fullName") as string)?.trim();
  const displayName = (formData.get("displayName") as string)?.trim();
  const gradeLevel = (formData.get("gradeLevel") as string)?.trim();
  const rawDob = formData.get("dateOfBirth") as string;
  const dateOfBirth = rawDob?.trim() ? rawDob.trim() : null;

  if (!fullName) {
    return { error: "Full name is required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("students")
    .update({
      full_name: fullName,
      display_name: displayName || null,
      grade_level: gradeLevel || null,
      date_of_birth: dateOfBirth,
    })
    .eq("id", studentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/family");
  revalidatePath("/family/children");
  return { success: true };
}

async function userMayRemoveStudent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  studentId: string
): Promise<boolean> {
  const { data: pa } = await supabase
    .from("platform_roles")
    .select("id")
    .eq("profile_id", userId)
    .eq("role", "platform_admin")
    .maybeSingle();
  if (pa) return true;

  const { data: guardian } = await supabase
    .from("student_guardians")
    .select("id")
    .eq("student_id", studentId)
    .eq("guardian_id", userId)
    .maybeSingle();
  if (guardian) return true;

  const { data: soa } = await supabase
    .from("student_org_assignments")
    .select("org_id")
    .eq("student_id", studentId);
  const orgIds = soa?.map((r) => r.org_id) ?? [];
  if (orgIds.length === 0) return false;

  const { data: mem } = await supabase
    .from("org_memberships")
    .select("id")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .in("org_id", orgIds)
    .in("role", ["school_admin", "family_admin"]);
  return (mem?.length ?? 0) > 0;
}

/** Hard-delete child and dependent rows (FKs on students are not all ON DELETE CASCADE). */
export async function removeChild(studentId: string) {
  if (!studentId) {
    return { error: "Missing student" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const allowed = await userMayRemoveStudent(supabase, user.id, studentId);
  if (!allowed) {
    return { error: "You are not allowed to remove this child." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      error:
        "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is required to remove a child.",
    };
  }

  const admin = createServiceClient();

  const { data: sessions } = await admin
    .from("learning_sessions")
    .select("id")
    .eq("student_id", studentId);
  const sessionIds = sessions?.map((s) => s.id) ?? [];

  await admin
    .from("learning_sessions")
    .update({ summary_artifact_id: null })
    .eq("student_id", studentId);

  if (sessionIds.length > 0) {
    await admin.from("session_messages").delete().in("session_id", sessionIds);
  }

  await admin.from("learning_sessions").delete().eq("student_id", studentId);

  await admin.from("submissions").delete().eq("student_id", studentId);
  await admin.from("progress_snapshots").delete().eq("student_id", studentId);

  await admin.from("ai_interactions").delete().eq("student_id", studentId);
  if (sessionIds.length > 0) {
    await admin.from("ai_interactions").delete().in("session_id", sessionIds);
  }

  await admin.from("ai_artifacts").delete().eq("student_id", studentId);
  await admin.from("events").delete().eq("student_id", studentId);

  const { error } = await admin.from("students").delete().eq("id", studentId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/family");
  revalidatePath("/family/children");
  return { success: true };
}
