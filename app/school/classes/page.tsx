import Link from "next/link";

/** Placeholder for Phase 2 — list classes from DB and expandable rosters. */
export default function SchoolClassesPage() {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-kelvi-school-muted">
        Classes and rosters will load from your school organization. For now, this is a placeholder
        shell aligned with the school workspace layout.
      </p>
      <div className="rounded-xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
        <p className="font-serif text-lg text-kelvi-school-ink">No classes yet</p>
        <p className="mt-2 text-sm text-kelvi-school-muted">
          When your org has class data, you&apos;ll expand rows here to see students and sessions.
        </p>
        <Link
          href="/school"
          className="mt-6 inline-block text-sm font-medium text-kelvi-teal hover:text-kelvi-teal-hover"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
