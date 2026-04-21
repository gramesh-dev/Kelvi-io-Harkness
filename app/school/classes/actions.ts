"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateClassFormState = { error?: string } | undefined;

/**
 * Create a classroom in the teacher's school org and link the caller as lead teacher.
 * Use with useFormState — on success redirects to classes list.
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

  const { data: created, error: insertErr } = await supabase
    .from("classrooms")
    .insert({
      org_id: orgId,
      name,
      grade_level: gradeLevel,
      subject,
      academic_year: academicYear,
    })
    .select("id")
    .single();

  if (insertErr || !created) {
    return { error: insertErr?.message ?? "Could not create class." };
  }

  const { error: linkErr } = await supabase.from("classroom_teachers").insert({
    classroom_id: created.id,
    profile_id: user.id,
  });

  if (linkErr) {
    return {
      error:
        linkErr.message +
        " Class may exist but you are not linked as teacher yet — ask a school admin.",
    };
  }

  revalidatePath("/school");
  revalidatePath("/school/classes");
  redirect(`/school/classes?created=${encodeURIComponent(created.id)}`);
}
