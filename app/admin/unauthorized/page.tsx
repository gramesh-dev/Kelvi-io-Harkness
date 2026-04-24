import Link from "next/link";

export default function AdminUnauthorizedPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-3xl text-kelvi-school-ink">Admin access required</h1>
      <p className="mt-3 text-kelvi-school-ink/80">
        Your account is signed in, but it is not listed as a platform admin for this
        environment.
      </p>
      <Link
        href="/post-login"
        className="mt-8 inline-flex w-fit rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-kelvi-school-ink hover:bg-kelvi-school-surface"
      >
        Continue to Kelvi
      </Link>
    </div>
  );
}
