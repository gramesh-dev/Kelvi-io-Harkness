export type DemoAssignmentStatus = "draft" | "published" | "closed";
export type DemoStudentWorkStatus = "assigned" | "in_progress" | "submitted" | "returned";

export type DemoAssignment = {
  id: string;
  title: string;
  status: DemoAssignmentStatus;
  dueAtIso: string;
  submissionStats: {
    submitted: number;
    late: number;
    pending: number;
    total: number;
  };
};

export type DemoStudentTask = {
  assignmentId: string;
  title: string;
  classId: string;
  className: string;
  dueAtIso: string;
  status: DemoStudentWorkStatus;
};

export type DemoSubmission = {
  assignmentId: string;
  studentName: string;
  status: DemoStudentWorkStatus;
  submittedAtIso?: string;
  late?: boolean;
};

export type DemoAssignmentBundle = {
  classId: string;
  className: string;
  assignments: DemoAssignment[];
  studentTasks: DemoStudentTask[];
  submissions: DemoSubmission[];
  createdAtIso: string;
};

function isoAfterHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function createDemoAssignmentBundle(
  classId: string,
  className: string
): DemoAssignmentBundle {
  const assignments: DemoAssignment[] = [
    {
      id: "fractions-practice",
      title: "Fractions Practice",
      status: "published",
      dueAtIso: isoAfterHours(30),
      submissionStats: { submitted: 18, late: 3, pending: 3, total: 24 },
    },
    {
      id: "linear-equations-quiz",
      title: "Linear Equations Quiz",
      status: "published",
      dueAtIso: isoAfterHours(-12),
      submissionStats: { submitted: 24, late: 0, pending: 0, total: 24 },
    },
    {
      id: "geometry-worksheet",
      title: "Geometry Worksheet",
      status: "draft",
      dueAtIso: isoAfterHours(72),
      submissionStats: { submitted: 0, late: 0, pending: 24, total: 24 },
    },
  ];

  const studentTasks: DemoStudentTask[] = [
    {
      assignmentId: "fractions-practice",
      title: "Fractions Practice",
      classId,
      className,
      dueAtIso: assignments[0].dueAtIso,
      status: "assigned",
    },
    {
      assignmentId: "linear-equations-quiz",
      title: "Linear Equations Quiz",
      classId,
      className,
      dueAtIso: assignments[1].dueAtIso,
      status: "submitted",
    },
    {
      assignmentId: "geometry-worksheet",
      title: "Geometry Worksheet",
      classId,
      className,
      dueAtIso: assignments[2].dueAtIso,
      status: "in_progress",
    },
  ];

  const submissions: DemoSubmission[] = [
    {
      assignmentId: "fractions-practice",
      studentName: "Jordan Smith",
      status: "submitted",
      submittedAtIso: isoAfterHours(-2),
      late: false,
    },
    {
      assignmentId: "fractions-practice",
      studentName: "Maya Patel",
      status: "in_progress",
    },
    {
      assignmentId: "fractions-practice",
      studentName: "Arjun Rao",
      status: "assigned",
    },
    {
      assignmentId: "linear-equations-quiz",
      studentName: "Jordan Smith",
      status: "returned",
      submittedAtIso: isoAfterHours(-36),
      late: false,
    },
  ];

  return {
    classId,
    className,
    assignments,
    studentTasks,
    submissions,
    createdAtIso: new Date().toISOString(),
  };
}
