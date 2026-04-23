import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClassroomForStaff } from "@/lib/school/classroom-access";
import { RosterInviteForm } from "@/app/school/classes/[classId]/roster-invite-form";
import { TeacherAssignmentsDemo } from "@/components/demo/teacher-assignments-demo";

type RosterStudent = {
  id: string;
  full_name: string;
  display_name: string | null;
  grade_level: string | null;
};

type RosterRow = {
  assigned_at: string;
  students: RosterStudent | RosterStudent[] | null;
};

function normalizeStudent(rel: RosterRow["students"]): RosterStudent | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export default async function SchoolClassDetailPage(props: { params: Promise<{ classId: string }> }) {
  const { classId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const classroom = await getClassroomForStaff(supabase, user.id, classId);
  if (!classroom) notFound();

  const { data: rosterRows, error: rosterErr } = await supabase
    .from("classroom_students")
    .select(
      "assigned_at, students ( id, full_name, display_name, grade_level )"
    )
    .eq("classroom_id", classId)
    .order("assigned_at", { ascending: true });

  const rosterRaw: RosterRow[] = rosterErr || !rosterRows ? [] : (rosterRows as RosterRow[]);
  const roster = rosterRaw
    .map((r) => ({ assigned_at: r.assigned_at, student: normalizeStudent(r.students) }))
    .filter((r): r is { assigned_at: string; student: RosterStudent } => r.student !== null);

  const { data: pendingInvites } = await supabase
    .from("classroom_roster_invites")
    .select("parent_email, child_full_name, created_at, expires_at")
    .eq("classroom_id", classId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const metaLine = [classroom.grade_level, classroom.subject, classroom.academic_year]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-12">
      <div>
        <Link
          href="/school/classes"
          className="text-lg font-medium text-kelvi-teal hover:text-kelvi-teal-hover"
        >
          ← All classes
        </Link>
        <h2 className="mt-5 font-serif text-3xl text-kelvi-school-ink md:text-4xl">{classroom.name}</h2>
        {metaLine ? (
          <p className="mt-2 text-xl text-kelvi-school-ink/75">{metaLine}</p>
        ) : null}
      </div>

      <section className="space-y-4">
        <h3 className="text-2xl font-semibold text-kelvi-school-ink md:text-3xl">Roster</h3>
        {roster.length === 0 ? (
          <p className="text-xl leading-relaxed text-kelvi-school-ink/75">
            No students on the roster yet. When families accept your invitations below, they appear
            here.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            {roster.map((row) => {
              const s = row.student;
              const label = s.display_name?.trim() || s.full_name;
              return (
                <li key={s.id} className="flex flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6">
                  <div>
                    <p className="text-xl font-medium text-kelvi-school-ink">{label}</p>
                    {s.display_name?.trim() ? (
                      <p className="mt-0.5 text-lg text-kelvi-school-ink/60">{s.full_name}</p>
                    ) : null}
                  </div>
                  {s.grade_level ? (
                    <span className="text-lg text-kelvi-school-ink/65">Grade {s.grade_level}</span>
                  ) : (
                    <span className="text-lg text-kelvi-school-ink/40">—</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pendingInvites && pendingInvites.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-xl font-semibold text-kelvi-school-ink">Pending invitations</h3>
          <ul className="divide-y divide-border rounded-xl border border-dashed border-border bg-surface/80">
            {pendingInvites.map((inv) => (
              <li key={`${inv.parent_email}-${inv.child_full_name}-${inv.created_at}`} className="px-4 py-3 text-base text-kelvi-school-ink/85">
                <span className="font-medium">{inv.child_full_name}</span>
                <span className="text-kelvi-school-ink/60"> → {inv.parent_email}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <h3 className="text-2xl font-semibold text-kelvi-school-ink md:text-3xl">Invite a student</h3>
        <p className="max-w-3xl text-xl leading-relaxed text-kelvi-school-ink/80">
          Students join only by invitation. Enter the parent or guardian&apos;s email and the
          student&apos;s name. We&apos;ll give you a link to send them — they sign in with that
          email and accept to add their child to this class.
        </p>
        <div className="max-w-2xl rounded-2xl border border-border bg-surface/80 p-6 md:p-8">
          <RosterInviteForm classroomId={classId} />
        </div>
      </section>

      <TeacherAssignmentsDemo classId={classId} className={classroom.name} />
    </div>
  );
}
