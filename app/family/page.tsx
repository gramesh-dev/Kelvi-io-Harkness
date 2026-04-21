import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, display_name, grade_level");

  const { data: recentSessions } = await supabase
    .from("learning_sessions")
    .select("id, topic, mode, started_at, ended_at, message_count, students(display_name, full_name)")
    .order("started_at", { ascending: false })
    .limit(5);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <h1 className="font-serif text-3xl font-bold text-kelvi-ink mb-1">
        Welcome, {profile?.full_name?.split(" ")[0] ?? "there"}
      </h1>
      <p className="text-text-secondary mb-8">
        Here&apos;s what&apos;s happening in your family&apos;s learning space.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Children</p>
          <p className="text-3xl font-bold">{students?.length ?? 0}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Sessions today</p>
          <p className="text-3xl font-bold">
            {recentSessions?.filter(
              (s) =>
                new Date(s.started_at).toDateString() ===
                new Date().toDateString()
            ).length ?? 0}
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Total messages</p>
          <p className="text-3xl font-bold">
            {recentSessions?.reduce(
              (sum, s) => sum + (s.message_count ?? 0),
              0
            ) ?? 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-kelvi-ink">
              Your children
            </h2>
            <Link
              href="/family/children"
              className="text-sm text-kelvi-600 hover:underline"
            >
              Manage
            </Link>
          </div>
          {students && students.length > 0 ? (
            <ul className="space-y-3">
              {students.map((s: any) => (
                <li key={s.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-kelvi-100 flex items-center justify-center text-kelvi-700 text-sm font-medium">
                    {(s.display_name || s.full_name).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {s.display_name || s.full_name}
                    </p>
                    {s.grade_level && (
                      <p className="text-xs text-text-muted">
                        Grade {s.grade_level}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-text-muted mb-3">
                No children added yet
              </p>
              <Link
                href="/family/children"
                className="text-sm text-kelvi-600 font-medium hover:underline"
              >
                Add your first child
              </Link>
            </div>
          )}
        </div>

        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-kelvi-ink">
              Recent sessions
            </h2>
            <Link
              href="/family/learn"
              className="text-sm text-kelvi-600 hover:underline"
            >
              Start learning
            </Link>
          </div>
          {recentSessions && recentSessions.length > 0 ? (
            <ul className="space-y-3">
              {recentSessions.map((s: any) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium">{s.topic || s.mode}</p>
                    <p className="text-xs text-text-muted">
                      {(s.students as any)?.display_name ||
                        (s.students as any)?.full_name}{" "}
                      · {s.message_count} messages
                    </p>
                  </div>
                  <p className="text-xs text-text-muted">
                    {new Date(s.started_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-text-muted">No sessions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
