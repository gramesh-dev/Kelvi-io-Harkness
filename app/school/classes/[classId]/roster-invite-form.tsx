"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createRosterInviteAction,
  type RosterInviteFormState,
} from "@/app/school/classes/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-kelvi-teal px-4 py-4 text-lg font-medium text-white transition hover:bg-kelvi-teal-hover disabled:opacity-50 sm:w-auto sm:min-w-[14rem]"
    >
      {pending ? "Creating invite…" : "Create invite link"}
    </button>
  );
}

const initial: RosterInviteFormState = undefined;

export function RosterInviteForm({ classroomId }: { classroomId: string }) {
  const [state, formAction] = useFormState(createRosterInviteAction, initial);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="classroom_id" value={classroomId} />

      {state?.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800">
          {state.error}
        </div>
      ) : null}
      {state?.ok && state.inviteUrl ? (
        <div className="space-y-2 rounded-lg border border-kelvi-teal/30 bg-kelvi-teal/10 px-4 py-4 text-kelvi-school-ink">
          <p className="text-lg font-medium">Invitation ready</p>
          <p className="text-base text-kelvi-school-ink/85">
            Copy this link and send it to the parent (or the student, if they are old enough to use
            the account). They must sign in with the email you entered — then they can accept and
            the student appears on the roster.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              readOnly
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-sm text-kelvi-school-ink"
              value={state.inviteUrl}
              aria-label="Invitation link"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              className="shrink-0 rounded-lg border border-kelvi-teal bg-kelvi-teal/10 px-4 py-2.5 text-sm font-medium text-kelvi-teal hover:bg-kelvi-teal/20"
              onClick={() => void navigator.clipboard.writeText(state.inviteUrl!)}
            >
              Copy link
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <label
          htmlFor="parent_email"
          className="mb-2 block text-sm font-semibold uppercase tracking-wide text-kelvi-school-ink/70"
        >
          Parent or guardian email <span className="text-red-600">*</span>
        </label>
        <input
          id="parent_email"
          name="parent_email"
          type="email"
          required
          autoComplete="email"
          placeholder="parent@example.com"
          className="w-full rounded-lg border border-border bg-surface px-4 py-3.5 text-lg text-kelvi-school-ink outline-none ring-kelvi-teal/30 placeholder:text-kelvi-school-muted/60 focus:border-kelvi-teal focus:ring-2"
        />
      </div>

      <div>
        <label
          htmlFor="child_full_name"
          className="mb-2 block text-sm font-semibold uppercase tracking-wide text-kelvi-school-ink/70"
        >
          Student full name <span className="text-red-600">*</span>
        </label>
        <input
          id="child_full_name"
          name="child_full_name"
          required
          autoComplete="name"
          placeholder="Legal or roster name"
          className="w-full rounded-lg border border-border bg-surface px-4 py-3.5 text-lg text-kelvi-school-ink outline-none ring-kelvi-teal/30 placeholder:text-kelvi-school-muted/60 focus:border-kelvi-teal focus:ring-2"
        />
      </div>

      <div>
        <label
          htmlFor="child_display_name"
          className="mb-2 block text-sm font-semibold uppercase tracking-wide text-kelvi-school-ink/70"
        >
          Preferred name <span className="text-kelvi-school-ink/50">(optional)</span>
        </label>
        <input
          id="child_display_name"
          name="child_display_name"
          placeholder="How they go by in class"
          className="w-full rounded-lg border border-border bg-surface px-4 py-3.5 text-lg text-kelvi-school-ink outline-none focus:border-kelvi-teal focus:ring-2 focus:ring-kelvi-teal/30"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
