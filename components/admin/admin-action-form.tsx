"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import type { AdminMutationAction } from "@/lib/auth/admin-mutations";
import { executeAdminMutation } from "@/app/admin/actions";

const NOTICE_LABELS: Record<string, string> = {
  "invite-sent": "Invite email sent successfully.",
  "invite-updated": "Invite status updated.",
  "invite-resent": "Invite email re-sent.",
  "waitlist-invited": "Waitlist request invited successfully.",
  "waitlist-archived": "Waitlist request archived.",
};

/**
 * Admin mutations run as a Next.js Server Action (same-origin POST with Next-Action
 * header). Session cookies are read via cookies() on the server — unlike fetch()
 * to a separate JSON API route, which can omit HttpOnly cookies in production.
 */
export function AdminActionForm({
  action,
  fields = {},
  onDone,
  className,
  children,
}: {
  action: AdminMutationAction;
  fields?: Record<string, string | string[]>;
  onDone?: (notice: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = { ...fields };
    for (const [key, value] of formData.entries()) {
      if (key === "roles") continue;
      payload[key] = value;
    }
    const roles = formData.getAll("roles") as string[];
    if (roles.length > 0) {
      payload.roles = roles;
    }

    try {
      const result = await executeAdminMutation({ action, payload });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const noticeKey = result.notice;
      const label = NOTICE_LABELS[noticeKey] ?? "Saved.";
      setSuccess(label);
      formRef.current?.reset();
      if (onDone) {
        onDone(noticeKey);
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={className}>
      {success ? (
        <div className="mb-3 rounded-lg border border-kelvi-teal/30 bg-kelvi-teal/10 px-3 py-2 text-sm text-kelvi-school-ink">
          {success}
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <fieldset disabled={loading} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
