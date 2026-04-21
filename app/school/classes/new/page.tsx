import Link from "next/link";
import { CreateClassForm } from "@/app/school/classes/new/create-class-form";

export default function NewClassPage() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <Link
          href="/school/classes"
          className="text-sm font-medium text-kelvi-teal hover:text-kelvi-teal-hover"
        >
          ← All classes
        </Link>
        <h2 className="mt-4 font-serif text-2xl text-kelvi-school-ink md:text-3xl">Add a class</h2>
        <p className="mt-3 text-base leading-relaxed text-kelvi-school-muted">
          Create a class in your school. You&apos;ll be set as the lead teacher. Next steps: add
          students to the roster and invite parents by email.
        </p>
      </div>

      <CreateClassForm />
    </div>
  );
}
