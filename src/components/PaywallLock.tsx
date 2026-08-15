"use client";

import type { ReactNode } from "react";
import { TVMIcon } from "@/components/TVMBrand";
import { ProGlowText } from "@/components/ProGlowText";
import { useUpgrade } from "@/components/UpgradeProvider";

function LockedSkeleton() {
  return (
    <div className="space-y-5 p-1" aria-hidden>
      {[72, 88, 64, 80].map((width, index) => (
        <div key={index}>
          <div
            className="h-3.5 rounded-full bg-ink/10"
            style={{ width: `${width}px` }}
          />
          <div className="mt-2 space-y-2">
            <div className="h-3 rounded-full bg-ink/[0.06]" />
            <div className="h-3 w-5/6 rounded-full bg-ink/[0.06]" />
            <div className="h-3 w-2/3 rounded-full bg-ink/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PaywallLock({
  children,
  locked,
  cta = "Upgrade to Pro",
  placeholder = false,
  intensity = "heavy",
}: {
  children: ReactNode;
  locked: boolean;
  cta?: string;
  placeholder?: boolean;
  intensity?: "heavy" | "soft";
}) {
  const { openUpgrade } = useUpgrade();

  if (!locked) return <>{children}</>;

  const soft = intensity === "soft";

  return (
    <div className="relative min-h-[220px] overflow-hidden rounded-2xl">
      <div
        className={`pointer-events-none select-none ${
          soft ? "paywall-secret-soft" : "paywall-secret"
        }`}
        aria-hidden
      >
        {placeholder ? <LockedSkeleton /> : children}
      </div>
      <div
        className={`absolute inset-0 flex items-center justify-center gap-3 ${
          soft ? "paywall-veil-soft" : "paywall-veil"
        }`}
      >
        <TVMIcon name="lock" size={28} className="text-zinc-400" />
        <button
          type="button"
          onClick={() => openUpgrade()}
          className="pro-profile-glow rounded-full bg-transparent px-5 py-2.5 text-sm font-semibold"
        >
          <ProGlowText>{cta}</ProGlowText>
        </button>
      </div>
    </div>
  );
}
