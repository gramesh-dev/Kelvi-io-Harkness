import { StudentDemoAssignment } from "@/components/student/student-demo-assignment";

type Search = Promise<{ classId?: string }>;

export default async function StudentAssignmentPage(props: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Search;
}) {
  const { assignmentId } = await props.params;
  const sp = await props.searchParams;
  const classId = sp.classId;

  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 py-8 sm:px-8">
      <StudentDemoAssignment classId={classId} assignmentId={assignmentId} />
    </div>
  );
}
