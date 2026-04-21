import { createClient } from "@/lib/supabase/server";

export default async function SchoolDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const first = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="w-full max-w-5xl mx-auto">
      <h1 className="font-serif text-3xl font-bold text-kelvi-ink mb-1">
        Welcome, {first}
      </h1>
      <p className="text-text-secondary mb-8">
        You&apos;re signed in to Kelvi School. Class and student tools will land
        here as we ship them.
      </p>
    </div>
  );
}
