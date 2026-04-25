import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function StudentSessionsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, display_name")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    notFound();
  }

  const display = student.display_name || student.full_name;

  const { data: sessions } = await supabase
    .from("learning_sessions")
    .select("id, topic, mode, started_at, ended_at, message_count")
    .eq("student_id", studentId)
    .order("started_at", { ascending: false });

  const portalHref = `/family/family.html?student=${encodeURIComponent(student.id)}&name=${encodeURIComponent(display)}`;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <nav className="text-sm text-text-muted mb-4">
        <Link href="/family/children" className="hover:text-kelvi-600 transition">
          ← Children
        </Link>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-kelvi-ink mb-1">
            {display}
          </h1>
          <p className="text-text-secondary">
            Learning sessions for this child (newest first).
          </p>
        </div>
        <a
          href={portalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-kelvi-600 text-white text-sm font-medium hover:bg-kelvi-700 transition shrink-0"
        >
          Open student portal (Galaxy)
        </a>
      </div>

      {sessions && sessions.length > 0 ? (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-kelvi-cream/80 text-left text-text-muted">
                <th className="px-4 py-3 font-medium">Topic / mode</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">
                  Started
                </th>
                <th className="px-4 py-3 font-medium">Messages</th>
                <th className="px-4 py-3 font-medium w-28"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-kelvi-ink">
                      {s.topic || s.mode}
                    </p>
                    <p className="text-xs text-text-muted capitalize">{s.mode}</p>
                  </td>
                  <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">
                    {new Date(s.started_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {s.message_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/family/learn/${s.id}`}
                      className="text-kelvi-600 font-medium hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border p-8 text-center text-text-secondary">
          <p className="mb-3">No sessions yet for {display}.</p>
          <Link
            href="/family/learn"
            className="text-kelvi-600 font-medium hover:underline"
          >
            Start a learning session
          </Link>
        </div>
      )}
    </div>
  );
}
