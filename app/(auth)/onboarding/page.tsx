"use client";

import { useState } from "react";
import { KelviWordmark } from "@/components/kelvi-wordmark";
import { createFamilyOrg } from "./actions";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createFamilyOrg(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-kelvi-cream px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <KelviWordmark />
          <h1 className="font-serif text-2xl font-bold text-kelvi-ink mt-4">
            Welcome!
          </h1>
          <p className="mt-2 text-kelvi-slate text-center">
            Let&apos;s set up your family space
          </p>
        </div>

        <form
          action={handleSubmit}
          className="bg-surface rounded-xl border border-border p-8 space-y-5"
        >
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="familyName"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Family name
            </label>
            <input
              id="familyName"
              name="familyName"
              type="text"
              required
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
              placeholder="The Smith Family"
            />
            <p className="mt-1.5 text-xs text-text-muted">
              This is the name for your family&apos;s learning space
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-kelvi-600 text-white font-medium rounded-lg hover:bg-kelvi-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create family space"}
          </button>
        </form>
      </div>
    </div>
  );
}
