"use client";

import { useEffect, useState } from "react";
import { DemoJourneyShell } from "@/components/demo/demo-journey-shell";
import {
  ensureDemoFixture,
  setDemoRole,
} from "@/lib/demo/experience-client";
import { type DemoFixture, type DemoRole } from "@/lib/demo/experience";

export function DemoRoleJourney({ role }: { role: DemoRole }) {
  const [fixture, setFixture] = useState<DemoFixture<DemoRole> | null>(null);

  useEffect(() => {
    setDemoRole(role);
    const seeded = ensureDemoFixture(role);
    setFixture(seeded);
  }, [role]);

  if (!fixture) {
    return (
      <div className="min-h-screen bg-kelvi-cream px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8 text-center text-kelvi-school-ink/75">
          Loading demo journey...
        </div>
      </div>
    );
  }

  return <DemoJourneyShell role={role} fixture={fixture} />;
}
