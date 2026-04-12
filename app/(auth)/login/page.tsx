"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KelviWordmark } from "@/components/kelvi-wordmark";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordResetOk, setPasswordResetOk] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("reset") === "success") setPasswordResetOk(true);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-kelvi-cream px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <KelviWordmark />
          <p className="mt-3 text-kelvi-slate">Welcome back</p>
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

          {passwordResetOk && (
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
              href="/signup"
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
