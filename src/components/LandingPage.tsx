import Link from "next/link";
import { MiniChart } from "@/components/MiniChart";
import { PublicShell } from "@/components/PublicShell";
import { TVMIcon } from "@/components/TVMBrand";
import { LandingHeroStats } from "@/components/LandingHeroStats";
import { ProGlowText } from "@/components/ProGlowText";
import { SHOW_BETA_WAITLIST } from "@/lib/beta-waitlist";

const founders = [
  { initials: "TO", name: "Taiki Okada", role: "Strategy & Research", timing: "6s", delay: "0s" },
  { initials: "VD", name: "Varish Desai", role: "Engineering & Data", timing: "7s", delay: ".5s" },
  { initials: "MR", name: "Miguel Rosales", role: "Marketing", timing: "8s", delay: "1s" },
];

const features = [
  {
    icon: "movers" as const,
    title: "A daily shortlist, not a firehose",
    text: "After the close, we rank the session’s largest moves and the names that hit several of our eight signals at once — so you start from a list, not a blank screen.",
  },
  {
    icon: "dashboard" as const,
    title: "Scores you can actually read",
    text: "Each flag shows which setups fired and why. The composite is weighted, not a pile of checkboxes, so a name hitting three signals outranks a name hitting one.",
  },
  {
    icon: "watchlist" as const,
    title: "Context beside the ticker",
    text: "Headlines, sector notes, a watchlist, and a portfolio log live in one workspace. You still make the call. We just stop you from doing it across five tabs.",
  },
];

