import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";

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

  if (!memberships || memberships.length === 0) {
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
        orgName={orgs[0]?.name}
      />
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
