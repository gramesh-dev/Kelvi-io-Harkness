"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createClassroomAction } from "@/app/school/classes/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-kelvi-teal px-4 py-4 text-lg font-medium text-white transition hover:bg-kelvi-teal-hover disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create class"}
    </button>
  );
}

export function CreateClassForm() {
  const [state, formAction] = useFormState(createClassroomAction, undefined);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800">
          {state.error}
        </div>
      ) : null}

      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-semibold uppercase tracking-wide text-kelvi-school-ink/70">
          Class name <span className="text-red-600">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. Algebra I — Period 3"
          className="w-full rounded-lg border border-border bg-surface px-4 py-3.5 text-lg text-kelvi-school-ink outline-none ring-kelvi-teal/30 placeholder:text-kelvi-school-muted/60 focus:border-kelvi-teal focus:ring-2"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="grade_level"
            className="mb-2 block text-sm font-semibold uppercase tracking-wide text-kelvi-school-ink/70"
          >
            Grade level
          </label>
          <input
            id="grade_level"
            name="grade_level"
            placeholder="e.g. 9"
            className="w-full rounded-lg border border-border bg-surface px-4 py-3.5 text-lg text-kelvi-school-ink outline-none focus:border-kelvi-teal focus:ring-2 focus:ring-kelvi-teal/30"
          />
        </div>
        <div>
          <label htmlFor="subject" className="mb-2 block text-sm font-semibold uppercase tracking-wide text-kelvi-school-ink/70">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            placeholder="e.g. Mathematics"
            className="w-full rounded-lg border border-border bg-surface px-4 py-3.5 text-lg text-kelvi-school-ink outline-none focus:border-kelvi-teal focus:ring-2 focus:ring-kelvi-teal/30"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="academic_year"
          className="mb-2 block text-sm font-semibold uppercase tracking-wide text-kelvi-school-ink/70"
        >
          Academic year
        </label>
        <input
          id="academic_year"
          name="academic_year"
          placeholder="e.g. 2026–27"
          className="w-full max-w-xs rounded-lg border border-border bg-surface px-4 py-3.5 text-lg text-kelvi-school-ink outline-none focus:border-kelvi-teal focus:ring-2 focus:ring-kelvi-teal/30"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
