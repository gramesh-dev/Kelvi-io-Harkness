import Link from "next/link";

export default function SchoolDashboardPage() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-10 pb-10 pt-4">
      <section className="mx-auto grid w-full max-w-2xl gap-3 overflow-hidden rounded-xl border border-border bg-surface px-0 py-0">
        <Link
          href="/school/classes"
          className="group flex items-center justify-between gap-4 border-b border-border px-6 py-5 text-left transition hover:bg-kelvi-school-surface/90 md:py-6"
        >
          <span className="text-lg text-kelvi-school-ink/80 transition group-hover:text-kelvi-school-ink md:text-xl">
            View classes &amp; rosters
          </span>
          <span className="text-kelvi-school-muted/50" aria-hidden>
            →
          </span>
        </Link>
        <Link
          href="/school/account"
          className="group flex items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-kelvi-school-surface/90 md:py-6"
        >
          <span className="text-lg text-kelvi-school-ink/80 transition group-hover:text-kelvi-school-ink md:text-xl">
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
