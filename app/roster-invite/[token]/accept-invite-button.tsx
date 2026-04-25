"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptRosterInviteAction } from "@/app/roster-invite/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await acceptRosterInviteAction(token);
            if (r && "error" in r && r.error) {
              setError(r.error);
              return;
            }
            router.push("/family");
            router.refresh();
          });
        }}
        className="w-full rounded-xl bg-kelvi-teal px-6 py-4 text-lg font-medium text-white shadow-sm transition hover:bg-kelvi-teal-hover disabled:opacity-50"
      >
        {pending ? "Accepting…" : "Accept invitation"}
      </button>
    </div>
  );
}
