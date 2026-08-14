"use client";

import { OverlaySheet } from "@/components/OverlaySheet";
import { useAuth } from "@/components/AuthProvider";
import { useTour } from "@/components/TourProvider";
import { CURRENT_RELEASE } from "@/lib/release-notes";

export function WhatsNewModal() {
  const { releasePending, acknowledgeRelease } = useAuth();
  const { isOpen: tourOpen } = useTour();

  if (!releasePending || tourOpen) return null;

  return (
    <OverlaySheet
      labelledBy="whats-new-title"
      onClose={() => void acknowledgeRelease()}
      closeOnBackdrop={false}
      variant="card"
      zIndexClass="z-[108]"
      header={
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            {CURRENT_RELEASE.version}
          </p>
          <h2
            id="whats-new-title"
            className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl"
          >
            What we added
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            {CURRENT_RELEASE.summary} You can reopen every Beta note later in
            Settings.
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
            Continue to the desk
          </button>
        </div>
      }
    >
      <ul className="space-y-3">
        {CURRENT_RELEASE.items.map((item) => (
          <li
            key={item}
            className="glass rounded-2xl px-4 py-3 text-sm leading-relaxed text-ink"
          >
            {item}
          </li>
        ))}
      </ul>
    </OverlaySheet>
  );
}
