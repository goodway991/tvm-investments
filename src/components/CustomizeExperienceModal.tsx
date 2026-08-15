"use client";

import { useEffect, useState } from "react";
import { OverlaySheet } from "@/components/OverlaySheet";
import { ReleaseFeatureVisual } from "@/components/ReleaseFeatureVisual";
import { useBogen } from "@/components/BogenProvider";
import { useTheme, type Appearance } from "@/components/ThemeProvider";
import { useExperience } from "@/components/ExperienceProvider";
import { useAuth } from "@/components/AuthProvider";
import { useTour } from "@/components/TourProvider";
import { useSiteEra } from "@/components/SiteEraProvider";
import { showCustomizeExperience, showTvm10Labs } from "@/lib/beta-labs";
import { LocalePicker } from "@/components/LocalePicker";
import { guessLocale, isValidCountry, isValidTimeZone } from "@/lib/locales";

function MiniChrome({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-ink/[0.08] bg-white text-left shadow-[0_12px_24px_-18px_rgba(30,70,160,0.4)]">
      <div className="flex items-center gap-1.5 border-b border-ink/[0.06] bg-surface px-2.5 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-coral/80" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400/90" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
        <span className="ml-1 text-[10px] font-semibold text-ink-soft">{title}</span>
      </div>
      {children}
    </div>
  );
}

function CleanDashboardPreview() {
  return (
    <MiniChrome title="Dashboard · Clean">
      <div className="space-y-2 bg-surface p-2.5">
        <p className="text-[10px] font-semibold text-ink">Today at a glance</p>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="glass-violet rounded-xl p-2 text-white">
            <p className="text-[8px] text-white/80">Top pick</p>
            <p className="font-display text-xs font-bold">+2.4%</p>
          </div>
          <div className="glass-violet rounded-xl p-2 text-white">
            <p className="text-[8px] text-white/80">Your book</p>
            <p className="font-display text-xs font-bold">74</p>
          </div>
        </div>
        <div className="rounded-xl bg-white p-2">
          <p className="text-[8px] font-semibold text-ink-soft">Movers</p>
          <div className="mt-1 space-y-1">
            <div className="h-1.5 w-full rounded-full bg-ink/[0.08]" />
            <div className="h-1.5 w-4/5 rounded-full bg-ink/[0.08]" />
            <div className="h-1.5 w-3/5 rounded-full bg-ink/[0.08]" />
          </div>
        </div>
      </div>
    </MiniChrome>
  );
}

