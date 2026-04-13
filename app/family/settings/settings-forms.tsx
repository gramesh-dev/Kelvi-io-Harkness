"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateFullName } from "./actions";

interface SettingsFormsProps {
  initialFullName: string;
  email: string;
}

export function SettingsForms({ initialFullName, email }: SettingsFormsProps) {
  const router = useRouter();
  const [nameMsg, setNameMsg] = useState<{ ok?: string; err?: string }>({});
  const [pwMsg, setPwMsg] = useState<{ ok?: string; err?: string }>({});

  async function handleNameSubmit(formData: FormData) {
    setNameMsg({});
    const result = await updateFullName(formData);
    if (result?.error) {
      setNameMsg({ err: result.error });
      return;
    }
    setNameMsg({ ok: "Name updated." });
    router.refresh();
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwMsg({});
    const fd = new FormData(e.currentTarget);
    const next = (fd.get("newPassword") as string) ?? "";
    const confirm = (fd.get("confirmPassword") as string) ?? "";

    if (next.length < 6) {
      setPwMsg({ err: "Password must be at least 6 characters." });
      return;
    }
    if (next !== confirm) {
      setPwMsg({ err: "New passwords do not match." });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      setPwMsg({ err: error.message });
      return;
    }

    setPwMsg({ ok: "Password updated." });
    e.currentTarget.reset();
  }

  return (
    <div className="space-y-8">
      <section className="bg-surface rounded-xl border border-border p-6">
        <h2 className="font-serif font-semibold text-lg text-kelvi-ink mb-1">
          Your name
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          This is how you appear in Kelvi (header and dashboards).
        </p>
        <form action={handleNameSubmit} className="space-y-4 max-w-md">
          {nameMsg.err && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {nameMsg.err}
            </p>
          )}
          {nameMsg.ok && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              {nameMsg.ok}
            </p>
          )}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              defaultValue={initialFullName}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium bg-kelvi-600 text-white rounded-lg hover:bg-kelvi-700 transition"
          >
            Save name
          </button>
        </form>
      </section>

      <section className="bg-surface rounded-xl border border-border p-6">
        <h2 className="font-serif font-semibold text-lg text-kelvi-ink mb-1">
          Password
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Signed in as <span className="font-medium text-text-primary">{email}</span>.
          Choose a strong password you haven&apos;t used elsewhere.
        </p>
        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-4 max-w-md"
          autoComplete="on"
        >
          {pwMsg.err && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {pwMsg.err}
            </p>
          )}
          {pwMsg.ok && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              {pwMsg.ok}
            </p>
          )}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              New password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium bg-kelvi-600 text-white rounded-lg hover:bg-kelvi-700 transition"
          >
            Update password
          </button>
        </form>
      </section>
    </div>
  );
}
