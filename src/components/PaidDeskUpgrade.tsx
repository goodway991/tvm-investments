"use client";

import { BogenHeading } from "@/components/BogenProvider";
import { ProGlowText } from "@/components/ProGlowText";
import { UltraShinePhrase } from "@/components/UltraText";
import { useUpgrade } from "@/components/UpgradeProvider";
import type { BogenId } from "@/lib/bogen";

export function PaidDeskUpgrade({
  title,
  bogenId,
}: {
  title: string;
  bogenId: BogenId;
}) {
  const { openUpgrade } = useUpgrade();

  return (
    <div className="dashboard-research">
      <div className="glass-strong max-w-xl rounded-[24px] p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet">
          Paid desk
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink">
          <BogenHeading id={bogenId}>{title}</BogenHeading>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          <ProGlowText>
            Upgrade to Pro to unlock this desk. Ultra is unlimited.
          </ProGlowText>
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => openUpgrade("pro")}
            className="pro-profile-glow rounded-full bg-transparent px-6 py-3 text-sm font-semibold"
          >
            <ProGlowText>Upgrade to Pro to unlock</ProGlowText>
          </button>
          <button
            type="button"
            onClick={() => openUpgrade("ultra")}
            className="ultra-profile-glow-move rounded-full px-6 py-3 text-sm font-semibold"
          >
            <UltraShinePhrase>Upgrade to Ultra for unlimited</UltraShinePhrase>
          </button>
        </div>
      </div>
    </div>
  );
}
