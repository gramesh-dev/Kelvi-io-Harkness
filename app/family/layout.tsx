import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { isPlatformAdmin } from "@/lib/auth/invite-only";
import {
  logFamilyToLoginDebug,
  pickSupabaseCookieNames,
  safeGetUserErrorMessage,
} from "@/lib/auth/family-to-login-debug";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (!user) {
    const cookieHeader = (await headers()).get("cookie");
    const cookieList = (await cookies()).getAll();
    logFamilyToLoginDebug({
      route: "/family",
      stage: "family-layout",
      hasCookieHeader: Boolean(cookieHeader),
      supabaseCookieNames: pickSupabaseCookieNames(cookieList),
      getUserEmail: null,
      getUserError: safeGetUserErrorMessage(getUserError),
      redirectReason: "layout-getuser-null",
    });
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
    redirect("/onboarding");
  }

  if (!showAdminLink && !hasFamilyMembership) {
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
