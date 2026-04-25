import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PLANET_EMOJI: Record<string, string> = {
  geometry: "⬡",
  number: "∞",
  puzzle: "◈",
  algebra: "χ",
  measurement: "⊕",
  data: "◎",
};

const PLANET_COLOR: Record<string, string> = {
  geometry: "from-amber-400 to-amber-600",
  number: "from-sky-400 to-sky-600",
  puzzle: "from-violet-400 to-violet-600",
  algebra: "from-emerald-400 to-emerald-600",
  measurement: "from-rose-400 to-rose-600",
  data: "from-teal-400 to-teal-600",
};

function getPlanetKey(topic: string | null): string {
  if (!topic) return "geometry";
  const t = topic.toLowerCase();
  for (const key of Object.keys(PLANET_EMOJI)) {
    if (t.includes(key)) return key;
  }
  return "geometry";
}

function streak(sessions: { started_at: string }[]): number {
  if (!sessions.length) return 0;
  const days = new Set(
    sessions.map((s) => new Date(s.started_at).toDateString())
  );
  let count = 0;
  const today = new Date();
  while (true) {
    if (days.has(today.toDateString())) {
      count++;
      today.setDate(today.getDate() - 1);
    } else {
      break;
    }
  }
  return count;
}

export default async function KidDashboardPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, display_name, grade_level")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) notFound();

  const display = student.display_name || student.full_name;
  const initial = display.charAt(0).toUpperCase();

  const { data: sessions } = await supabase
    .from("learning_sessions")
    .select("id, topic, started_at, ended_at, message_count, metadata")
    .eq("student_id", studentId)
    .order("started_at", { ascending: false });

  const allSessions = sessions ?? [];
  const totalSessions = allSessions.length;
  const totalMessages = allSessions.reduce(
    (sum, s) => sum + (s.message_count ?? 0),
    0
  );
  const currentStreak = streak(allSessions);

  // Planets visited (unique)
  const planetsVisited = new Set(
    allSessions
      .map((s) => {
        const meta = s.metadata as { planet?: string } | null;
        return getPlanetKey(meta?.planet ?? s.topic);
      })
      .filter(Boolean)
  );

  const recentSessions = allSessions.slice(0, 6);

  const galaxyHref = `/family/family.html?student=${encodeURIComponent(student.id)}&name=${encodeURIComponent(display)}`;

  // Star count for gamification (1 star per 5 messages)
  const stars = Math.floor(totalMessages / 5);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D0C1C] via-[#12103A] to-[#1A1840] text-white">
      {/* Back nav */}
      <div className="px-6 pt-6">
        <Link
          href="/family"
          className="inline-flex items-center gap-2 text-sm text-amber-200/70 hover:text-amber-200 transition"
        >
          ← Family home
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-20">
        {/* Hero */}
        <div className="text-center py-12">
          <div className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center text-4xl font-bold bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_48px_rgba(245,200,80,0.5)]">
            {initial}
          </div>
          <h1 className="font-serif text-5xl font-bold text-amber-200 mb-2">
            {display}
          </h1>
          {student.grade_level && (
            <p className="text-amber-300/60 text-sm uppercase tracking-widest font-medium">
              Grade {student.grade_level}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
            <p className="text-4xl font-bold text-amber-300">{totalSessions}</p>
            <p className="text-xs text-white/50 uppercase tracking-wider mt-1 font-medium">
              Adventures
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
            <p className="text-4xl font-bold text-sky-300">
              {currentStreak}
              <span className="text-2xl ml-1">🔥</span>
            </p>
            <p className="text-xs text-white/50 uppercase tracking-wider mt-1 font-medium">
              Day streak
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
            <p className="text-4xl font-bold text-yellow-300">
              {"⭐".repeat(Math.min(stars, 5)) || "0"}
            </p>
            <p className="text-xs text-white/50 uppercase tracking-wider mt-1 font-medium">
              Stars earned
            </p>
          </div>
        </div>

        {/* Planets visited */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-white/70 mb-4 uppercase tracking-wider text-sm">
            Planets explored
          </h2>
          {planetsVisited.size > 0 ? (
            <div className="flex flex-wrap gap-3">
              {Array.from(planetsVisited).map((planet) => (
                <div
                  key={planet}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r ${PLANET_COLOR[planet] ?? "from-gray-400 to-gray-600"} shadow-lg`}
                >
                  <span className="text-lg font-bold text-white/90">
                    {PLANET_EMOJI[planet]}
                  </span>
                  <span className="text-sm font-semibold text-white capitalize">
                    {planet}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/40 text-sm">
              No planets explored yet — open the galaxy to start!
            </p>
          )}
        </div>

        {/* Recent sessions */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">
            Recent adventures
          </h2>
          {recentSessions.length > 0 ? (
            <ul className="space-y-3">
              {recentSessions.map((s) => {
                const meta = s.metadata as { planet?: string } | null;
                const planetKey = getPlanetKey(meta?.planet ?? s.topic);
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                  >
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${PLANET_COLOR[planetKey] ?? "from-gray-400 to-gray-600"} flex items-center justify-center text-lg shrink-0`}
                    >
                      {PLANET_EMOJI[planetKey]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">
                        {s.topic || "Galaxy exploration"}
                      </p>
                      <p className="text-xs text-white/40">
                        {new Date(s.started_at).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-300">
                        {s.message_count ?? 0}
                      </p>
                      <p className="text-xs text-white/40">msgs</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
              <p className="text-white/40 text-sm mb-4">
                No adventures yet. Time to explore!
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href={galaxyHref}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-[#0D0C1C] font-bold text-lg shadow-[0_0_32px_rgba(245,200,80,0.4)] hover:shadow-[0_0_48px_rgba(245,200,80,0.6)] transition-all hover:-translate-y-0.5"
          >
            ✦ Open the galaxy
          </a>
        </div>
      </div>
    </div>
  );
}
