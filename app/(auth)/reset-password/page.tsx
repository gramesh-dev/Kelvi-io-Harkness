"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KelviWordmark } from "@/components/kelvi-wordmark";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionOk, setSessionOk] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionOk(!!user);
      setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?reset=success");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-kelvi-cream px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <KelviWordmark />
          <p className="mt-3 text-kelvi-slate">Choose a new password</p>
        </div>

        {!ready ? (
          <div className="bg-surface rounded-xl border border-border p-8 text-center text-sm text-text-secondary">
            Loading…
          </div>
        ) : !sessionOk ? (
          <div className="bg-surface rounded-xl border border-border p-8 space-y-4 text-center">
            <p className="text-sm text-red-700">
              This link is invalid or has expired. Request a new reset from the
              sign-in page.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block text-sm text-kelvi-600 font-medium hover:underline"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-surface rounded-xl border border-border p-8 space-y-5"
          >
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                Confirm new password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-kelvi-600 text-white font-medium rounded-lg hover:bg-kelvi-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
