import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "@/app/roster-invite/[token]/accept-invite-button";

export default async function RosterInvitePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-kelvi-cream px-4 py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-medium text-kelvi-ink">Join a Kelvi class</h1>
        <p className="mt-3 text-base leading-relaxed text-kelvi-slate">
          Your teacher sent you an invitation. When you accept, we create your child&apos;s learner
          profile, link you as parent, and enroll them in the class.
        </p>

        {!user ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm font-medium text-kelvi-slate">Sign in with the email the teacher used.</p>
            <Link
              href={`/login?next=${encodeURIComponent(`/roster-invite/${token}`)}`}
              className="flex w-full justify-center rounded-xl border border-border bg-white py-3.5 text-center text-base font-medium text-kelvi-ink transition hover:bg-surface-secondary"
            >
              Sign in
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(`/roster-invite/${token}`)}`}
              className="flex w-full justify-center rounded-xl bg-kelvi-teal py-3.5 text-center text-base font-medium text-white transition hover:bg-kelvi-teal-hover"
            >
              Create account
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-kelvi-slate">
              Signed in as <strong className="text-kelvi-ink">{user.email}</strong>
            </p>
            <AcceptInviteButton token={token} />
          </div>
        )}

        <p className="mt-8 text-center text-sm text-kelvi-slate">
          <Link href="/" className="text-kelvi-teal hover:underline">
            Back to Kelvi
          </Link>
        </p>
      </div>
    </div>
  );
}
