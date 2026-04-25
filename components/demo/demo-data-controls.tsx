"use client";

import { useEffect, useState } from "react";
import {
  clearDemoBundle,
  DEMO_EVENT,
  loadDemoBundle,
  seedDemoBundle,
} from "@/lib/demo/assignment-demo-client";

export function DemoDataControls({
  classId,
  className,
}: {
  classId: string;
  className: string;
}) {
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const refresh = () => setHasData(loadDemoBundle(classId) !== null);
    refresh();
    window.addEventListener(DEMO_EVENT, refresh as EventListener);
    return () => window.removeEventListener(DEMO_EVENT, refresh as EventListener);
  }, [classId]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => seedDemoBundle(classId, className)}
        className="rounded-lg bg-kelvi-teal px-4 py-2.5 text-sm font-medium text-white transition hover:bg-kelvi-teal-hover"
      >
        Load dummy data
      </button>
      <button
        type="button"
        onClick={() => clearDemoBundle(classId)}
        className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-kelvi-school-ink transition hover:bg-kelvi-school-surface"
      >
        Delete dummy data
      </button>
      <span className="text-sm text-kelvi-school-ink/70">
        {hasData ? "Demo data loaded" : "No demo data loaded"}
      </span>
    </div>
  );
}
