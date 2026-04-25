"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { addChild } from "./actions";

export function AddChildForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inFlight = useRef(false);

  async function handleSubmit(formData: FormData) {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await addChild(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Full name *
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
            placeholder="Aiden Smith"
          />
        </div>
        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
            placeholder="Aiden"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="gradeLevel"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Grade level
          </label>
          <input
            id="gradeLevel"
            name="gradeLevel"
            type="text"
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
            placeholder="2"
          />
        </div>
        <div>
          <label
            htmlFor="dateOfBirth"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Date of birth
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 bg-kelvi-600 text-white font-medium rounded-lg hover:bg-kelvi-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Adding..." : "Add child"}
      </button>
    </form>
  );
}
