"use client";

import { useEffect, useState } from "react";
import { KelviWordmark } from "@/components/kelvi-wordmark";
import {
  submitFamilyOrg,
  submitSchoolOrg,
  submitStudentSegment,
} from "./actions";

type Role = "school" | "family" | "student" | null;

export function RoleSetupWizard() {
  const [role, setRole] = useState<Role>(null);
  const [orgName, setOrgName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kelvi_signup_intent");
      if (raw === "school" || raw === "family" || raw === "student") {
        setRole(raw);
      }
      sessionStorage.removeItem("kelvi_signup_intent");
    } catch {
      /* ignore */
    }
  }, []);

  async function onSchoolSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("orgName", orgName);
      const res = await submitSchoolOrg(fd);
      if (res?.error) {
        setError(res.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onFamilySubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("familyName", familyName);
      const res = await submitFamilyOrg(fd);
      if (res?.error) {
        setError(res.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onStudentContinue() {
    setLoading(true);
    setError(null);
    try {
      const res = await submitStudentSegment();
      if (res?.error) {
        setError(res.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-kelvi-cream px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <KelviWordmark />
          <h1 className="font-serif text-2xl font-bold text-kelvi-ink mt-4 text-center">
            Who are you here as?
          </h1>
          <p className="mt-2 text-kelvi-slate text-center text-sm max-w-md">
            Choose one. You can add more detail later in settings.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!role && (
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setRole("school")}
              className="rounded-xl border border-border bg-surface p-4 text-left hover:border-kelvi-600 transition"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-kelvi-600">
                Kelvi School
              </p>
              <p className="font-serif text-lg font-semibold text-kelvi-ink mt-1">
                Teacher
              </p>
              <p className="text-xs text-text-muted mt-2">
                Classroom & school workspace
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRole("family")}
              className="rounded-xl border border-border bg-surface p-4 text-left hover:border-kelvi-mustard transition"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-kelvi-mustard">
                Kelvi Family
              </p>
              <p className="font-serif text-lg font-semibold text-kelvi-ink mt-1">
                Parent
              </p>
              <p className="text-xs text-text-muted mt-2">
                Home learning space
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRole("student")}
              className="rounded-xl border border-border bg-surface p-4 text-left hover:border-kelvi-slate transition"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-kelvi-slate">
                Kelvi Student
              </p>
              <p className="font-serif text-lg font-semibold text-kelvi-ink mt-1">
                Student
              </p>
              <p className="text-xs text-text-muted mt-2">
                Practice & thinking partner
              </p>
            </button>
          </div>
        )}

        {role === "school" && (
          <form
            onSubmit={onSchoolSubmit}
            className="bg-surface rounded-xl border border-border p-8 space-y-5"
          >
            <button
              type="button"
              className="text-sm text-kelvi-600 hover:underline"
              onClick={() => {
                setRole(null);
                setOrgName("");
                setError(null);
              }}
            >
              ← Back
            </button>
            <div>
              <label
                htmlFor="orgName"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                School or organization name
              </label>
              <input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
                placeholder="e.g. Lincoln High School"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-kelvi-600 text-white font-medium rounded-lg hover:bg-kelvi-700 transition disabled:opacity-50"
            >
              {loading ? "Saving…" : "Continue"}
            </button>
          </form>
        )}

        {role === "family" && (
          <form
            onSubmit={onFamilySubmit}
            className="bg-surface rounded-xl border border-border p-8 space-y-5"
          >
            <button
              type="button"
              className="text-sm text-kelvi-600 hover:underline"
              onClick={() => {
                setRole(null);
                setFamilyName("");
                setError(null);
              }}
            >
              ← Back
            </button>
            <div>
              <label
                htmlFor="familyName"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                Family name
              </label>
              <input
                id="familyName"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
                placeholder="The Smith Family"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-kelvi-600 text-white font-medium rounded-lg hover:bg-kelvi-700 transition disabled:opacity-50"
            >
              {loading ? "Saving…" : "Continue"}
            </button>
          </form>
        )}

        {role === "student" && (
          <div className="bg-surface rounded-xl border border-border p-8 space-y-5">
            <button
              type="button"
              className="text-sm text-kelvi-600 hover:underline"
              onClick={() => {
                setRole(null);
                setError(null);
              }}
            >
              ← Back
            </button>
            <p className="text-sm text-text-secondary">
              You’ll use the student practice space. You can fill out more
              profile details later.
            </p>
            <button
              type="button"
              onClick={onStudentContinue}
              disabled={loading}
              className="w-full py-2.5 bg-kelvi-600 text-white font-medium rounded-lg hover:bg-kelvi-700 transition disabled:opacity-50"
            >
              {loading ? "Saving…" : "Continue to student home"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
