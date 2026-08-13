import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

const statements = [
  {
    title: "Our mission",
    text: "Give every investor institution-grade screening in plain language, so decisions are informed rather than emotional.",
  },
  {
    title: "Our method",
    text: "Fuse eight historically-motivated signals into one composite score, then log every pick to hold the framework accountable.",
  },
  {
    title: "Our promise",
    text: "No hype and no black boxes. We surface the reasoning and the risks behind every flag, and we say when data is unavailable.",
  },
];

const values = [
  ["Transparent", "Every score is explained"],
  ["Accountable", "Picks tracked at 1D / 1W / 1M"],
  ["Educational", "Research first, always"],
];

const founders = [
  ["TO", "Taiki Okada", "Strategy & Research", "6s", "0s"],
  ["VD", "Varish Desai", "Engineering & Data", "7s", ".5s"],
  ["MR", "Miguel Rosales", "Product & Design", "8s", "1s"],
];

export function AboutPage() {
  return (
    <PublicShell>
      <main className="animate-rise">
        <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-36">
          <section className="mx-auto max-w-2xl text-center">
            <span className="glass inline-flex rounded-full px-4 py-1.5 text-sm font-medium text-violet">
              About TVM Investments
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.08] tracking-tight text-ink">
              Disciplined research, <span className="text-violet">made legible.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">
              We turn a rigorous, eight-signal screening process into a workspace anyone can read
              at a glance — honest about its risks and clear that it is research, never advice.
            </p>
          </section>

          <section className="mt-20 grid gap-6 md:grid-cols-3">
            {statements.map((statement) => (
              <article key={statement.title} className="glass-strong rounded-[24px] p-7">
                <h2 className="font-display text-xl font-semibold text-ink">{statement.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{statement.text}</p>
              </article>
            ))}
          </section>

          <section className="glass mt-8 grid gap-8 rounded-[26px] p-8 text-center sm:grid-cols-3 sm:p-10">
            {values.map(([title, description]) => (
              <div key={title}>
                <p className="font-display text-2xl font-bold text-violet">{title}</p>
                <p className="mt-1 text-sm text-ink-soft">{description}</p>
              </div>
            ))}
          </section>

          <section className="mt-24 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet">The team</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-ink">Meet the co-founders</h2>
            <p className="mx-auto mt-4 max-w-lg text-ink-soft">
              Three builders who wanted a calmer, clearer way to research the market.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {founders.map(([initials, name, role, duration, delay]) => (
                <article key={name} className="glass-strong rounded-[24px] p-8">
                  <div
                    className="glass-violet mx-auto grid h-24 w-24 place-items-center rounded-full font-display text-3xl font-bold text-white"
                    style={{ animation: `floaty ${duration} ease-in-out ${delay} infinite` }}
                  >
                    {initials}
                  </div>
                  <h3 className="mt-6 font-display text-xl font-semibold text-ink">{name}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{role}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-violet mt-24 rounded-[30px] p-12 text-center text-white">
            <h2 className="font-display text-3xl font-bold">See the process in action</h2>
            <p className="mt-3 text-white/[0.85]">
              Open the dashboard and explore today&apos;s flagged picks.
            </p>
            <Link
              href="/dashboard"
              className="mt-7 inline-flex rounded-full bg-white px-8 py-3.5 font-semibold text-violet transition-transform hover:-translate-y-0.5"
            >
              Open dashboard
            </Link>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
