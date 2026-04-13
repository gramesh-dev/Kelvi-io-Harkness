"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateChild } from "./actions";
import { DeleteChildButton } from "./delete-child-button";

export type ChildRowStudent = {
  id: string;
  full_name: string;
  display_name: string | null;
  grade_level: string | null;
  date_of_birth: string | null;
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function ChildRow({ student }: { student: ChildRowStudent }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const display = student.display_name || student.full_name;

  async function handleSave(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await updateChild(student.id, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setEditing(false);
    setLoading(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="p-5 space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <form action={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`fullName-${student.id}`}
                className="block text-xs font-medium text-text-secondary mb-1"
              >
                Full name *
              </label>
              <input
                id={`fullName-${student.id}`}
                name="fullName"
                type="text"
                required
                defaultValue={student.full_name}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500"
              />
            </div>
            <div>
              <label
                htmlFor={`displayName-${student.id}`}
                className="block text-xs font-medium text-text-secondary mb-1"
              >
                Display name
              </label>
              <input
                id={`displayName-${student.id}`}
                name="displayName"
                type="text"
                defaultValue={student.display_name ?? ""}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500"
              />
            </div>
            <div>
              <label
                htmlFor={`gradeLevel-${student.id}`}
                className="block text-xs font-medium text-text-secondary mb-1"
              >
                Grade level
              </label>
              <input
                id={`gradeLevel-${student.id}`}
                name="gradeLevel"
                type="text"
                defaultValue={student.grade_level ?? ""}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500"
              />
            </div>
            <div>
              <label
                htmlFor={`dateOfBirth-${student.id}`}
                className="block text-xs font-medium text-text-secondary mb-1"
              >
                Date of birth
              </label>
              <input
                id={`dateOfBirth-${student.id}`}
                name="dateOfBirth"
                type="date"
                defaultValue={toDateInputValue(student.date_of_birth)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-kelvi-600 text-white rounded-lg hover:bg-kelvi-700 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-surface-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-kelvi-100 flex items-center justify-center text-kelvi-700 font-medium shrink-0">
        {display.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{display}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-muted mt-0.5">
          {student.full_name !== student.display_name && student.display_name && (
            <span>{student.full_name}</span>
          )}
          {student.grade_level && (
            <span>Grade {student.grade_level}</span>
          )}
          {student.date_of_birth && (
            <span>
              Born {new Date(student.date_of_birth).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setError(null);
          }}
          className="p-2 rounded-lg text-kelvi-muted hover:text-kelvi-teal hover:bg-kelvi-50 transition"
          title="Edit"
          aria-label={`Edit ${display}`}
        >
          <PencilIcon className="w-5 h-5" />
        </button>
        <DeleteChildButton studentId={student.id} label={display} />
      </div>
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  );
}
