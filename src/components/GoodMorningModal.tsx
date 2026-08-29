"use client";

import { useEffect, useState } from "react";
import { OverlaySheet } from "@/components/OverlaySheet";
import { useAuth } from "@/components/AuthProvider";
import { useExperience } from "@/components/ExperienceProvider";
import { useTour } from "@/components/TourProvider";
import { useSiteEra } from "@/components/SiteEraProvider";
import { showUltraDesk } from "@/lib/beta-labs";
import { guessLocale, isValidTimeZone, zoneClock } from "@/lib/locales";
import { UltraShinePhrase } from "@/components/UltraText";
import { ProGlowText } from "@/components/ProGlowText";
import { BogenHeading } from "@/components/BogenProvider";
import { MorningBriefView } from "@/components/MorningBriefView";
import {
  GOOD_MORNING_HOUR,
  isGoodMorningHour,
  type MorningBrief,
} from "@/lib/morning-brief";
import { authedFetch } from "@/lib/authed-fetch";

function greetingKey(uid: string, ymd: string) {
  return `tvm-good-morning:${uid}:${ymd}`;
}

function greetingZone(saved?: string) {
  if (saved && isValidTimeZone(saved)) return saved;
  const guessed = guessLocale().timeZone;
  return isValidTimeZone(guessed) ? guessed : "America/New_York";
}

export function GoodMorningModal() {
  const {
    user,
    profile,
    entitlement,
    loading,
    accountReady,
    giftPending,
  } = useAuth();
  const { customizeOpen } = useExperience();
  const { isOpen: tourOpen } = useTour();
  const { rewind } = useSiteEra();
  const [open, setOpen] = useState(false);
  const [stamp, setStamp] = useState("");
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [briefFailed, setBriefFailed] = useState(false);

  useEffect(() => {
    const ultra = showUltraDesk(entitlement.plan) && entitlement.plan === "ultra";
    if (
      loading ||
      !accountReady ||
      !user ||
      !ultra ||
      customizeOpen ||
      tourOpen ||
      rewind ||
      giftPending
    ) {
      setOpen(false);
      return;
    }
    const uid = user.uid;
    const zone = greetingZone(profile?.timeZone);

    function tick() {
      const clock = zoneClock(zone);
      if (!isGoodMorningHour(clock.hour)) {
        setOpen(false);
        return;
      }
      try {
        if (window.localStorage.getItem(greetingKey(uid, clock.ymd))) {
          setOpen(false);
          return;
        }
      } catch {
        /* private mode */
      }
      setStamp(clock.ymd);
      setOpen(true);
    }

    tick();
    const timer = window.setInterval(tick, 15000);
    return () => window.clearInterval(timer);
  }, [
    accountReady,
    customizeOpen,
    entitlement.plan,
    giftPending,
    loading,
    profile?.timeZone,
    rewind,
    tourOpen,
    user,
  ]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let cancelled = false;
    setBrief(null);
    setBriefFailed(false);

    async function load() {
      try {
        const response = await authedFetch("/api/morning-brief", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("brief");
        const text = await response.text();
        if (cancelled || controller.signal.aborted) return;
        if (!text.trim()) throw new Error("brief");
        let payload: MorningBrief;
        try {
          payload = JSON.parse(text) as MorningBrief;
        } catch {
          throw new Error("brief");
        }
        setBrief(payload);
      } catch (error: unknown) {
        if (cancelled || controller.signal.aborted) return;
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          return;
        }
        setBriefFailed(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open]);

  if (!open || !user) return null;
  const uid = user.uid;
  const name = profile?.firstName || profile?.displayName || "there";

  function dismiss() {
    if (stamp) {
      try {
        window.localStorage.setItem(greetingKey(uid, stamp), "1");
      } catch {
        /* private mode */
      }
    }
    setOpen(false);
  }

  return (
    <OverlaySheet
      labelledBy="good-morning-title"
      onClose={dismiss}
      closeOnBackdrop={false}
      variant="card"
      zIndexClass="z-[110]"
      header={
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
            <ProGlowText>Ultra · {GOOD_MORNING_HOUR}:00am</ProGlowText>
          </p>
          <h2
            id="good-morning-title"
            className="mt-2 font-display text-3xl font-bold text-ink"
          >
            <BogenHeading id="good-morning">
              Good morning, <UltraShinePhrase>{name}</UltraShinePhrase>
            </BogenHeading>
          </h2>
        </div>
      }
      footer={
        <button
          type="button"
          onClick={dismiss}
          className="glass-violet rounded-full px-7 py-3.5 text-sm font-semibold text-white"
        >
          Open the desk
        </button>
      }
    >
      <MorningBriefView brief={brief} failed={briefFailed} />
    </OverlaySheet>
  );
}
