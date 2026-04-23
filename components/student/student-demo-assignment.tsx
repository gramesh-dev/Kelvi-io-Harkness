"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DEMO_EVENT,
  listDemoBundles,
  loadDemoBundle,
  saveDemoBundle,
} from "@/lib/demo/assignment-demo-client";
import type { DemoAssignmentBundle } from "@/lib/demo/assignment-demo";

export function StudentDemoAssignment({
  classId,
  assignmentId,
}: {
  classId?: string;
  assignmentId: string;
}) {
  const [bundle, setBundle] = useState<DemoAssignmentBundle | null>(null);
  const [response, setResponse] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (classId) {
        setBundle(loadDemoBundle(classId));
        return;
      }
      setBundle(
        listDemoBundles().find((b) => b.studentTasks.some((t) => t.assignmentId === assignmentId)) ??
          null
      );
    };
    refresh();
    window.addEventListener(DEMO_EVENT, refresh as EventListener);
    return () => window.removeEventListener(DEMO_EVENT, refresh as EventListener);
  }, [classId, assignmentId]);

  const task = useMemo(
    () => bundle?.studentTasks.find((x) => x.assignmentId === assignmentId) ?? null,
    [bundle, assignmentId]
  );

  function updateStatus(status: "in_progress" | "submitted") {
    if (!bundle || !task) return;
    const next: DemoAssignmentBundle = {
      ...bundle,
      studentTasks: bundle.studentTasks.map((t) =>
        t.assignmentId === assignmentId ? { ...t, status } : t
      ),
    };
    saveDemoBundle(next);
    setFlash(status === "submitted" ? "Submitted (demo)." : "Draft saved (demo).");
  }

  if (!bundle || !task) {
    return (
      <div className="space-y-4">
        <p className="text-lg text-kelvi-school-ink/75">
          No demo assignment found. Go to the class page and load dummy data first.
        </p>
        <Link href="/student/dashboard" className="text-kelvi-teal hover:underline">
          Back to student dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/student/dashboard" className="text-kelvi-teal hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-3 font-serif text-3xl text-kelvi-school-ink md:text-4xl">{task.title}</h1>
        <p className="text-base text-kelvi-school-ink/70">
          {task.className} · Status: {task.status.replace("_", " ")}
        </p>
      </div>

      {flash ? (
        <div className="rounded-lg border border-kelvi-teal/30 bg-kelvi-teal/10 px-4 py-3 text-base text-kelvi-school-ink">
          {flash}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="mb-2 text-sm uppercase tracking-wide text-kelvi-school-ink/60">Response (demo)</p>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          className="min-h-40 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-base text-kelvi-school-ink outline-none focus:border-kelvi-teal focus:ring-2 focus:ring-kelvi-teal/30"
          placeholder="Write your answer here..."
        />
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => updateStatus("in_progress")}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-kelvi-school-ink hover:bg-kelvi-school-surface"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={() => updateStatus("submitted")}
            className="rounded-lg bg-kelvi-teal px-4 py-2 text-sm font-medium text-white hover:bg-kelvi-teal-hover"
          >
            Submit assignment
          </button>
        </div>
      </div>
    </div>
  );
}
