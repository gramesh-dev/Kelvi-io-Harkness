"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  email: string;
  fullName: string;
  tierLabel: string;
  productLabel: string;
  homeHref: string;
};

export function MyAccountPanel({
  email,
  fullName,
  tierLabel,
  productLabel,
  homeHref,
}: Props) {
  const [phrase, setPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const required = "DELETE";

  async function handleDeleteAccount() {
    if (phrase.trim().toUpperCase() !== required) {
      setError(`Type ${required} to confirm.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : "Could not delete account.");
        setLoading(false);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-8">
      <div>
        <nav className="text-sm text-text-muted mb-4">
          <Link href={homeHref} className="hover:text-kelvi-600 transition">
            ← Back to dashboard
          </Link>
        </nav>
        <h1 className="font-serif text-3xl font-bold text-kelvi-ink mb-1">
          My account
        </h1>
        <p className="text-text-secondary">
          {productLabel} · sign-in and plan
        </p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
            Name
          </p>
          <p className="text-kelvi-ink font-medium">{fullName}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
            Email
          </p>
          <p className="text-kelvi-ink">{email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
            Account level
          </p>
          <p className="inline-flex items-center rounded-full border border-border bg-kelvi-cream px-3 py-1 text-sm font-medium text-kelvi-ink">
            {tierLabel}
          </p>
          <p className="text-xs text-text-muted mt-2">
            Premium and school plans will appear here when your workspace is upgraded.
          </p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-red-200 p-6 space-y-4">
        <h2 className="font-serif text-lg font-semibold text-kelvi-ink">
          Delete account
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Permanently delete your Kelvi sign-in and data this app can remove for your
          account (sessions you started, invitations you created, and related records).
          This cannot be undone.
        </p>
        {error && (
          <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="delete-confirm"
            className="block text-xs font-medium text-text-secondary mb-1"
          >
            Type <span className="font-mono font-semibold">{required}</span> to confirm
          </label>
          <input
            id="delete-confirm"
            type="text"
            autoComplete="off"
            value={phrase}
            onChange={(e) => {
              setPhrase(e.target.value);
              setError(null);
            }}
            className="w-full max-w-xs px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder={required}
          />
        </div>
        <button
          type="button"
          disabled={
            loading || phrase.trim().toUpperCase() !== required
          }
          onClick={handleDeleteAccount}
          className="px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </div>
  );
}
