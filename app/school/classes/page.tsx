import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Search = Promise<{ created?: string }>;

export default async function SchoolClassesPage(props: { searchParams: Search }) {
  const sp = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("org_memberships")
    .select("org_id, organizations(id, type)")
    .eq("profile_id", user!.id)
    .eq("is_active", true)
    .in("role", ["school_admin", "teacher"]);

  const schoolOrgId = memberships?.find((m) => {
    const o = m.organizations as { type?: string } | { type?: string }[] | null | undefined;
    const t = Array.isArray(o) ? o[0]?.type : o?.type;
    return t === "school";
  })?.org_id as string | undefined;

  const { data: classrooms } = schoolOrgId
    ? await supabase
        .from("classrooms")
        .select("id, name, grade_level, subject, academic_year")
        .eq("org_id", schoolOrgId)
        .eq("is_active", true)
        .order("name")
    : { data: null };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-kelvi-school-muted md:text-lg">
          Open a class to manage the roster, sessions, and parent invites.
        </p>
        <Link
          href="/school/classes/new"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-kelvi-teal px-6 py-3.5 text-lg font-medium text-white shadow-sm transition hover:bg-kelvi-teal-hover"
        >
          Add a class
        </Link>
      </div>

      {sp.created ? (
        <div className="rounded-lg border border-kelvi-teal/30 bg-kelvi-teal/10 px-4 py-3 text-base text-kelvi-school-ink">
          Class created. You can open it below when we add the class detail page.
        </div>
      ) : null}

      {!classrooms?.length ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/60 px-6 py-14 text-center">
          <p className="font-serif text-xl text-kelvi-school-ink">No classes yet</p>
          <p className="mt-2 text-base text-kelvi-school-muted">
            Create your first class to get started with rosters and student work.
          </p>
          <Link
            href="/school/classes/new"
            className="mt-6 inline-flex rounded-lg bg-kelvi-teal px-4 py-2.5 text-base font-medium text-white hover:bg-kelvi-teal-hover"
          >
            Add a class
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {classrooms.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-2 px-6 py-5 text-left sm:flex-row sm:items-center sm:justify-between sm:py-6"
            >
              <div>
                <p className="text-lg font-semibold text-kelvi-school-ink md:text-xl">{c.name}</p>
                <p className="mt-1 text-base text-kelvi-school-muted">
                  {[c.grade_level, c.subject, c.academic_year].filter(Boolean).join(" · ") ||
                    "Class workspace"}
                </p>
              </div>
              <span className="text-base text-kelvi-school-muted/90">Detail view coming soon</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center">
        <Link href="/school" className="text-lg font-medium text-kelvi-teal hover:text-kelvi-teal-hover">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}
