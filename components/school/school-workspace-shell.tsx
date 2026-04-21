"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useState } from "react";

const paths = {
  dashboard: "/school",
  classes: "/school/classes",
  account: "/school/account",
} as const;

function titleForPath(pathname: string): { title: string; meta?: string } {
  if (pathname === paths.dashboard || pathname === "/school/") {
    return { title: "Dashboard", meta: "Overview and activity" };
  }
  if (pathname.startsWith(paths.classes)) {
    return { title: "Classes", meta: "Rosters and assignments" };
  }
  if (pathname.startsWith(paths.account)) {
    return { title: "Settings & account", meta: "Profile and membership" };
  }
  return { title: "School", meta: undefined };
}

function IconHome(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

function IconChats(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function IconLibrary(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function IconSettings(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function KelviTriLogo({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle cx="14" cy="6" r="5" fill="#B8784E" />
      <circle cx="6" cy="21" r="5" fill="#3A6B5C" />
      <circle cx="22" cy="21" r="5" fill="#5A7080" />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (p: string) => boolean;
  disabled?: boolean;
};

export function SchoolWorkspaceShell({
  children,
  orgName,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  orgName?: string;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  const main = titleForPath(pathname ?? "");

  const navPrimary: NavItem[] = [
    {
      href: paths.dashboard,
      label: "Home",
      icon: <IconHome className="h-4 w-4 shrink-0 opacity-70" />,
      match: (p) => p === paths.dashboard || p === "/school/",
    },
    {
      href: "#",
      label: "My chats",
      icon: <IconChats className="h-4 w-4 shrink-0 opacity-70" />,
      match: () => false,
      disabled: true,
    },
    {
      href: "#",
      label: "Math library",
      icon: <IconLibrary className="h-4 w-4 shrink-0 opacity-70" />,
      match: () => false,
      disabled: true,
    },
  ];

  const navAfterClasses: NavItem[] = [
    {
      href: paths.account,
      label: "Settings & account",
      icon: <IconSettings className="h-4 w-4 shrink-0 opacity-70" />,
      match: (p) => p.startsWith(paths.account),
    },
  ];

  function NavButton({ item }: { item: NavItem }) {
    const active = item.match(pathname ?? "");
    const base =
      "flex items-center gap-2.5 rounded-lg px-4 py-2 text-[13px] transition-colors";
    if (item.disabled) {
      return (
        <div
          className={`${base} cursor-not-allowed text-kelvi-school-muted/70`}
          title="Coming soon"
        >
          {item.icon}
          <span>{item.label}</span>
        </div>
      );
    }
    return (
      <Link
        href={item.href}
        className={`${base} ${
          active
            ? "bg-kelvi-school-deep text-kelvi-school-ink font-medium"
            : "text-kelvi-school-muted hover:bg-kelvi-school-deep/80 hover:text-kelvi-school-ink"
        }`}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-kelvi-school-bg text-kelvi-school-ink">
      {/* Sidebar — prototype width 240px */}
      <aside
        className={`relative flex h-full w-[240px] shrink-0 flex-col border-r border-border bg-kelvi-school-surface transition-[width,opacity] duration-200 md:w-[240px] ${
          sidebarOpen ? "opacity-100" : "w-0 overflow-hidden border-0 p-0 opacity-0 md:w-0"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="shrink-0 border-b border-border px-4 pb-3 pt-4">
          <Link href="/school" className="sb-brand flex items-center gap-2 font-serif text-lg font-normal text-kelvi-teal">
            <KelviTriLogo />
            <span>Kelvi</span>
          </Link>
          {orgName ? (
            <p className="mt-2 truncate pl-[30px] text-[11px] text-kelvi-school-muted" title={orgName}>
              {orgName}
            </p>
          ) : (
            <p className="mt-2 pl-[30px] text-[11px] text-kelvi-school-muted">School workspace</p>
          )}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
          {navPrimary.map((item) => (
            <NavButton key={item.label} item={item} />
          ))}

          <div className="mt-3 flex items-center justify-between px-4 pb-1 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-kelvi-school-muted/80">
              Classes
            </span>
            <span
              className="text-kelvi-school-muted/50 cursor-not-allowed text-lg leading-none"
              title="Coming soon"
              aria-hidden
            >
              +
            </span>
          </div>

          <Link
            href={paths.classes}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] transition-colors ${
              pathname?.startsWith(paths.classes)
                ? "bg-kelvi-school-deep font-medium text-kelvi-school-ink"
                : "text-kelvi-school-muted hover:bg-kelvi-school-deep/80 hover:text-kelvi-school-ink"
            }`}
          >
            <svg width="7" height="7" viewBox="0 0 28 28" fill="none" className="shrink-0" aria-hidden>
              <circle cx="14" cy="6" r="5" fill="#B8784E" />
              <circle cx="6" cy="21" r="5" fill="#3A6B5C" />
              <circle cx="22" cy="21" r="5" fill="#5A7080" />
            </svg>
            <span>All classes</span>
          </Link>

          <div className="my-2 h-px shrink-0 bg-border" />

          {navAfterClasses.map((item) => (
            <NavButton key={item.label} item={item} />
          ))}
        </nav>

        <div className="shrink-0 border-t border-border px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-kelvi-teal text-[10px] font-semibold text-white">
              {(userName || userEmail).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-kelvi-school-muted">{userName || userEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-2 w-full rounded-md py-1.5 text-left text-[11px] text-kelvi-school-muted/90 transition hover:text-kelvi-school-ink"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-kelvi-school-bg px-4 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="rounded-md p-1.5 text-kelvi-school-muted transition hover:bg-kelvi-school-deep/50 hover:text-kelvi-school-ink"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <svg className="h-5 w-5 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg className="hidden h-5 w-5 md:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {sidebarOpen ? (
                  <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                ) : (
                  <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                )}
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-serif text-[15px] font-medium text-kelvi-school-ink md:text-base">{main.title}</h1>
              {main.meta ? (
                <p className="hidden truncate text-[11px] text-kelvi-school-muted sm:block">{main.meta}</p>
              ) : null}
            </div>
          </div>
        </header>

        {/* Knowledge strip — matches prototype bar; content TBD */}
        <div className="flex min-h-[36px] shrink-0 flex-wrap items-center gap-2 border-b border-border bg-kelvi-school-surface/80 px-4 py-2 text-[11px] text-kelvi-school-muted md:px-5">
          <span className="font-bold uppercase tracking-wide text-kelvi-school-muted/70">Knowledge</span>
          <span className="text-kelvi-school-muted/60">—</span>
          <span className="text-kelvi-school-muted/90">Class resources and assignments will appear here.</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
