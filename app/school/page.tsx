import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SchoolDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const first = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-10">
      <section className="text-center">
        <h2 className="font-serif text-2xl font-normal text-kelvi-school-ink md:text-3xl">
          Welcome back, {first}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-kelvi-school-muted">
          Your school workspace: classes, rosters, student sessions, and parent invites will
          connect here as we roll them out.
        </p>
      </section>

      <section className="mx-auto grid max-w-xl gap-3 border border-border bg-surface px-0 py-0 rounded-xl overflow-hidden">
        <Link
          href="/school/classes"
          className="group flex items-center justify-between gap-4 border-b border-border px-5 py-4 text-left transition hover:bg-kelvi-school-surface/90"
        >
          <span className="text-sm text-kelvi-school-muted transition group-hover:text-kelvi-school-ink">
            View classes &amp; rosters
          </span>
          <span className="text-kelvi-school-muted/50" aria-hidden>
            →
          </span>
        </Link>
        <Link
          href="/school/account"
          className="group flex items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-kelvi-school-surface/90"
        >
          <span className="text-sm text-kelvi-school-muted transition group-hover:text-kelvi-school-ink">
            Settings &amp; account
          </span>
          <span className="text-kelvi-school-muted/50" aria-hidden>
            →
          </span>
        </Link>
      </section>
    </div>
  );
}
