"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KelviWordmark } from "@/components/kelvi-wordmark";
import {
  resolvePrimaryHomePath,
  type MembershipRow,
} from "@/lib/auth/home-path";

export type LoginIntent = "school" | "family" | null;

export function LoginForm({
  initialIntent,
  passwordResetOk: passwordResetOkProp,
}: {
  initialIntent: LoginIntent;
  passwordResetOk: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const signupHref =
    initialIntent === "school"
      ? "/signup?intent=school"
      : initialIntent === "family"
        ? "/signup?intent=family"
        : "/signup";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: signData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !signData.user) {
      setError(signInError?.message ?? "Sign in failed");
      setLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from("org_memberships")
      .select("role, organizations(type)")
      .eq("profile_id", signData.user.id)
      .eq("is_active", true);

    const nextPath = resolvePrimaryHomePath(
      memberships as MembershipRow[] | null
    );
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-kelvi-cream px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <KelviWordmark />
          <p className="mt-3 text-kelvi-slate text-center">
            {initialIntent === "school"
              ? "Sign in to Kelvi School"
              : initialIntent === "family"
                ? "Sign in to Kelvi Family"
                : "Welcome back"}
          </p>
          <p className="mt-1.5 text-xs text-kelvi-muted text-center max-w-xs">
            New here? Use Sign up below — it opens the right account type for
            this product.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-surface rounded-xl border border-border p-8 space-y-5"
        >
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {passwordResetOkProp && (
            <div className="p-3 rounded-lg bg-green-50 text-green-800 text-sm">
              Your password was updated. Sign in with your new password.
            </div>
          )}

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
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent"
              placeholder="••••••••"
            />
            <div className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-kelvi-600 font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-kelvi-600 text-white font-medium rounded-lg hover:bg-kelvi-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-center text-sm text-text-secondary">
            Don&apos;t have an account?{" "}
            <Link
              href={signupHref}
              className="text-kelvi-600 font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
