import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveAccountTierLabel } from "@/lib/auth/account-tier";
import { MyAccountPanel } from "@/components/my-account-panel";

export default async function SoloAccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, metadata")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("org_memberships")
    .select("organizations(type), role")
    .eq("profile_id", user.id)
    .eq("is_active", true);

  const hasSolo = memberships?.some(
    (m: any) =>
      m.organizations?.type === "solo" && m.role === "solo_learner"
  );
  if (!hasSolo) {
    redirect("/post-login");
  }

  const meta = (profile?.metadata ?? {}) as Record<string, unknown>;
  const { label } = resolveAccountTierLabel(meta);

  return (
    <MyAccountPanel
      email={profile?.email ?? user.email ?? ""}
      fullName={profile?.full_name ?? user.email ?? "Member"}
      tierLabel={label}
      productLabel="Kelvi Student"
      homeHref="/solo"
    />
  );
}
