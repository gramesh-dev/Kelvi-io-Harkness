"use client";

import {
  createDemoFixture,
  DEMO_ROLE_ORDER,
  type DemoFixture,
  type DemoRole,
} from "@/lib/demo/experience";

const ROLE_KEY = "kelvi:demo:role";
const FIXTURE_PREFIX = "kelvi:demo:fixture:v1:";

function fixtureKey(role: DemoRole): string {
  return `${FIXTURE_PREFIX}${role}`;
}

export function setDemoRole(role: DemoRole) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ROLE_KEY, role);
}

export function getDemoRole(): DemoRole | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(ROLE_KEY);
  if (!stored) return null;
  return DEMO_ROLE_ORDER.includes(stored as DemoRole) ? (stored as DemoRole) : null;
}

export function loadDemoFixture<T extends DemoRole>(role: T): DemoFixture<T> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(fixtureKey(role));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoFixture<T>;
  } catch {
    return null;
  }
}

export function saveDemoFixture<T extends DemoRole>(fixture: DemoFixture<T>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(fixtureKey(fixture.role), JSON.stringify(fixture));
}

export function ensureDemoFixture<T extends DemoRole>(role: T): DemoFixture<T> {
  const existing = loadDemoFixture(role);
  if (existing) return existing;
  const seeded = createDemoFixture(role);
  saveDemoFixture(seeded);
  return seeded;
}

export function clearDemoMode() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ROLE_KEY);
  for (const role of DEMO_ROLE_ORDER) {
    window.localStorage.removeItem(fixtureKey(role));
  }
}
