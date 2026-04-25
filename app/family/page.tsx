import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function calcStreak(sessions: { started_at: string }[]): number {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map((s) => new Date(s.started_at).toDateString()));
  let count = 0;
  const d = new Date();
  while (days.has(d.toDateString())) { count++; d.setDate(d.getDate() - 1); }
  return count;
}

function lastPlanet(sessions: { topic: string | null; metadata: unknown }[]): string | null {
  for (const s of sessions) {
    const meta = s.metadata as { planet?: string } | null;
    const key = meta?.planet?.toLowerCase();
    if (key) return key.charAt(0).toUpperCase() + key.slice(1);
    if (s.topic) return s.topic;
  }
  return null;
}

function relativeDay(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (today.getTime() - target.getTime()) / 86400000
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Per-child accent colours so cards feel distinct
const CHILD_THEMES = [
  {
    card: "from-teal-50 via-white to-amber-50 border-teal-200/60",
    avatar: "from-kelvi-teal to-teal-700",
    btn: "bg-kelvi-teal hover:bg-teal-700 text-white shadow-[0_4px_20px_rgba(0,90,88,0.35)]",
    planet: "bg-teal-100 text-teal-700",
    badge: "bg-teal-50 text-teal-700",
  },
  {
    card: "from-amber-50 via-white to-orange-50 border-amber-200/60",
    avatar: "from-amber-400 to-orange-500",
    btn: "bg-amber-500 hover:bg-amber-600 text-white shadow-[0_4px_20px_rgba(200,140,40,0.35)]",
    planet: "bg-amber-100 text-amber-700",
    badge: "bg-amber-50 text-amber-700",
  },
  {
    card: "from-violet-50 via-white to-pink-50 border-violet-200/60",
    avatar: "from-violet-500 to-purple-700",
    btn: "bg-violet-600 hover:bg-violet-700 text-white shadow-[0_4px_20px_rgba(120,60,200,0.35)]",
    planet: "bg-violet-100 text-violet-700",
    badge: "bg-violet-50 text-violet-700",
  },
];

export default async function FamilyDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles").select("full_name").eq("id", user!.id).single();

  const { data: students } = await supabase
    .from("students").select("id, full_name, display_name, grade_level");

  const { data: allSessions } = await supabase
    .from("learning_sessions")
    .select("id, student_id, topic, started_at, message_count, metadata")
    .order("started_at", { ascending: false })
    .limit(200);

  const sessions = allSessions ?? [];

  const byStudent: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    if (!byStudent[s.student_id]) byStudent[s.student_id] = [];
    byStudent[s.student_id].push(s);
  }

  const todayCount = sessions.filter(
    (s) => new Date(s.started_at).toDateString() === new Date().toDateString()
  ).length;

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* ── Greeting ── */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-kelvi-ink mb-1">
          {greeting()}, {firstName} 👋
        </h1>
      </div>

      {/* ── Child cards ── */}
      {students && students.length > 0 ? (
        <div className={`grid gap-5 mb-10 ${students.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-1 sm:grid-cols-2"}`}>
          {students.map((s: any, i: number) => {
            const theme = CHILD_THEMES[i % CHILD_THEMES.length];
            const display = s.display_name || s.full_name;
            const initial = display.charAt(0).toUpperCase();
            const childSessions = byStudent[s.id] ?? [];
            const streak = calcStreak(childSessions);
            const planet = lastPlanet(childSessions);
            const totalMsgs = childSessions.reduce((sum: number, cs: any) => sum + (cs.message_count ?? 0), 0);
            const stars = Math.min(Math.floor(totalMsgs / 5), 5);
            const galaxyHref = `/family/family.html?student=${encodeURIComponent(s.id)}&name=${encodeURIComponent(display)}`;

            return (
              <a
                key={s.id}
                href={galaxyHref}
                className={`group relative flex flex-col rounded-3xl border bg-gradient-to-br ${theme.card} p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-kelvi-400`}
              >
                {/* Decorative star */}
                <span className="absolute top-4 right-5 text-2xl opacity-20 group-hover:opacity-40 transition-opacity select-none">✦</span>

                {/* Avatar */}
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${theme.avatar} flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-md`}>
                  {initial}
                </div>

                {/* Name + grade */}
                <p className="text-xl font-bold text-kelvi-ink leading-tight">{display}</p>
                {s.grade_level && (
                  <p className="text-xs text-text-muted font-medium uppercase tracking-wide mt-0.5 mb-4">
                    Grade {s.grade_level}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}>
                    {childSessions.length} {childSessions.length === 1 ? "adventure" : "adventures"}
                  </span>
                  {streak > 0 && (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}>
                      {streak}🔥 streak
                    </span>
                  )}
                  {stars > 0 && (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}>
                      {"⭐".repeat(stars)}
                    </span>
                  )}
                </div>

                {/* Last planet */}
                {planet ? (
                  <p className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-semibold mb-5 ${theme.planet}`}>
                    ⬡ {planet} Planet
                  </p>
                ) : (
                  <p className="text-xs text-text-muted italic mb-5">No planets explored yet</p>
                )}

                {/* Open galaxy button */}
                <div className={`mt-auto rounded-xl px-4 py-2.5 text-sm font-bold text-center transition-all ${theme.btn} group-hover:scale-[1.02]`}>
                  Open {display}&apos;s galaxy ✦
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center mb-10">
          <p className="text-text-muted mb-3">No children added yet</p>
          <Link href="/family/children" className="text-sm text-kelvi-600 font-medium hover:underline">
            Add your first child →
          </Link>
        </div>
      )}

      {/* ── Parent summary (secondary) ── */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-base font-semibold text-kelvi-ink">Family overview</h2>
          <Link href="/family/children" className="text-xs text-kelvi-600 hover:underline font-medium">
            Manage children
          </Link>
        </div>

        {/* Mini stats */}
        <div className="flex gap-6 mb-4 pb-4 border-b border-border">
          <div>
            <p className="text-2xl font-bold text-kelvi-ink">{students?.length ?? 0}</p>
            <p className="text-xs text-text-muted">Children</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-kelvi-ink">{todayCount}</p>
            <p className="text-xs text-text-muted">Sessions today</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-kelvi-ink">
              {sessions.reduce((sum, s) => sum + (s.message_count ?? 0), 0)}
            </p>
            <p className="text-xs text-text-muted">Total messages</p>
          </div>
        </div>

        {/* Recent sessions */}
        {sessions.length > 0 ? (
          <ul className="space-y-2.5">
            {sessions.slice(0, 5).map((s) => {
              const meta = s.metadata as { planet?: string } | null;
              const planet = meta?.planet;
              const child = (students ?? []).find((st: any) => st.id === s.student_id);
              const childName = child ? (child.display_name || child.full_name) : null;
              return (
                <li key={s.id} className="flex items-center justify-between text-sm gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-kelvi-ink truncate">
                      {s.topic || (planet ? `${planet} Planet` : "Galaxy exploration")}
                    </p>
                    <p className="text-xs text-text-muted">
                      {[childName, s.message_count ? `${s.message_count} msgs` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="text-xs text-text-muted shrink-0">{relativeDay(s.started_at)}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-text-muted text-center py-2">No sessions yet</p>
        )}
      </div>

    </div>
  );
}
