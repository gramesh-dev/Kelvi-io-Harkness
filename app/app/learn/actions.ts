"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createSession(formData: FormData) {
  const studentId = formData.get("studentId") as string;
  const mode = formData.get("mode") as string;
  const topic = formData.get("topic") as string;

  if (!studentId || !mode) {
    return { error: "Student and mode are required" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: memberships } = await supabase
    .from("org_memberships")
    .select("org_id, organizations(type)")
    .eq("profile_id", user.id)
    .eq("is_active", true);

  const familyOrg = memberships?.find(
    (m: any) => m.organizations?.type === "family"
  );

  if (!familyOrg) {
    return { error: "No family organization found" };
  }

  const { data: session, error } = await supabase
    .from("learning_sessions")
    .insert({
      student_id: studentId,
      org_id: familyOrg.org_id,
      initiated_by: user.id,
      mode,
      topic: topic?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/app/learn/${session.id}`);
}
