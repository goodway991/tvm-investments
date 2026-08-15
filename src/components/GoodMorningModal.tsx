"use client";

import { useEffect, useState } from "react";
import { OverlaySheet } from "@/components/OverlaySheet";
import { useAuth } from "@/components/AuthProvider";
import { useExperience } from "@/components/ExperienceProvider";
import { useTour } from "@/components/TourProvider";
import { useSiteEra } from "@/components/SiteEraProvider";
import { useMaintenance } from "@/components/MaintenanceGate";
import { showUltraDesk } from "@/lib/beta-labs";
import { isValidTimeZone, zoneClock } from "@/lib/locales";
import { UltraShinePhrase } from "@/components/UltraText";

function greetingKey(uid: string, ymd: string) {
  return `tvm-good-morning:${uid}:${ymd}`;
}

export function GoodMorningModal() {
  const { user, profile, entitlement, loading, giftPending, releasePending } =
    useAuth();
  const { customizeOpen } = useExperience();
  const { isOpen: tourOpen } = useTour();
  const { rewind } = useSiteEra();
  const { lock: maintenanceLock } = useMaintenance();
  const [open, setOpen] = useState(false);
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    if (
      loading ||
      !user ||
      !showUltraDesk(entitlement.plan) ||
      customizeOpen ||
      tourOpen ||
      rewind ||
      giftPending ||
      releasePending ||
      maintenanceLock
    ) {
      setOpen(false);
      return;
    }
    const uid = user.uid;
    const zone =
      profile?.timeZone && isValidTimeZone(profile.timeZone)
        ? profile.timeZone
        : "";
    if (!zone) return;

    function tick() {
      const clock = zoneClock(zone);
      if (clock.hour < 9) {
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
    customizeOpen,
    entitlement.plan,
    giftPending,
    loading,
    maintenanceLock,
    profile?.timeZone,
    releasePending,
    rewind,
    tourOpen,
    user,
  ]);

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
      zIndexClass="z-[107]"
      header={
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
            Ultra · 9:00am
          </p>
          <h2
            id="good-morning-title"
            className="mt-2 font-display text-3xl font-bold text-ink"
          >
            Good morning, <UltraShinePhrase>{name}</UltraShinePhrase>
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
      <p className="text-sm leading-relaxed text-ink-soft">
        Your Ultra workstation, book review, and today’s tape are ready. This
        note appears once each local morning from 9:00 on.
      </p>
    </OverlaySheet>
  );
}
