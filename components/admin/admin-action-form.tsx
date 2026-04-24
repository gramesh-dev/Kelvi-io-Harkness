"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import type { AdminMutationAction } from "@/lib/auth/admin-mutations";

const NOTICE_LABELS: Record<string, string> = {
  "invite-sent": "Invite email sent successfully.",
  "invite-updated": "Invite status updated.",
  "invite-resent": "Invite email re-sent.",
  "waitlist-invited": "Waitlist request invited successfully.",
  "waitlist-archived": "Waitlist request archived.",
};

type JsonResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  notice?: string;
  debug?: Record<string, unknown>;
};

/**
 * Submits admin mutations to POST /api/admin/actions with cookie-based auth.
 * No Supabase client, no Bearer token, no redirects on failure.
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
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });

      const data = (await res.json().catch(() => ({}))) as JsonResponse;

      if (res.status === 401 || res.status === 403) {
        const base = data.message ?? "You are not allowed to perform this action.";
        const dbg =
          data.debug && typeof data.debug === "object"
            ? ` — ${JSON.stringify(data.debug)}`
            : "";
        setError(`${base}${dbg}`);
        return;
      }

      if (!res.ok || !data.ok) {
        setError(data.message ?? `Request failed (${res.status}).`);
        return;
      }

      const noticeKey = typeof data.notice === "string" ? data.notice : "";
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
