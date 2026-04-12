import Link from "next/link";

export function KelviWordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 ${className ?? ""}`}
    >
      <span
        className="w-8 h-8 rounded-full bg-kelvi-teal shrink-0"
        aria-hidden
      />
      <span className="font-serif text-2xl font-bold text-kelvi-ink tracking-tight">
        Kelvi
      </span>
    </Link>
  );
}
