import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-kelvi-cream">
      <header className="border-b border-kelvi-border shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="w-8 h-8 rounded-full bg-kelvi-teal shrink-0"
              aria-hidden
            />
            <span className="font-serif text-2xl font-bold text-kelvi-ink tracking-tight">
              Kelvi
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 md:gap-8 text-sm text-kelvi-muted">
            <a href="#products" className="hover:text-kelvi-ink transition">
              Two products
            </a>
            <a href="#modes" className="hover:text-kelvi-ink transition">
              Three modes
            </a>
            <a href="#ladder" className="hover:text-kelvi-ink transition">
              The question ladder
            </a>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-kelvi-teal rounded-lg hover:bg-kelvi-teal-hover transition"
              >
                Kelvi School
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-kelvi-mustard rounded-lg hover:bg-kelvi-mustard-hover transition"
              >
                Kelvi Family
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-kelvi-ink leading-[1.1] tracking-tight">
            The question is the answer.
          </h1>
          <div className="space-y-6">
            <p className="font-serif text-xl md:text-2xl italic text-kelvi-slate">
              For anyone who wants to build a math mindset.
            </p>
            <p className="text-kelvi-slate leading-relaxed text-base md:text-lg">
              An AI thinking partner that never gives answers — only better
              questions. For schools and families across the world.
            </p>
            <div
              id="products"
              className="flex flex-col sm:flex-row gap-4 pt-2 scroll-mt-24"
            >
              <Link
                href="/login"
                className="flex flex-col items-center justify-center px-8 py-4 rounded-lg bg-kelvi-teal text-white hover:bg-kelvi-teal-hover transition text-center min-w-[200px]"
              >
                <span className="font-semibold text-base">Kelvi School</span>
                <span className="text-sm text-white/90 mt-0.5">
                  For teachers &amp; students
                </span>
              </Link>
              <Link
                href="/signup"
                className="flex flex-col items-center justify-center px-8 py-4 rounded-lg bg-kelvi-mustard text-white hover:bg-kelvi-mustard-hover transition text-center min-w-[200px]"
              >
                <span className="font-semibold text-base">Kelvi Family</span>
                <span className="text-sm text-white/90 mt-0.5">
                  For parents &amp; children
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section
          id="modes"
          className="border-t border-kelvi-border bg-surface/60 scroll-mt-20"
        >
          <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
            <h2 className="font-serif text-3xl font-bold text-kelvi-ink mb-3">
              Three modes
            </h2>
            <p className="text-kelvi-slate max-w-2xl leading-relaxed mb-10">
              Questioning, guided exploration, and open curiosity — each mode
              shapes how Kelvi responds so learning stays age-right and
              goal-aligned.
            </p>
            <ul className="grid sm:grid-cols-3 gap-6 text-sm text-kelvi-slate">
              <li className="p-5 rounded-lg border border-kelvi-border bg-surface">
                <span className="font-semibold text-kelvi-ink block mb-1">
                  Questioning
                </span>
                Kelvi helps learners discover answers through better questions.
              </li>
              <li className="p-5 rounded-lg border border-kelvi-border bg-surface">
                <span className="font-semibold text-kelvi-ink block mb-1">
                  Guided
                </span>
                Step-by-step support with checks along the way.
              </li>
              <li className="p-5 rounded-lg border border-kelvi-border bg-surface">
                <span className="font-semibold text-kelvi-ink block mb-1">
                  Exploration
                </span>
                Follow curiosity with a partner that deepens the thread.
              </li>
            </ul>
          </div>
        </section>

        <section id="ladder" className="scroll-mt-20 pb-20">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="font-serif text-3xl font-bold text-kelvi-ink mb-3">
              The question ladder
            </h2>
            <p className="text-kelvi-slate max-w-2xl leading-relaxed">
              Each exchange can climb from recall to connection — so thinking
              gets stronger, not just faster. Kelvi is built for that climb.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
