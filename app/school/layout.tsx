import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SchoolAppHeader } from "@/components/school-app-header";

export default async function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?intent=school");
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

  const schoolOrg = memberships?.find(
    (m: any) =>
      m.organizations?.type === "school" &&
      (m.role === "school_admin" || m.role === "teacher")
  );

  if (!schoolOrg) {
    redirect("/post-login");
  }

  const org = schoolOrg.organizations as { name?: string } | undefined;

  return (
    <div className="min-h-screen flex flex-col bg-kelvi-cream">
      <SchoolAppHeader
        userName={profile?.full_name ?? user.email ?? ""}
        userEmail={user.email ?? ""}
        orgName={org?.name}
      />
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
