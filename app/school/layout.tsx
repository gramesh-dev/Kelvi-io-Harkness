import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SchoolWorkspaceShell } from "@/components/school/school-workspace-shell";

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
    <SchoolWorkspaceShell
      orgName={org?.name}
      userName={profile?.full_name ?? user.email ?? ""}
      userEmail={user.email ?? ""}
    >
      {/*
        Match marketing `public/index.html` `.container`: max-width 1120px, centered.
        Body text uses the same comfortable size as the landing page.
      */}
      <div className="school-main-content mx-auto w-full max-w-[1120px] px-6 py-8 text-[1.0625rem] leading-relaxed sm:px-8">
        {children}
      </div>
    </SchoolWorkspaceShell>
  );
}
