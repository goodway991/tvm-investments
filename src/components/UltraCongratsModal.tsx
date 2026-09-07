"use client";

import { useEffect, useMemo } from "react";
import { UltraShinePhrase } from "@/components/UltraText";

const PIECES = 48;

export function UltraCongratsModal({
  open,
  onEnter,
}: {
  open: boolean;
  onEnter: () => void;
}) {
  const confetti = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, index) => {
        const hue = [210, 195, 170, 45, 280][index % 5];
        return {
          id: index,
          left: `${(index * 17 + 11) % 100}%`,
          delay: `${(index % 12) * 0.08}s`,
          duration: `${2.4 + (index % 7) * 0.18}s`,
          color: `hsl(${hue} 85% ${index % 2 === 0 ? 68 : 58}%)`,
          rotate: `${(index * 37) % 360}deg`,
          size: 6 + (index % 5),
        };
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="ultra-congrats-overlay" role="dialog" aria-modal="true" aria-labelledby="ultra-congrats-title">
      <div className="ultra-congrats-confetti" aria-hidden>
        {confetti.map((piece) => (
          <span
            key={piece.id}
            className="ultra-congrats-piece"
            style={{
              left: piece.left,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              background: piece.color,
              width: piece.size,
              height: piece.size * 1.4,
              transform: `rotate(${piece.rotate})`,
            }}
          />
        ))}
      </div>
      <div className="ultra-congrats-card glass-strong">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet">
          Ultra unlocked
        </p>
        <h2 id="ultra-congrats-title" className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
          You got <UltraShinePhrase>Ultra</UltraShinePhrase>!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Congrats — the full desk is yours. Horizon, Workstation, and the Ultra tape are ready.
        </p>
        <button
          type="button"
          onClick={onEnter}
          className="ultra-profile-glow-move mt-6 rounded-full px-7 py-3 text-sm font-semibold"
        >
          Enter the desk
        </button>
      </div>
    </div>
  );
}