export function LandingPage() {
  return (
    <PublicShell showNavigation={false} showAuthBar>
      <main className="animate-rise">
        <div className="mx-auto max-w-[1180px] px-6 pb-28 pt-14">
          <section className="grid min-h-[min(72vh,640px)] items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div className="max-w-xl">
              <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
                Welcome to the next frontier of{" "}
                <span className="text-violet">investing.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
                TVM Investments scans the market each day, flags the
                highest-conviction movers, and hands you the research — all
                wrapped in a calm, clear workspace.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="glass-violet inline-flex items-center justify-center rounded-full px-7 py-3.5 text-[15px] font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-14px_rgba(37,90,230,0.7)] active:scale-[0.97]"
                >
                  {SHOW_BETA_WAITLIST ? "Create account" : "Get started free"}
                </Link>
                <Link
                  href="/about"
                  className="glass-strong inline-flex items-center justify-center rounded-full px-7 py-3.5 text-[15px] font-medium text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.85] active:scale-[0.97]"
                >
                  Learn more about TVM
                </Link>
              </div>
              <LandingHeroStats />
            </div>

            <div className="landing-hero-stage relative hidden h-[440px] sm:block" aria-label="Investment dashboard preview">
              <div className="glass-strong landing-float-a absolute right-2 top-0 w-64 rounded-[22px] p-4">
                <div className="flex items-center justify-between text-xs text-ink-soft">
                  <span>Top pick today</span>
                  <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 font-semibold text-emerald-600">
                    +6.4%
                  </span>
                </div>
                <div className="mt-1 font-display text-2xl font-bold text-ink">NVDA</div>
                <MiniChart
                  values={[18, 16, 20, 14, 22, 20, 28, 26, 34]}
                  id="hero-nvda"
                  height={90}
                />
              </div>

              <div className="glass-strong landing-float-b absolute left-0 top-24 w-56 rounded-[22px] p-4">
                <p className="text-xs text-ink-soft">Composite score</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="font-display text-3xl font-bold text-violet">92</span>
                  <span className="pb-1 text-xs text-ink-soft">/ 100</span>
                </div>
                <div className="flex h-28 items-end gap-2">
                  {[42, 67, 50, 75, 58, 92, 100].map((height, index) => (
                    <div key={height + index} className="flex h-full flex-1 flex-col justify-end">
                      <div
                        className="rounded-full transition-all"
                        style={{
                          height: `${height}%`,
                          background:
                            index === 6
                              ? "linear-gradient(#2563eb, #3b82f6)"
                              : "linear-gradient(rgba(37,99,235,.35), rgba(37,99,235,.12))",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-strong landing-float-c absolute bottom-6 right-0 w-60 rounded-[22px] p-4">
                <p className="mb-2 text-xs font-semibold text-ink">Today&apos;s movers</p>
                {[
                  ["AMD", "+4.1%", true],
                  ["SHOP", "-3.2%", false],
                  ["PLTR", "+2.8%", true],
                ].map(([symbol, change, gain]) => (
                  <div key={String(symbol)} className="flex items-center justify-between py-1.5">
                    <span className="text-sm font-medium text-ink">{symbol}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        gain
                          ? "bg-emerald-400/20 text-emerald-600"
                          : "bg-coral/20 text-coral"
                      }`}
                    >
                      {change}
                    </span>
                  </div>
                ))}
              </div>

              <div className="glass-violet landing-float-d absolute bottom-0 left-6 w-44 rounded-[22px] p-4 text-white">
                <p className="text-xs text-white/80">Projected return</p>
                <div className="font-display text-2xl font-bold">+$1,240</div>
                <div className="mt-2 h-1.5 rounded-full bg-white/25">
                  <div className="h-full w-3/4 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto mt-24 max-w-3xl text-center sm:mt-32">
            <p className="text-lg leading-relaxed text-ink-soft sm:text-xl">
              Self-directed investors drown in market noise — quote sites, news
              tabs, spreadsheets, and a gut check — with no shared place to start
              the day’s work.
            </p>
            <p className="mt-8 text-lg leading-relaxed text-ink-soft sm:text-xl">
              After the US close we screen stocks and ETFs, shortlist what moved
              and what hit multiple signals, and put the scores and notes in one
              workspace.
            </p>
          </section>

          <section className="glass-strong mt-20 rounded-[30px] p-8 sm:mt-24 sm:p-10">
            <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
              {features.map((feature) => (
                <div key={feature.title}>
                  <div className="glass-violet grid h-12 w-12 place-items-center rounded-2xl text-white">
                    <TVMIcon name={feature.icon} size={22} />
                  </div>
                  <h2 className="mt-5 font-display text-lg font-semibold text-ink">
                    {feature.title}
                  </h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-28 grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div className="glass-strong rounded-[26px] p-6">
              <p className="text-sm font-semibold text-ink">Balance</p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-display text-3xl font-bold text-ink">$52,422</span>
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                  +2.48%
                </span>
              </div>
              <MiniChart
                values={[14, 20, 11, 24, 17, 32, 20, 38, 28, 48]}
                id="landing-balance"
                height={120}
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-violet">
                Why it exists
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-ink">
                Same problem. One desk. Every session.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                Hot tips and endless tabs do not scale. TVM is the weekday
                process that replaces them: what moved, what flagged, why it
                flagged, and what you are watching — refreshed after the US cash
                close.
              </p>
              <Link
                href="/about"
                className="glass-strong mt-7 inline-flex rounded-full px-6 py-3 text-[15px] font-medium text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.85] active:scale-[0.97]"
              >
                More about TVM →
              </Link>
            </div>
          </section>

          <section className="mt-28 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet">The team</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-ink">Meet the co-founders</h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {founders.map((founder) => (
                <div key={founder.name} className="glass-strong rounded-[24px] p-8">
                  <div
                    className="glass-violet mx-auto grid h-20 w-20 place-items-center rounded-full font-display text-2xl font-bold text-white"
                    style={{
                      animation: `floaty ${founder.timing} ease-in-out ${founder.delay} infinite`,
                    }}
                  >
                    {founder.initials}
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-ink">{founder.name}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{founder.role}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-violet mt-28 rounded-[30px] p-12 text-center text-white">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Start the day with a process, not a blank screen.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/[0.85]">
              {SHOW_BETA_WAITLIST ? (
                <>
                  Create an account, join the waitlist, and after you&apos;re
                  admitted pick Pro or Ultra to open the desk.{" "}
                  <ProGlowText>
                    Have a beta code? Add it on the Stripe checkout page.
                  </ProGlowText>
                </>
              ) : (
                <>
                  Create a free account to open today’s screen, movers, and research
                  notes.{" "}
                  <ProGlowText>
                    Have an Ultra beta code? Redeem it in Settings.
                  </ProGlowText>
                </>
              )}
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <Link
                href="/signup"
                className="on-white rounded-full bg-white px-7 py-3.5 font-semibold text-violet transition-transform hover:-translate-y-0.5"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/50 px-7 py-3.5 font-medium transition-colors hover:bg-white/10"
              >
                Log in
              </Link>
            </div>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
