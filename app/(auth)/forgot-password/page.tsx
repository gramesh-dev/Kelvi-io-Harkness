"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { KelviWordmark } from "@/components/kelvi-wordmark";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const origin = window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${origin}/callback?next=${encodeURIComponent("/reset-password")}`,
      }
    );

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kelvi-cream px-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <KelviWordmark />
          </div>
          <div className="bg-surface rounded-xl border border-border p-8 text-center space-y-4">
            <h1 className="font-serif text-xl font-semibold text-kelvi-ink">
              Check your email
            </h1>
            <p className="text-kelvi-slate text-sm leading-relaxed">
              If an account exists for <strong>{email}</strong>, we sent a link
              to reset your password. It may take a minute to arrive.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm text-kelvi-600 font-medium hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-kelvi-cream px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <KelviWordmark />
          <p className="mt-3 text-kelvi-slate">Reset your password</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-xl border border-border p-8 space-y-5"
        >
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <p className="text-sm text-text-secondary">
            Enter the email you use for Kelvi. We&apos;ll send a link to choose
            a new password.
          </p>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-kelvi-600 text-white font-medium rounded-lg hover:bg-kelvi-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>

          <p className="text-center text-sm text-text-secondary">
            <Link href="/login" className="text-kelvi-600 font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
