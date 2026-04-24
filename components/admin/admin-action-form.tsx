"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

/**
 * Wraps an admin mutation form. Submits to /api/admin/actions via fetch.
 *
 * Auth uses a Bearer token passed as a prop from the server component — the
 * server reads the access token from the session cookie (which works reliably
 * server-side) and passes it down. This avoids depending on the browser
 * forwarding cookies with POST requests, which is inconsistent on Vercel.
 */
export function AdminActionForm({
  action,
  accessToken,
  fields = {},
  onDone,
  className,
  children,
}: {
  action: string;
  accessToken?: string | null;
  fields?: Record<string, string | string[]>;
  onDone?: (notice: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { action, ...fields };
    formData.forEach((value, key) => {
      if (key in body) {
        const existing = body[key];
        body[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
      } else {
        body[key] = value;
      }
    });

    const roles = formData.getAll("roles") as string[];
    if (roles.length > 0) body["roles"] = roles;

    console.log("posting admin action to /api/admin/actions", {
      action,
      origin: window.location.origin,
      hasToken: Boolean(accessToken),
    });

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || res.status === 403) {
        const detail = data.debug ? ` — debug: ${JSON.stringify(data.debug)}` : "";
        setError(`Not authenticated (${res.status}). Please refresh or log in again.${detail}`);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        setLoading(false);
        return;
      }

      formRef.current?.reset();
      if (onDone) {
        onDone(data.notice ?? "");
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
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <fieldset disabled={loading} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
