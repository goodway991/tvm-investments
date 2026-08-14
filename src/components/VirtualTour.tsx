"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LoopMotion } from "@/components/LoopMotion";
import { TourScene } from "@/components/TourScenes";
import { TOUR_SLIDES } from "@/lib/virtual-tour";

export function VirtualTour({
  required,
  onFinish,
  onDismiss,
}: {
  required: boolean;
  onFinish: () => void;
  onDismiss?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const last = index === TOUR_SLIDES.length - 1;
  const slide = TOUR_SLIDES[index];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        if (last) onFinish();
        else setIndex((current) => Math.min(current + 1, TOUR_SLIDES.length - 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((current) => Math.max(current - 1, 0));
      } else if (event.key === "Escape" && !required) {
        onDismiss?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onDismiss, onFinish, required]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="virtual-tour-title"
      className="tour-overlay"
    >
      <div className="tour-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet">
              Virtual tour
            </p>
            <h2 id="virtual-tour-title" className="mt-1 font-display text-2xl font-bold text-ink">
              {slide.name}
            </h2>
          </div>
          {!required && onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
            >
              Close
            </button>
          ) : null}
        </div>

        <LoopMotion className="tour-stage" key={slide.id}>
          <TourScene id={slide.id} />
        </LoopMotion>

        <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-ink-soft">
          {slide.how}
        </p>

        <div className="mt-5 flex items-center justify-center gap-1.5" aria-hidden="true">
          {TOUR_SLIDES.map((item, dot) => (
            <span
              key={item.id}
              className={`h-1.5 rounded-full transition-all ${
                dot === index ? "w-6 bg-violet" : "w-1.5 bg-violet/25"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((current) => Math.max(current - 1, 0))}
            disabled={index === 0}
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft disabled:opacity-30"
          >
            Back
          </button>
          <p className="text-xs font-semibold text-ink-soft">
            {index + 1} / {TOUR_SLIDES.length}
          </p>
          <button
            type="button"
            onClick={() => {
              if (last) onFinish();
              else setIndex((current) => current + 1);
            }}
            className="glass-violet rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          >
            {last ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.documentElement,
  );
}
