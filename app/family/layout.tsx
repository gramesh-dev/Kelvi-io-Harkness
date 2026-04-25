import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { isPlatformAdmin } from "@/lib/auth/invite-only";

export const dynamic = "force-dynamic";

type FamilyAuthFailureReason = "no-session" | "no-family-org" | "not-authorized";

async function buildFamilyAuthDebug(
  getUserEmail: string | null,
  failureReason: FamilyAuthFailureReason
) {
  const cookieHeader = (await headers()).get("cookie");
  const cookieNames = (await cookies()).getAll().map((c) => c.name);
  return {
    hasCookieHeader: Boolean(cookieHeader),
    supabaseCookieNames: cookieNames.filter((n) => n.startsWith("sb-")),
    getUserEmail,
    failureReason,
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const debug = await buildFamilyAuthDebug(null, "no-session");
    console.warn("[family/auth] no-session", debug);
    redirect("/login?next=/family");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("org_memberships")
    .select("org_id, role, organizations(id, name, type)")
    .eq("profile_id", user.id)
    .eq("is_active", true);

  const showAdminLink = await isPlatformAdmin(supabase, user.id, user.email ?? null);
  const hasFamilyMembership = Boolean(
    memberships?.some((m: any) => m.organizations?.type === "family")
  );

  if ((!memberships || memberships.length === 0) && !showAdminLink) {
    const debug = await buildFamilyAuthDebug(user.email ?? null, "no-family-org");
    console.warn("[family/auth] no-family-org", debug);
    redirect("/onboarding");
  }

  if (!showAdminLink && !hasFamilyMembership) {
    const debug = await buildFamilyAuthDebug(user.email ?? null, "not-authorized");
    console.warn("[family/auth] not-authorized", debug);
    redirect("/onboarding");
  }

  const orgs =
    memberships?.map((m: any) => ({
      id: m.organizations.id,
      name: m.organizations.name,
      type: m.organizations.type,
      role: m.role,
    })) ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-kelvi-cream">
      <AppHeader
        userName={profile?.full_name ?? user.email ?? ""}
        userEmail={user.email ?? ""}
        orgName={orgs[0]?.name ?? (showAdminLink ? "Family (admin preview)" : undefined)}
        showAdminLink={showAdminLink}
      />
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
