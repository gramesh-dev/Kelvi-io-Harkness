"use client";

import { useState } from "react";
import { createSession } from "./actions";

interface Student {
  id: string;
  full_name: string;
  display_name: string | null;
}

const modes = [
  {
    id: "questioning",
    label: "Questioning",
    description: "Kelvi guides learning through questions",
  },
  {
    id: "guided",
    label: "Guided",
    description: "Step-by-step explanations with comprehension checks",
  },
  {
    id: "exploration",
    label: "Exploration",
    description: "Free-form discovery following curiosity",
  },
];

export function StartSessionForm({ students }: { students: Student[] }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createSession(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border p-6">
        <label className="block text-sm font-medium text-text-primary mb-3">
          Who is learning?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {students.map((student, i) => (
            <label
              key={student.id}
              className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-secondary transition has-[:checked]:border-kelvi-500 has-[:checked]:bg-kelvi-50"
            >
              <input
                type="radio"
                name="studentId"
                value={student.id}
                defaultChecked={i === 0}
                className="accent-kelvi-600"
              />
              <span className="text-sm font-medium">
                {student.display_name || student.full_name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        <label className="block text-sm font-medium text-text-primary mb-3">
          Learning mode
        </label>
        <div className="space-y-3">
          {modes.map((mode, i) => (
            <label
              key={mode.id}
              className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-secondary transition has-[:checked]:border-kelvi-500 has-[:checked]:bg-kelvi-50"
            >
              <input
                type="radio"
                name="mode"
                value={mode.id}
                defaultChecked={i === 0}
                className="accent-kelvi-600 mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">{mode.label}</span>
                <p className="text-xs text-text-muted mt-0.5">
                  {mode.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        <label
          htmlFor="topic"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Topic (optional)
        </label>
        <input
          id="topic"
          name="topic"
          type="text"
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
          placeholder="e.g. Dinosaurs, Fractions, The Solar System"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-kelvi-600 text-white font-medium rounded-lg hover:bg-kelvi-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
      >
        {loading ? "Starting session..." : "Start session"}
      </button>
    </form>
  );
}
