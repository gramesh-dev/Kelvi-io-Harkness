"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/family", label: "Dashboard" },
  { href: "/family/children", label: "Children" },
  { href: "/family/learn", label: "Learn" },
  { href: "/family/settings", label: "Settings" },
  { href: "/family/account", label: "My account" },
];

export function AppHeader({
  userName,
  userEmail,
  orgName,
}: {
  userName: string;
  userEmail: string;
  orgName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="shrink-0 border-b border-kelvi-border bg-kelvi-cream">
      <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/family" className="flex items-center gap-2.5 shrink-0">
            <span
              className="w-8 h-8 rounded-full bg-kelvi-teal shrink-0"
              aria-hidden
            />
            <span className="font-serif text-2xl font-bold text-kelvi-ink tracking-tight">
              Kelvi
            </span>
          </Link>
          {orgName ? (
            <span
              className="hidden sm:inline text-sm text-kelvi-muted border-l border-black/10 pl-3 truncate max-w-[10rem] md:max-w-xs"
              title={orgName}
            >
              {orgName}
            </span>
          ) : null}
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm md:gap-x-8">
          {navItems.map((item) => {
            const active =
              item.href === "/family"
                ? pathname === "/family"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "text-kelvi-teal font-semibold"
                    : "text-kelvi-muted hover:text-kelvi-ink transition"
                }
              >
                {item.label}
              </Link>
            );
          })}
          <span
            className="hidden md:inline h-4 w-px bg-black/10 self-center"
            aria-hidden
          />
          <span
            className="hidden lg:inline text-xs text-kelvi-muted truncate max-w-[8rem]"
            title={userEmail}
          >
            {userName}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-kelvi-muted hover:text-kelvi-ink font-medium transition"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
