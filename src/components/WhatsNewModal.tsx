"use client";

import { OverlaySheet } from "@/components/OverlaySheet";
import { ReleaseFeatureList } from "@/components/ReleaseFeatureList";
import { ProGlowText } from "@/components/ProGlowText";
import { useAuth } from "@/components/AuthProvider";
import { useMaintenance } from "@/components/MaintenanceGate";
import { useTour } from "@/components/TourProvider";
import { CURRENT_RELEASE } from "@/lib/release-notes";
import { useExperience } from "@/components/ExperienceProvider";
import { useSiteEra } from "@/components/SiteEraProvider";

export function WhatsNewModal() {
  const { giftPending, releasePending, acknowledgeRelease } = useAuth();
  const { lock: maintenanceLock } = useMaintenance();
  const { isOpen: tourOpen } = useTour();
  const { rewind } = useSiteEra();
  const { customizeOpen } = useExperience();

  if (
    !releasePending ||
    tourOpen ||
    rewind ||
    maintenanceLock ||
    giftPending ||
    customizeOpen
  ) {
    return null;
  }

  return (
    <OverlaySheet
      labelledBy="whats-new-title"
      onClose={() => void acknowledgeRelease()}
      closeOnBackdrop={false}
      variant="card"
      zIndexClass="z-[108]"
      header={
        <div>
          <p className="text-[11px] leading-snug text-ink-soft">
            You can see this message in Settings again.
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-violet">
            {CURRENT_RELEASE.version} · {CURRENT_RELEASE.date}
          </p>
          <h2
            id="whats-new-title"
            className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl"
          >
            <ProGlowText>{CURRENT_RELEASE.title}</ProGlowText>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            <ProGlowText>{CURRENT_RELEASE.summary}</ProGlowText>
          </p>
        </div>
      }
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void acknowledgeRelease()}
            className="glass-violet rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Let’s go
          </button>
        </div>
      }
    >
      {CURRENT_RELEASE.features?.length ? (
        <ReleaseFeatureList features={CURRENT_RELEASE.features} />
      ) : null}
      {CURRENT_RELEASE.items?.length ? (
        <ul className={`space-y-3 ${CURRENT_RELEASE.features?.length ? "mt-5" : ""}`}>
          {CURRENT_RELEASE.items.map((item) => (
            <li
              key={item}
              className="font-display text-base font-bold text-ink"
            >
              <ProGlowText>{item}</ProGlowText>
            </li>
          ))}
        </ul>
      ) : null}
    </OverlaySheet>
  );
}
