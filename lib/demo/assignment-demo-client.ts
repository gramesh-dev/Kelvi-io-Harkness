"use client";

import {
  createDemoAssignmentBundle,
  type DemoAssignmentBundle,
} from "@/lib/demo/assignment-demo";

const PREFIX = "kelvi:demo:assignment-bundle:";
export const DEMO_EVENT = "kelvi:demo-data-changed";

export function demoBundleKey(classId: string): string {
  return `${PREFIX}${classId}`;
}

export function loadDemoBundle(classId: string): DemoAssignmentBundle | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(demoBundleKey(classId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoAssignmentBundle;
  } catch {
    return null;
  }
}

export function saveDemoBundle(bundle: DemoAssignmentBundle) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(demoBundleKey(bundle.classId), JSON.stringify(bundle));
  window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: { classId: bundle.classId } }));
}

export function seedDemoBundle(classId: string, className: string): DemoAssignmentBundle {
  const bundle = createDemoAssignmentBundle(classId, className);
  saveDemoBundle(bundle);
  return bundle;
}

export function clearDemoBundle(classId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(demoBundleKey(classId));
  window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: { classId } }));
}

export function listDemoBundles(): DemoAssignmentBundle[] {
  if (typeof window === "undefined") return [];
  const items: DemoAssignmentBundle[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      items.push(JSON.parse(raw) as DemoAssignmentBundle);
    } catch {
      // Ignore invalid payloads.
    }
  }
  return items.sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
}
