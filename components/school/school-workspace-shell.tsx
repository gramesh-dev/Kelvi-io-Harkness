"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useState } from "react";

const paths = {
  dashboard: "/school",
  classes: "/school/classes",
  newClass: "/school/classes/new",
  account: "/school/account",
} as const;

/** e.g. "Jordan's dashboard" — first name; falls back to email local-part or "Your dashboard" */
function dashboardHeadingLabel(fullName: string, email: string): string {
  const raw = fullName?.trim() || email?.split("@")[0]?.trim() || "";
  if (!raw) return "Your dashboard";
  const first = raw.split(/\s+/)[0] ?? raw;
  const possessive = first.toLowerCase().endsWith("s") ? `${first}'` : `${first}'s`;
  return `${possessive} dashboard`;
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
  showAdminLink = false,
}: {
  children: React.ReactNode;
  orgName?: string;
  userName: string;
  userEmail: string;
  showAdminLink?: boolean;
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

  const headerTitle = dashboardHeadingLabel(userName, userEmail);

  const navPrimary: NavItem[] = [
    {
      href: paths.dashboard,
      label: "Home",
      icon: <IconHome className="h-5 w-5 shrink-0 opacity-90 md:h-6 md:w-6" />,
      match: (p) => p === paths.dashboard || p === "/school/",
    },
    {
      href: "#",
      label: "My chats",
      icon: <IconChats className="h-5 w-5 shrink-0 opacity-90 md:h-6 md:w-6" />,
      match: () => false,
      disabled: true,
    },
    {
      href: "#",
      label: "Math library",
      icon: <IconLibrary className="h-5 w-5 shrink-0 opacity-90 md:h-6 md:w-6" />,
      match: () => false,
      disabled: true,
    },
  ];

  const navAfterClasses: NavItem[] = [
    {
      href: paths.account,
      label: "Settings & account",
      icon: <IconSettings className="h-5 w-5 shrink-0 opacity-90 md:h-6 md:w-6" />,
      match: (p) => p.startsWith(paths.account),
    },
  ];

  function NavButton({ item }: { item: NavItem }) {
    const active = item.match(pathname ?? "");
    const base =
      "flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-lg leading-snug transition-colors md:text-xl md:py-4";
    if (item.disabled) {
      return (
        <div
          className={`${base} cursor-not-allowed text-kelvi-school-muted/80`}
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
            ? "bg-kelvi-teal/15 font-semibold text-kelvi-teal shadow-[inset_3px_0_0_0_var(--color-kelvi-teal)]"
            : "text-kelvi-school-ink/85 hover:bg-kelvi-teal/10 hover:text-kelvi-teal"
        }`}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-kelvi-school-bg text-kelvi-school-ink antialiased">
      {/* Sidebar — wide rail, teal-tinted gradient, larger type */}
      <aside
        className={`relative flex h-full w-[min(100%,21rem)] shrink-0 flex-col border-r border-kelvi-teal/25 bg-gradient-to-b from-kelvi-teal/[0.14] via-kelvi-school-surface to-[color-mix(in_oklab,var(--color-kelvi-teal)_8%,var(--color-kelvi-school-surface))] shadow-[6px_0_32px_-16px_rgba(0,90,88,0.18)] transition-[width,opacity] duration-200 md:w-[21.5rem] ${
          sidebarOpen ? "opacity-100" : "w-0 overflow-hidden border-0 p-0 opacity-0 shadow-none md:w-0"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="shrink-0 border-b border-kelvi-teal/20 bg-kelvi-teal/12 px-5 pb-4 pt-6">
          <Link
            href="/school"
            className="sb-brand flex items-center gap-3 font-serif text-3xl font-normal text-kelvi-teal drop-shadow-sm"
          >
            <KelviTriLogo className="scale-110" />
            <span>Kelvi</span>
          </Link>
          {orgName ? (
            <p
              className="mt-3 truncate pl-[34px] text-lg font-medium leading-snug text-kelvi-school-ink/80"
              title={orgName}
            >
              {orgName}
            </p>
          ) : (
            <p className="mt-3 pl-[34px] text-lg text-kelvi-school-ink/70">School workspace</p>
          )}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
          {navPrimary.map((item) => (
            <NavButton key={item.label} item={item} />
          ))}

          <div className="mt-4 flex items-center justify-between px-2 pb-1.5 pt-2">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-kelvi-teal/90 md:text-sm">
              Classes
            </span>
            <Link
              href={paths.newClass}
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-kelvi-teal/20 text-xl font-semibold text-kelvi-teal transition hover:bg-kelvi-teal/30 hover:text-kelvi-teal-hover"
              title="Add a class"
              aria-label="Add a class"
            >
              +
            </Link>
          </div>

          <Link
            href={paths.classes}
            className={`flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-lg transition-colors md:text-xl md:py-4 ${
              pathname?.startsWith(paths.classes)
                ? "bg-kelvi-teal/15 font-semibold text-kelvi-teal shadow-[inset_3px_0_0_0_var(--color-kelvi-teal)]"
                : "text-kelvi-school-ink/85 hover:bg-kelvi-teal/10 hover:text-kelvi-teal"
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 28 28" fill="none" className="shrink-0" aria-hidden>
              <circle cx="14" cy="6" r="5" fill="#B8784E" />
              <circle cx="6" cy="21" r="5" fill="#3A6B5C" />
              <circle cx="22" cy="21" r="5" fill="#5A7080" />
            </svg>
            <span>All classes</span>
          </Link>

          <div className="my-2 h-px shrink-0 bg-kelvi-teal/15" />

          {navAfterClasses.map((item) => (
            <NavButton key={item.label} item={item} />
          ))}
        </nav>

        <div className="shrink-0 border-t border-kelvi-teal/20 bg-kelvi-teal/[0.08] px-4 py-4 space-y-2">
          {showAdminLink ? (
            <Link
              href="/admin"
              className={`block w-full rounded-lg py-2.5 text-left text-xl font-medium transition hover:bg-kelvi-teal/15 ${
                pathname?.startsWith("/admin")
                  ? "text-kelvi-teal font-semibold"
                  : "text-kelvi-teal/90 hover:text-kelvi-teal-hover"
              }`}
            >
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full rounded-lg py-2.5 text-left text-xl font-medium text-kelvi-teal transition hover:bg-kelvi-teal/15 hover:text-kelvi-teal-hover"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main column — light surface; inner chrome aligns to same 1120px column as body (marketing-style) */}
      <div className="flex min-w-0 flex-1 flex-col bg-surface/35">
        <header className="shrink-0 border-b border-kelvi-teal/15 bg-gradient-to-r from-kelvi-teal/[0.06] to-kelvi-school-bg py-4 md:py-5">
          <div className="mx-auto flex min-h-[3.25rem] w-full max-w-[1120px] items-center gap-4 px-6 sm:px-8">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="shrink-0 rounded-lg p-2 text-kelvi-teal transition hover:bg-kelvi-teal/15 hover:text-kelvi-teal-hover"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <svg className="h-6 w-6 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg className="hidden h-6 w-6 md:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {sidebarOpen ? (
                  <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                ) : (
                  <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                )}
              </svg>
            </button>
            <h1 className="min-w-0 flex-1 truncate font-serif text-3xl font-medium tracking-tight text-kelvi-teal md:text-4xl">
              {headerTitle}
            </h1>
            <button
              type="button"
              onClick={() => void signOut()}
              className="shrink-0 rounded-lg border border-kelvi-teal/25 px-4 py-2 text-sm font-medium text-kelvi-teal/80 transition hover:border-kelvi-teal/50 hover:bg-kelvi-teal/10 hover:text-kelvi-teal"
            >
              Log out
            </button>
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
