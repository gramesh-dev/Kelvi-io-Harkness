"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DemoDataControls } from "@/components/demo/demo-data-controls";
import { DEMO_EVENT, listDemoBundles } from "@/lib/demo/assignment-demo-client";
import type { DemoAssignmentBundle } from "@/lib/demo/assignment-demo";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StudentDemoDashboard() {
  const [bundle, setBundle] = useState<DemoAssignmentBundle | null>(null);

  useEffect(() => {
    const refresh = () => setBundle(listDemoBundles()[0] ?? null);
    refresh();
    window.addEventListener(DEMO_EVENT, refresh as EventListener);
    return () => window.removeEventListener(DEMO_EVENT, refresh as EventListener);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-kelvi-school-ink md:text-4xl">Student dashboard (demo)</h1>
        <DemoDataControls
          classId={bundle?.classId ?? "demo-class"}
          className={bundle?.className ?? "Algebra I - Period 3"}
        />
      </div>

      {!bundle ? (
        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-4 text-lg text-kelvi-school-ink/75">
          No assignment demo data yet. Load dummy data from the class dashboard first, or use the
          button above.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {bundle.studentTasks.map((task) => (
            <li key={task.assignmentId} className="px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-medium text-kelvi-school-ink">{task.title}</p>
                  <p className="text-sm text-kelvi-school-ink/65">
                    {task.className} · Due {fmt(task.dueAtIso)} · {task.status.replace("_", " ")}
                  </p>
                </div>
                <Link
                  href={`/student/assignments/${task.assignmentId}?classId=${encodeURIComponent(bundle.classId)}`}
                  className="rounded-lg border border-kelvi-teal/50 px-3 py-1.5 text-sm font-medium text-kelvi-teal hover:bg-kelvi-teal/10"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
