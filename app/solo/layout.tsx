import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SoloAppHeader } from "@/components/solo-app-header";
import { isPlatformAdmin } from "@/lib/auth/invite-only";

export const dynamic = "force-dynamic";

export default async function SoloLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

  const solo = memberships?.find(
    (m: any) =>
      m.organizations?.type === "solo" && m.role === "solo_learner"
  );

  if (!solo) {
    redirect("/post-login");
  }

  const org = solo.organizations as { name?: string } | undefined;

  const showAdminLink = await isPlatformAdmin(supabase, user.id, user.email ?? null);

  return (
    <div className="min-h-screen flex flex-col bg-kelvi-cream">
      <SoloAppHeader
        userName={profile?.full_name ?? user.email ?? ""}
        userEmail={user.email ?? ""}
        orgName={org?.name}
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
