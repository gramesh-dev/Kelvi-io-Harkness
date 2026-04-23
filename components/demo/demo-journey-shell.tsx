"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_JOURNEYS,
  DEMO_ROLE_META,
  type DemoFixture,
  type FamilyFixture,
  type IndividualFixture,
  type DemoRole,
  type SchoolFixture,
} from "@/lib/demo/experience";
import { clearDemoMode } from "@/lib/demo/experience-client";

type DemoJourneyShellProps = {
  role: DemoRole;
  fixture: DemoFixture<DemoRole>;
};

export function DemoJourneyShell({ role, fixture }: DemoJourneyShellProps) {
  const router = useRouter();
  const steps = DEMO_JOURNEYS[role];
  const [stepIndex, setStepIndex] = useState(0);

  const step = steps[stepIndex];
  const progressLabel = `${stepIndex + 1} of ${steps.length}`;
  const isLastStep = stepIndex === steps.length - 1;

  const body = useMemo(() => renderStepBody(role, step.id, fixture), [role, step.id, fixture]);

  function handleExit() {
    clearDemoMode();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-kelvi-cream px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-kelvi-teal">
                Demo mode
              </p>
              <h1 className="mt-1 font-serif text-4xl text-kelvi-school-ink">
                {DEMO_ROLE_META[role].landingTitle}
              </h1>
              <p className="mt-2 text-base text-kelvi-school-ink/70">
                Guided journey for {DEMO_ROLE_META[role].label.toLowerCase()} users.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/demo"
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-kelvi-school-ink hover:bg-kelvi-school-surface"
              >
                Switch role
              </Link>
              <button
                type="button"
                onClick={handleExit}
                className="rounded-lg bg-kelvi-teal px-3 py-2 text-sm font-medium text-white hover:bg-kelvi-teal-hover"
              >
                Exit demo
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-kelvi-teal">
                Step {progressLabel}
              </p>
              <h2 className="mt-1 font-serif text-3xl text-kelvi-school-ink">{step.title}</h2>
              <p className="mt-2 text-base text-kelvi-school-ink/70">{step.description}</p>
            </div>
            <div className="h-2 w-full rounded-full bg-kelvi-school-surface sm:w-56">
              <div
                className="h-2 rounded-full bg-kelvi-teal transition-all"
                style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-6">{body}</div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={stepIndex === 0}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-kelvi-school-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>

            {isLastStep ? (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/signup"
                  className="rounded-lg border border-kelvi-teal/40 px-4 py-2 text-sm font-semibold text-kelvi-teal hover:bg-kelvi-teal/10"
                >
                  Create account
                </Link>
                <Link
                  href="/index.html#signup"
                  className="rounded-lg bg-kelvi-teal px-4 py-2 text-sm font-semibold text-white hover:bg-kelvi-teal-hover"
                >
                  Join waitlist
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}
                className="rounded-lg bg-kelvi-teal px-4 py-2 text-sm font-semibold text-white hover:bg-kelvi-teal-hover"
              >
                Next step
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function renderStepBody(role: DemoRole, stepId: string, fixture: DemoFixture<DemoRole>) {
  if (role === "family") {
    const data = fixture.data as FamilyFixture;
    if (stepId === "overview") {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard label="Household" value={data.householdName} />
          <InfoCard label="Weekly momentum" value={`${data.weeklyProgressPoints}%`} />
          <InfoCard label="Children active" value={`${data.children.length}`} />
        </div>
      );
    }
    if (stepId === "child-detail") {
      return (
        <ul className="space-y-3">
          {data.children.map((child) => (
            <li key={child.id} className="rounded-xl border border-border bg-white/60 p-4">
              <p className="text-lg font-semibold text-kelvi-school-ink">
                {child.name} · {child.grade}
              </p>
              <p className="mt-1 text-sm text-kelvi-school-ink/70">
                {child.upcomingAssignment} due {child.dueOn} · {child.streakDays}-day streak
              </p>
              <p className="mt-1 text-sm text-kelvi-school-ink/75">{child.momentumNote}</p>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="rounded-xl border border-kelvi-teal/25 bg-kelvi-teal/10 p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-kelvi-teal">Action taken</p>
        <p className="mt-2 text-base text-kelvi-school-ink">
          You sent a check-in note to both children and planned a 20-minute reflection block for
          tomorrow evening.
        </p>
      </div>
    );
  }

  if (role === "school") {
    const data = fixture.data as SchoolFixture;
    if (stepId === "overview") {
      const totalStudents = data.classes.reduce((sum, item) => sum + item.rosterCount, 0);
      const totalAssignments = data.classes.reduce((sum, item) => sum + item.activeAssignments, 0);
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard label="Campus" value={data.campusName} />
          <InfoCard label="Students" value={`${totalStudents}`} />
          <InfoCard label="Active assignments" value={`${totalAssignments}`} />
        </div>
      );
    }
    if (stepId === "class-action") {
      return (
        <ul className="space-y-3">
          {data.classes.map((item) => (
            <li key={item.id} className="rounded-xl border border-border bg-white/60 p-4">
              <p className="text-lg font-semibold text-kelvi-school-ink">{item.name}</p>
              <p className="mt-1 text-sm text-kelvi-school-ink/70">
                {item.rosterCount} students · {item.activeAssignments} active assignments ·{" "}
                {item.submissionsDueToday} due today
              </p>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <ul className="space-y-3">
        {data.pendingInvites.map((invite) => (
          <li key={`${invite.studentName}-${invite.parentEmail}`} className="rounded-xl border border-border bg-white/60 p-4">
            <p className="text-lg font-semibold text-kelvi-school-ink">{invite.studentName}</p>
            <p className="mt-1 text-sm text-kelvi-school-ink/70">{invite.parentEmail}</p>
            <p className="mt-1 text-sm text-kelvi-school-ink/60">Invited {invite.invitedAt}</p>
          </li>
        ))}
      </ul>
    );
  }

  const data = fixture.data as IndividualFixture;
  if (stepId === "overview") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Learner" value={data.learnerName} />
        <InfoCard label="Grade band" value={data.gradeBand} />
        <InfoCard label="Current streak" value={`${data.streakDays} days`} />
      </div>
    );
  }
  if (stepId === "assignment-action") {
    return (
      <ul className="space-y-3">
        {data.activeTasks.map((task) => (
          <li key={task.id} className="rounded-xl border border-border bg-white/60 p-4">
            <p className="text-lg font-semibold text-kelvi-school-ink">{task.title}</p>
            <p className="mt-1 text-sm text-kelvi-school-ink/70">
              Due {task.dueOn} · {task.status.replace("_", " ")}
            </p>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="rounded-xl border border-kelvi-teal/25 bg-kelvi-teal/10 p-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-kelvi-teal">Reflection prompt</p>
      <p className="mt-2 text-base text-kelvi-school-ink">{data.reflectionPrompt}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-kelvi-school-ink/75">
        {data.focusGoals.map((goal) => (
          <li key={goal}>{goal}</li>
        ))}
      </ul>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-kelvi-school-ink/60">{label}</p>
      <p className="mt-1 text-xl font-semibold text-kelvi-school-ink">{value}</p>
    </div>
  );
}
