import { createClient } from "@/lib/supabase/server";
import { SettingsForms } from "./settings-forms";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl font-bold text-kelvi-ink mb-1">
        Settings
      </h1>
      <p className="text-text-secondary mb-8">
        Manage your account and family preferences.
      </p>

      <SettingsForms
        initialFullName={profile?.full_name ?? ""}
        email={user?.email ?? ""}
      />
    </div>
  );
}
