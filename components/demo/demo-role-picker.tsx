"use client";

import { useRouter } from "next/navigation";
import {
  DEMO_ROLE_META,
  DEMO_ROLE_ORDER,
  type DemoRole,
} from "@/lib/demo/experience";
import { ensureDemoFixture, setDemoRole } from "@/lib/demo/experience-client";

export function DemoRolePicker() {
  const router = useRouter();

  function handleSelect(role: DemoRole) {
    setDemoRole(role);
    ensureDemoFixture(role);
    router.push(`/demo/${role}`);
  }

  return (
    <div className="min-h-screen bg-kelvi-cream px-4 py-12 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-kelvi-teal">Demo mode</p>
          <h1 className="font-serif text-4xl text-kelvi-school-ink sm:text-5xl">Demo as</h1>
          <p className="mx-auto max-w-2xl text-lg text-kelvi-school-ink/75">
            Pick a journey to see how Kelvi works for each audience. Demo data stays isolated from
            normal login and account data.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {DEMO_ROLE_ORDER.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleSelect(role)}
              className="rounded-2xl border border-border bg-surface p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-kelvi-teal/50 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-kelvi-teal">Demo</p>
              <h2 className="mt-2 font-serif text-3xl text-kelvi-school-ink">
                {DEMO_ROLE_META[role].label}
              </h2>
              <p className="mt-2 text-base leading-relaxed text-kelvi-school-ink/70">
                {DEMO_ROLE_META[role].shortDescription}
              </p>
              <p className="mt-4 text-sm font-semibold text-kelvi-teal">Start journey →</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
