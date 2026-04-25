import { createClient } from "@/lib/supabase/server";
import { AddChildForm } from "./add-child-form";
import { ChildRow } from "./child-row";

export default async function ChildrenPage() {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, display_name, grade_level, date_of_birth, is_active, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl font-bold text-kelvi-ink mb-1">
        Children
      </h1>
      <p className="text-text-secondary mb-8">
        Manage the children in your family&apos;s learning space.
      </p>

      {students && students.length > 0 && (
        <div className="bg-surface rounded-xl border border-border divide-y divide-border mb-8">
          {students.map((student: any) => (
            <ChildRow
              key={student.id}
              student={{
                id: student.id,
                full_name: student.full_name,
                display_name: student.display_name,
                grade_level: student.grade_level,
                date_of_birth: student.date_of_birth,
              }}
            />
          ))}
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="font-serif text-lg font-semibold text-kelvi-ink mb-4">
          Add a child
        </h2>
        <AddChildForm />
      </div>
    </div>
  );
}
