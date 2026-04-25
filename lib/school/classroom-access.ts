import type { SupabaseClient } from "@supabase/supabase-js";

export type ClassroomRow = {
  id: string;
  org_id: string;
  name: string;
  grade_level: string | null;
  subject: string | null;
  academic_year: string | null;
};

/**
 * Classroom exists, is active, and the user may manage rosters: lead/other teacher on the class
 * or school_admin for the same org.
 */
export async function getClassroomForStaff(
  supabase: SupabaseClient,
  userId: string,
  classId: string
): Promise<ClassroomRow | null> {
  const { data: classroom, error } = await supabase
    .from("classrooms")
    .select("id, org_id, name, grade_level, subject, academic_year")
    .eq("id", classId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !classroom) return null;

  const { data: teaches } = await supabase
    .from("classroom_teachers")
    .select("id")
    .eq("classroom_id", classId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (teaches) return classroom as ClassroomRow;

  const { data: admin } = await supabase
    .from("org_memberships")
    .select("id")
    .eq("org_id", classroom.org_id)
    .eq("profile_id", userId)
    .eq("is_active", true)
    .eq("role", "school_admin")
    .maybeSingle();

  if (admin) return classroom as ClassroomRow;

  return null;
}
