"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KelviWordmark } from "@/components/kelvi-wordmark";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // Must match an allowed Redirect URL in Supabase (Auth → URL configuration).
        // Without this, the confirmation link sends users to Site URL (/) and no session is created.
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kelvi-cream px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-surface rounded-xl border border-border p-8">
            <div className="w-12 h-12 bg-kelvi-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-kelvi-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="font-serif text-xl font-semibold text-kelvi-ink mb-2">
              Check your email
            </h2>
            <p className="text-text-secondary">
              We sent a confirmation link to <strong>{email}</strong>. Click it
              to activate your account. You should land on onboarding next.
            </p>
            <p className="text-text-muted text-xs mt-4 text-left leading-relaxed">
              If the link opens the homepage instead, add{" "}
              <code className="bg-surface-secondary px-1 rounded text-[11px]">
                {typeof window !== "undefined" ? window.location.origin : ""}
                /callback
              </code>{" "}
              under Supabase → Authentication → URL configuration → Redirect
              URLs, then sign up again or use Log in if you already confirmed.
            </p>
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
          <p className="mt-3 text-kelvi-slate">Create your family account</p>
        </div>

        <form
          onSubmit={handleSignup}
          className="bg-surface rounded-xl border border-border p-8 space-y-5"
        >
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Your name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
              placeholder="Jane Smith"
            />
          </div>

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
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-kelvi-600 text-white font-medium rounded-lg hover:bg-kelvi-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-kelvi-600 font-medium hover:underline"
            >
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
