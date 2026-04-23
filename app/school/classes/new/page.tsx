import Link from "next/link";
import { CreateClassForm } from "@/app/school/classes/new/create-class-form";

export default function NewClassPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 text-left">
      <div>
        <Link
          href="/school/classes"
          className="text-lg font-medium text-kelvi-teal hover:text-kelvi-teal-hover"
        >
          ← All classes
        </Link>
        <h2 className="mt-5 font-serif text-3xl text-kelvi-school-ink md:text-4xl">Add a class</h2>
        <p className="mt-4 leading-relaxed text-kelvi-school-ink/85">
          Create a class in your school. You&apos;ll be set as the lead teacher. Next steps: add
          students to the roster and invite parents by email.
        </p>
      </div>

      <CreateClassForm />
    </div>
  );
}
