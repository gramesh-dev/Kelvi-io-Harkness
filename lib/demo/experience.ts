export const DEMO_ROLE_ORDER = ["family", "school", "individual"] as const;

export type DemoRole = (typeof DEMO_ROLE_ORDER)[number];

export type DemoRoleMeta = {
  label: string;
  shortDescription: string;
  landingTitle: string;
};

export type DemoJourneyStep = {
  id: string;
  title: string;
  description: string;
};

export type FamilyFixture = {
  householdName: string;
  children: Array<{
    id: string;
    name: string;
    grade: string;
    streakDays: number;
    upcomingAssignment: string;
    dueOn: string;
    momentumNote: string;
  }>;
  weeklyProgressPoints: number;
};

export type SchoolFixture = {
  campusName: string;
  teacherName: string;
  classes: Array<{
    id: string;
    name: string;
    rosterCount: number;
    activeAssignments: number;
    submissionsDueToday: number;
  }>;
  pendingInvites: Array<{
    studentName: string;
    parentEmail: string;
    invitedAt: string;
  }>;
};

export type IndividualFixture = {
  learnerName: string;
  gradeBand: string;
  streakDays: number;
  focusGoals: string[];
  activeTasks: Array<{
    id: string;
    title: string;
    dueOn: string;
    status: "assigned" | "in_progress" | "submitted";
  }>;
  reflectionPrompt: string;
};

export type DemoFixtureMap = {
  family: FamilyFixture;
  school: SchoolFixture;
  individual: IndividualFixture;
};

export type DemoFixture<T extends DemoRole = DemoRole> = {
  role: T;
  seededAtIso: string;
  data: DemoFixtureMap[T];
};

export const DEMO_ROLE_META: Record<DemoRole, DemoRoleMeta> = {
  family: {
    label: "Family",
    shortDescription: "Track your child's progress and support learning at home.",
    landingTitle: "Family demo",
  },
  school: {
    label: "School",
    shortDescription: "Run classes, assignments, and invites from one workspace.",
    landingTitle: "School demo",
  },
  individual: {
    label: "Individual",
    shortDescription: "Practice reasoning independently and reflect on growth.",
    landingTitle: "Individual demo",
  },
};

export const DEMO_JOURNEYS: Record<DemoRole, DemoJourneyStep[]> = {
  family: [
    {
      id: "overview",
      title: "Home dashboard",
      description: "See how each child is progressing this week.",
    },
    {
      id: "child-detail",
      title: "Child detail",
      description: "Open one child and review their current math momentum.",
    },
    {
      id: "outcome",
      title: "Support action",
      description: "Send encouragement and plan the next learning moment.",
    },
  ],
  school: [
    {
      id: "overview",
      title: "School workspace",
      description: "Review classes, assignment load, and submission health.",
    },
    {
      id: "class-action",
      title: "Class action",
      description: "Publish an assignment and monitor on-time completion.",
    },
    {
      id: "roster-outcome",
      title: "Roster invite outcome",
      description: "Invite families and track enrollment progress.",
    },
  ],
  individual: [
    {
      id: "overview",
      title: "Learner dashboard",
      description: "Start with active goals and this week's tasks.",
    },
    {
      id: "assignment-action",
      title: "Assignment practice",
      description: "Work through one prompt and save progress.",
    },
    {
      id: "reflection-outcome",
      title: "Reflection",
      description: "Capture what was learned and choose the next step.",
    },
  ],
};

function formatFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRecentDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isDemoRole(value: string): value is DemoRole {
  return DEMO_ROLE_ORDER.includes(value as DemoRole);
}

export function createDemoFixture<T extends DemoRole>(role: T): DemoFixture<T> {
  const seededAtIso = new Date().toISOString();

  if (role === "family") {
    return {
      role,
      seededAtIso,
      data: {
        householdName: "Rivera family",
        weeklyProgressPoints: 86,
        children: [
          {
            id: "ava-r",
            name: "Ava",
            grade: "Grade 5",
            streakDays: 6,
            upcomingAssignment: "Fraction stories",
            dueOn: formatFutureDate(1),
            momentumNote: "Improved clarity when explaining equivalent fractions.",
          },
          {
            id: "leo-r",
            name: "Leo",
            grade: "Grade 3",
            streakDays: 4,
            upcomingAssignment: "Shape hunt journal",
            dueOn: formatFutureDate(2),
            momentumNote: "Asking stronger 'what do you notice' questions.",
          },
        ],
      } as DemoFixtureMap[T],
    };
  }

  if (role === "school") {
    return {
      role,
      seededAtIso,
      data: {
        campusName: "Kelvi Middle School",
        teacherName: "Ms. Patel",
        classes: [
          {
            id: "alg-1-p2",
            name: "Algebra I - Period 2",
            rosterCount: 28,
            activeAssignments: 2,
            submissionsDueToday: 11,
          },
          {
            id: "alg-1-p4",
            name: "Algebra I - Period 4",
            rosterCount: 26,
            activeAssignments: 3,
            submissionsDueToday: 9,
          },
          {
            id: "math-lab",
            name: "Math Lab - Support Block",
            rosterCount: 18,
            activeAssignments: 1,
            submissionsDueToday: 5,
          },
        ],
        pendingInvites: [
          {
            studentName: "Maya Patel",
            parentEmail: "maya.parent@example.com",
            invitedAt: formatRecentDate(1),
          },
          {
            studentName: "Jordan Smith",
            parentEmail: "jordan.family@example.com",
            invitedAt: formatRecentDate(2),
          },
        ],
      } as DemoFixtureMap[T],
    };
  }

  return {
    role,
    seededAtIso,
    data: {
      learnerName: "Jordan",
      gradeBand: "Grade 9",
      streakDays: 7,
      focusGoals: [
        "Explain each algebra move in words",
        "Connect diagrams to equations",
        "Spot patterns before calculating",
      ],
      activeTasks: [
        {
          id: "linear-relationships",
          title: "Linear relationships check-in",
          dueOn: formatFutureDate(1),
          status: "in_progress",
        },
        {
          id: "systems-reflection",
          title: "Systems of equations reflection",
          dueOn: formatFutureDate(3),
          status: "assigned",
        },
      ],
      reflectionPrompt:
        "What changed in your reasoning between your first and final attempt?",
    } as DemoFixtureMap[T],
  };
}
