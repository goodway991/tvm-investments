import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

const statements = [
  {
    title: "Who it’s for",
    text: "Self-directed investors who already do homework and want one place to see what moved, what flagged, and why.",
  },
  {
    title: "What it does",
    text: "Each weekday after the US close, TVM screens US stocks and ETFs — large-caps, smaller names, and liquid funds — ranks the session’s movers, and writes up the names that hit several of eight historically-motivated setups at once.",
  },
  {
    title: "What it is not",
    text: "It is a weekday research desk, not a live trading terminal. Scores and notes come from the session scan so you can reread the tape in one place.",
  },
];

const values = [
  ["Transparent", "Every score shows which signals fired"],
  ["Repeatable", "The same desk, refreshed after each session"],
  ["Direct", "The reasoning stays on the page"],
];

const founders = [
  ["TO", "Taiki Okada", "Strategy & Research", "6s", "0s"],
  ["VD", "Varish Desai", "Engineering & Data", "7s", ".5s"],
  ["MR", "Miguel Rosales", "Marketing", "8s", "1s"],
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
              A research desk for people who{" "}
              <span className="text-violet">want a process.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">
              Most investors do not need another opinion. They need a calmer way
              to start: a shortlist, the reasoning behind it, the day’s tape,
              and a place to keep what they are watching. That is TVM — built
              for individuals who research before they trade.
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

          <section className="glass-strong mt-16 rounded-[28px] p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet">
              How the desk works
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink">
              Eight signals, one composite, notes you can reread.
            </h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-ink-soft">
              A name that is merely oversold does not automatically rise to the
              top. The composite is weighted so several setups firing together
              outrank a single trigger. Research reports, a daily brief, a
              watchlist, and a portfolio log sit next to that screen so the
              work of following a name does not scatter across tabs. Archive
              days let you see what the desk showed on a prior session — useful
              for learning the process, not for rewriting history.
            </p>
          </section>

          <section className="mt-24 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet">The team</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-ink">Meet the co-founders</h2>
            <p className="mx-auto mt-4 max-w-lg text-ink-soft">
              Three people building a quieter way to research the market.
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
            <h2 className="font-display text-3xl font-bold">Open today’s desk</h2>
            <p className="mt-3 text-white/[0.85]">
              Sign in to see the latest screen, movers, and research notes.
            </p>
            <Link
              href="/dashboard"
              className="on-white mt-7 inline-flex rounded-full bg-white px-8 py-3.5 font-semibold text-violet transition-transform hover:-translate-y-0.5"
            >
              Open dashboard
            </Link>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
