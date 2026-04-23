"use client";

import { useState } from "react";

const PLANET_EMOJI: Record<string, string> = {
  geometry: "⬡",
  number: "∞",
  puzzle: "◈",
  algebra: "χ",
  measurement: "⊕",
  data: "◎",
};

const PLANET_GRADIENT: Record<string, string> = {
  geometry: "from-amber-400 to-amber-600",
  number: "from-sky-400 to-sky-600",
  puzzle: "from-violet-400 to-violet-600",
  algebra: "from-emerald-400 to-emerald-600",
  measurement: "from-rose-400 to-rose-600",
  data: "from-teal-400 to-teal-600",
};

function getPlanetKey(planet: string | undefined | null, topic: string | null): string {
  const raw = (planet ?? topic ?? "").toLowerCase();
  for (const key of Object.keys(PLANET_EMOJI)) {
    if (raw.includes(key)) return key;
  }
  return "geometry";
}

function relativeDay(dateStr: string): string {
  const diff = Math.floor(
    (new Date().setHours(0, 0, 0, 0) - new Date(new Date(dateStr).setHours(0, 0, 0, 0))) /
      86400000
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

export type ChildSession = {
  id: string;
  topic: string | null;
  started_at: string;
  message_count: number;
  metadata: { planet?: string } | null;
};

export type ChildData = {
  id: string;
  display: string;
  grade_level: string | null;
  sessions: ChildSession[];
  streak: number;
  stars: number;
};

function ChildDashboard({ child }: { child: ChildData }) {
  const galaxyHref = `/family/family.html?student=${encodeURIComponent(child.id)}&name=${encodeURIComponent(child.display)}`;
  const initial = child.display.charAt(0).toUpperCase();

  const planetsVisited = Array.from(
    new Set(
      child.sessions.map((s) =>
        getPlanetKey(s.metadata?.planet, s.topic)
      )
    )
  );

  const recent = child.sessions.slice(0, 5);

  return (
    <div className="rounded-2xl overflow-hidden bg-gradient-to-b from-[#0D0C1C] via-[#12103A] to-[#1A1840] text-white">
      {/* Hero */}
      <div className="text-center pt-10 pb-6 px-6">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_40px_rgba(245,200,80,0.55)]">
          {initial}
        </div>
        <h3 className="font-serif text-3xl font-bold text-amber-200 mb-1">
          {child.display}
        </h3>
        {child.grade_level && (
          <p className="text-amber-300/50 text-xs uppercase tracking-widest font-semibold">
            Grade {child.grade_level}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-6 pb-6">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
          <p className="text-3xl font-bold text-amber-300">{child.sessions.length}</p>
          <p className="text-xs text-white/40 uppercase tracking-wider mt-1 font-semibold">Adventures</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
          <p className="text-3xl font-bold text-sky-300">
            {child.streak}<span className="text-xl ml-0.5">🔥</span>
          </p>
          <p className="text-xs text-white/40 uppercase tracking-wider mt-1 font-semibold">Day streak</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
          <p className="text-3xl font-bold text-yellow-300">
            {child.stars > 0 ? "⭐".repeat(Math.min(child.stars, 5)) : "—"}
          </p>
          <p className="text-xs text-white/40 uppercase tracking-wider mt-1 font-semibold">Stars</p>
        </div>
      </div>

      {/* Planets explored */}
      {planetsVisited.length > 0 && (
        <div className="px-6 pb-6">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3">
            Planets explored
          </p>
          <div className="flex flex-wrap gap-2">
            {planetsVisited.map((key) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${PLANET_GRADIENT[key] ?? "from-gray-400 to-gray-600"} shadow-md`}
              >
                <span>{PLANET_EMOJI[key]}</span>
                <span className="capitalize">{key}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent adventures */}
      <div className="px-6 pb-6">
        <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3">
          Recent adventures
        </p>
        {recent.length > 0 ? (
          <ul className="space-y-2">
            {recent.map((s) => {
              const key = getPlanetKey(s.metadata?.planet, s.topic);
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/8 px-3 py-2.5"
                >
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${PLANET_GRADIENT[key] ?? "from-gray-400 to-gray-600"} flex items-center justify-center text-sm shrink-0`}
                  >
                    {PLANET_EMOJI[key]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {s.topic || "Galaxy exploration"}
                    </p>
                    <p className="text-xs text-white/35">{relativeDay(s.started_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-amber-300">{s.message_count ?? 0}</p>
                    <p className="text-xs text-white/35">msgs</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-white/30 italic">
            No adventures yet — open the galaxy to start!
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 pb-8 text-center">
        <a
          href={galaxyHref}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-[#0D0C1C] font-bold text-base shadow-[0_0_28px_rgba(245,200,80,0.4)] hover:shadow-[0_0_44px_rgba(245,200,80,0.6)] transition-all hover:-translate-y-0.5"
        >
          ✦ Open {child.display}&apos;s galaxy
        </a>
      </div>
    </div>
  );
}

export function ChildTabsPanel({ children }: { children: ChildData[] }) {
  const [active, setActive] = useState(0);

  if (!children.length) return null;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 mb-4 border-b border-kelvi-100 pb-0">
        {children.map((child, i) => (
          <button
            key={child.id}
            onClick={() => setActive(i)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all -mb-px ${
              active === i
                ? "border-kelvi-teal text-kelvi-teal bg-kelvi-teal/5"
                : "border-transparent text-text-muted hover:text-kelvi-ink"
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-kelvi-300 to-kelvi-600 flex items-center justify-center text-white text-xs font-bold">
              {child.display.charAt(0).toUpperCase()}
            </span>
            {child.display}
            {child.sessions.length > 0 && (
              <span className="ml-0.5 text-xs font-medium text-text-faint">
                {child.sessions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel */}
      <ChildDashboard child={children[active]} />
    </div>
  );
}
