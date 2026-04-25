import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClassroomForStaff } from "@/lib/school/classroom-access";

export default async function TeacherAssignmentDetailPage(props: {
  params: Promise<{ classId: string; assignmentId: string }>;
}) {
  const { classId, assignmentId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const classroom = await getClassroomForStaff(supabase, user.id, classId);
  if (!classroom) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/school/classes/${classId}`} className="text-kelvi-teal hover:underline">
          ← Back to class
        </Link>
        <h1 className="mt-3 font-serif text-3xl text-kelvi-school-ink md:text-4xl">
          Assignment detail (demo)
        </h1>
        <p className="text-lg text-kelvi-school-ink/70">
          This is a placeholder route for demo walkthroughs. Open student flow at
          <code className="ml-2 rounded bg-surface px-1.5 py-0.5 text-sm">/student/dashboard</code>.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-surface/80 p-5">
        <p className="text-sm uppercase tracking-wide text-kelvi-school-ink/60">Assignment ID</p>
        <p className="mt-1 text-lg text-kelvi-school-ink">{assignmentId}</p>
      </div>
    </div>
  );
}