function NormalDashboardPreview() {
  return (
    <MiniChrome title="Dashboard · Normal">
      <div className="space-y-1.5 bg-surface p-2.5">
        <div className="grid grid-cols-4 gap-1">
          {["Pick", "1,487", "86", "74"].map((value) => (
            <div key={value} className="glass-violet rounded-lg p-1.5 text-white">
              <p className="font-display text-[10px] font-bold leading-none">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className="h-10 rounded-lg bg-white" />
          <div className="space-y-1">
            <div className="h-2 rounded bg-white" />
            <div className="h-2 rounded bg-white" />
            <div className="h-2 rounded bg-white" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div className="h-8 rounded-lg bg-white" />
          <div className="h-8 rounded-lg bg-white" />
          <div className="h-8 rounded-lg bg-white" />
        </div>
      </div>
    </MiniChrome>
  );
}

export function CustomizeExperienceModal() {
  const {
    customizeOpen,
    customizeSeen,
    finishCustomize,
    openCustomize,
    density,
    setDensity,
  } = useExperience();
  const { enabled: bogenEnabled, setEnabled: setBogenEnabled } = useBogen();
  const { appearance, setAppearance } = useTheme();
  const { user, loading, tourPending, giftPending, entitlement, profile, updateLocale } =
    useAuth();
  const { isOpen: tourOpen } = useTour();
  const { rewind } = useSiteEra();
  const [step, setStep] = useState(0);
  const guessed = guessLocale();
  const [country, setCountry] = useState(guessed.country);
  const [timeZone, setTimeZone] = useState(guessed.timeZone);

  useEffect(() => {
    if (customizeOpen) {
      const guess = guessLocale();
      setCountry(profile?.country || guess.country);
      setTimeZone(profile?.timeZone || guess.timeZone);
      if (!customizeSeen) setStep(0);
      else if (showTvm10Labs() && !profile?.timeZone) setStep(3);
      else setStep(0);
    }
  }, [customizeOpen, customizeSeen, profile?.country, profile?.timeZone]);

  useEffect(() => {
    if (
      !showCustomizeExperience(entitlement.role) ||
      !user ||
      loading ||
      tourPending ||
      tourOpen ||
      rewind ||
      giftPending ||
      customizeOpen
    ) {
      return;
    }
    if (customizeSeen && (!showTvm10Labs() || profile?.timeZone)) return;
    openCustomize();
  }, [
    customizeOpen,
    customizeSeen,
    entitlement.role,
    giftPending,
    loading,
    openCustomize,
    profile?.timeZone,
    rewind,
    tourOpen,
    tourPending,
    user,
  ]);

  if (!customizeOpen || rewind) return null;
  if (!showCustomizeExperience(entitlement.role)) return null;

  const tvm10 = showTvm10Labs();
  const lastStep = tvm10 ? 3 : 2;
  const last = step === lastStep;

  return (
    <OverlaySheet
      labelledBy="customize-title"
      closeOnBackdrop={false}
      variant="card"
      zIndexClass="z-[109]"
      header={
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            Step {step + 1} of {tvm10 ? 4 : 3}
          </p>
          <h2
            id="customize-title"
            className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl"
          >
            Let’s customize your experience
          </h2>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-ink-soft disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (last) {
                if (tvm10) {
                  if (!isValidCountry(country) || !isValidTimeZone(timeZone)) return;
                  void updateLocale(country, timeZone);
                }
                finishCustomize();
                setStep(0);
                return;
              }
              setStep((current) => current + 1);
            }}
            className="glass-violet rounded-full px-7 py-3.5 text-sm font-semibold text-white"
          >
            {last ? "Done" : "Next"}
          </button>
        </div>
      }
    >
      {step === 0 ? (
        <div>
          <ReleaseFeatureVisual id="bogen" />
          <h3 className="mt-4 font-display text-lg font-bold text-ink">Bogen mode</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            A question mark next to each feature. Tap one to read what it does and how
            to use it. Turn it off anytime — the circles disappear.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setBogenEnabled(true)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                bogenEnabled
                  ? "glass-violet text-white"
                  : "border border-ink/10 text-ink-soft hover:text-ink"
              }`}
            >
              On
            </button>
            <button
              type="button"
              onClick={() => setBogenEnabled(false)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                !bogenEnabled
                  ? "glass-violet text-white"
                  : "border border-ink/10 text-ink-soft hover:text-ink"
              }`}
            >
              Off
            </button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <h3 className="font-display text-lg font-bold text-ink">Appearance</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Dark is the default. Light is still here if you want a brighter page.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["dark", "Dark", "Near-black glass, bright type."],
                ["light", "Light", "Navy on white, same layout."],
              ] as const
            ).map(([value, label, copy]) => {
              const on = appearance === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAppearance(value as Appearance)}
                  className={`rounded-[22px] border p-4 text-left ${
                    on
                      ? "border-violet bg-violet/10"
                      : "border-ink/10 hover:border-ink/20"
                  }`}
                >
                  <span
                    className={`mb-3 block h-16 rounded-2xl ${
                      value === "dark"
                        ? "bg-[#12192c] ring-1 ring-white/10"
                        : "bg-[#f4f6fb] ring-1 ring-ink/10"
                    }`}
                  />
                  <p className="font-display text-base font-bold text-ink">{label}</p>
                  <p className="mt-1 text-sm text-ink-soft">{copy}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <h3 className="font-display text-lg font-bold text-ink">How much detail?</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Clean is for a first look. Normal is the full dashboard you have today.
          </p>
          <div className="mt-5 grid items-start gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <button
              type="button"
              onClick={() => setDensity("clean")}
              className={`text-left ${density === "clean" ? "opacity-100" : "opacity-70"}`}
            >
              <CleanDashboardPreview />
              <p className="mt-3 font-display text-base font-bold text-ink">Clean</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                All the news, simplified — today’s pick, your book, and a short mover
                list.
              </p>
            </button>

            <div className="flex justify-center py-6 sm:py-10">
              <button
                type="button"
                role="switch"
                aria-checked={density === "normal"}
                aria-label="Clean or Normal mode"
                onClick={() =>
                  setDensity(density === "clean" ? "normal" : "clean")
                }
                className={`density-switch ${density === "normal" ? "is-normal" : ""}`}
              >
                <span className="density-switch-thumb" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setDensity("normal")}
              className={`text-left ${density === "normal" ? "opacity-100" : "opacity-70"}`}
            >
              <NormalDashboardPreview />
              <p className="mt-3 font-display text-base font-bold text-ink">Normal</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                The full dashboard — every card, chart, calculator, and flagged pick.
              </p>
            </button>
          </div>
        </div>
      ) : null}

      {tvm10 && step === 3 ? (
        <div>
          <h3 className="font-display text-lg font-bold text-ink">Where are you?</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Country and time zone are for every account. Ultra uses this for a
            9:00am good morning in your local time.
          </p>
          <div className="mt-4">
            <LocalePicker
              country={country}
              timeZone={timeZone}
              onCountry={setCountry}
              onTimeZone={setTimeZone}
            />
          </div>
        </div>
      ) : null}
    </OverlaySheet>
  );
}
