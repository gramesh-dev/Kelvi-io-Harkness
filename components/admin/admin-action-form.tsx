"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Wraps an admin mutation form. Submits to /api/admin/actions via fetch
 * (Route Handlers correctly read session cookies on Vercel; Server Actions do not).
 *
 * Props:
 *   action   – one of the action keys handled by the API route
 *   fields   – hidden field values merged into the POST body
 *   onDone   – optional callback after success (default: router.refresh())
 *   children – the visible form content (inputs, buttons)
 */
export function AdminActionForm({
  action,
  fields = {},
  onDone,
  className,
  children,
}: {
  action: string;
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

    // Collect visible form fields
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

    // roles[] checkboxes → array
    const roles = formData.getAll("roles") as string[];
    if (roles.length > 0) body["roles"] = roles;

    try {
      // Get the current access token from the browser-side Supabase client.
      // This is more reliable than relying on cookies being present in the
      // POST request (cookie forwarding is inconsistent on Vercel for POSTs).
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // Session is gone — send to login so the user can re-authenticate.
        window.location.href = "/login?next=/admin";
        return;
      }

      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

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
