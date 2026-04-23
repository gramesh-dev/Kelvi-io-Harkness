"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DemoDataControls } from "@/components/demo/demo-data-controls";
import { DEMO_EVENT, loadDemoBundle } from "@/lib/demo/assignment-demo-client";
import type { DemoAssignmentBundle } from "@/lib/demo/assignment-demo";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TeacherAssignmentsDemo({
  classId,
  className,
  demoKey = classId,
}: {
  classId: string;
  className: string;
  demoKey?: string;
}) {
  const [bundle, setBundle] = useState<DemoAssignmentBundle | null>(null);

  useEffect(() => {
    const refresh = () => setBundle(loadDemoBundle(demoKey));
    refresh();
    window.addEventListener(DEMO_EVENT, refresh as EventListener);
    return () => window.removeEventListener(DEMO_EVENT, refresh as EventListener);
  }, [demoKey]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-2xl font-semibold text-kelvi-school-ink md:text-3xl">
          Assignments (demo)
        </h3>
        <DemoDataControls classId={demoKey} className={className} />
      </div>

      {!bundle ? (
        <p className="text-lg text-kelvi-school-ink/75">
          Use <strong>Load dummy data</strong> to render assignment lists for teacher and student
          dashboards.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {bundle.assignments.map((a) => (
            <li key={a.id} className="px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-kelvi-school-ink">{a.title}</p>
                  <p className="text-base text-kelvi-school-ink/70">
                    {a.status.toUpperCase()} · Due {fmt(a.dueAtIso)}
                  </p>
                </div>
                <Link
                  href={`/school/classes/${classId}/assignments/${a.id}?demo=1`}
                  className="rounded-lg border border-kelvi-teal/50 px-3 py-1.5 text-sm font-medium text-kelvi-teal hover:bg-kelvi-teal/10"
                >
                  View submissions
                </Link>
              </div>
              <p className="mt-2 text-sm text-kelvi-school-ink/65">
                {a.submissionStats.submitted}/{a.submissionStats.total} submitted ·{" "}
                {a.submissionStats.late} late · {a.submissionStats.pending} pending
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
