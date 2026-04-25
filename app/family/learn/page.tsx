import { createClient } from "@/lib/supabase/server";
import { StartSessionForm } from "./start-session-form";

export default async function LearnPage() {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, display_name")
    .eq("is_active", true);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl font-bold text-kelvi-ink mb-1">
        Start learning
      </h1>
      <p className="text-text-secondary mb-8">
        Choose a child and a learning mode to begin a session.
      </p>

      {students && students.length > 0 ? (
        <StartSessionForm students={students} />
      ) : (
        <div className="bg-surface rounded-xl border border-border p-8 text-center">
          <p className="text-text-secondary mb-3">
            Add a child first to start a learning session.
          </p>
          <a
            href="/family/children"
            className="text-kelvi-600 font-medium hover:underline"
          >
            Go to Children
          </a>
        </div>
      )}
    </div>
  );
}
