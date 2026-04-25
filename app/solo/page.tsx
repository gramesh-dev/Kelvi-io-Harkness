import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SoloHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const first =
    profile?.full_name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "there";
  const workspaceHref = `/student/index.html?app=1&name=${encodeURIComponent(first)}`;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl font-bold text-kelvi-ink mb-2">
        Kelvi Student
      </h1>
      <p className="text-text-secondary mb-8">
        Open the full student workspace (Desmos, sessions, home) or manage your account.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={workspaceHref}
          className="inline-flex justify-center px-4 py-2.5 rounded-lg bg-kelvi-600 text-white text-sm font-medium hover:bg-kelvi-700 transition"
        >
          Open student workspace
        </a>
        <Link
          href="/solo/account"
          className="inline-flex justify-center px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-kelvi-700 hover:bg-surface-secondary transition"
        >
          My account
        </Link>
      </div>
    </div>
  );
}
