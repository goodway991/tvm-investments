"use client";

import { useEffect, useState } from "react";

const DIGITS = "0123456789";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomCharFor(targetChar: string) {
  if (/[0-9]/.test(targetChar)) {
    return DIGITS[Math.floor(Math.random() * DIGITS.length)];
  }
  if (/[a-zA-Z]/.test(targetChar)) {
    const pool = LETTERS + targetChar.toUpperCase();
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return targetChar;
}

/** Letter / mixed-string cyber scramble (left→right reveal). */
function scrambleFrame(target: string, progress: number) {
  const reveal = Math.floor(progress * target.length);
  let out = "";
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (i < reveal || !/[0-9a-zA-Z]/.test(ch)) {
      out += ch;
    } else {
      out += randomCharFor(ch);
    }
  }
  return out;
}

function parseNumericStat(value: string) {
  const match = value.match(/^([\d,]+)(.*)$/);
  if (!match) return null;
  const target = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;
  return { target, suffix: match[2] ?? "" };
}

function formatCount(n: number) {
  return n.toLocaleString("en-US");
}

/** Count 0 → target with a light digit flicker on the climbing edge. */
function countUpFrame(target: number, suffix: string, progress: number) {
  const eased = 1 - Math.pow(1 - progress, 2);
  const current = Math.min(target, Math.floor(eased * target));
  let formatted = formatCount(current);

  if (progress < 1 && current < target) {
    // Flicker only the last digit so it never jumps above the climb.
    const chars = formatted.split("");
    for (let i = chars.length - 1; i >= 0; i--) {
      if (/[0-9]/.test(chars[i])) {
        chars[i] = DIGITS[Math.floor(Math.random() * DIGITS.length)];
        break;
      }
    }
    formatted = chars.join("");
  }

  return `${formatted}${suffix}`;
}

export function ScrambleText({
  value,
  durationMs = 1000,
  mode = "scramble",
  className,
}: {
  value: string;
  durationMs?: number;
  /** `countUp` climbs from 0 for numeric stats; `scramble` is letter cyber-reveal. */
  mode?: "scramble" | "countUp";
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      setDone(true);
      return;
    }

    const numeric = mode === "countUp" ? parseNumericStat(value) : null;
    const start = performance.now();
    let frame = 0;
    setDone(false);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      if (numeric) {
        setDisplay(countUpFrame(numeric.target, numeric.suffix, progress));
      } else {
        setDisplay(scrambleFrame(value, progress));
      }
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
        setDone(true);
      }
    };

    if (numeric) {
      setDisplay(countUpFrame(numeric.target, numeric.suffix, 0));
    } else {
      setDisplay(scrambleFrame(value, 0));
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, mode]);

  return (
    <span
      className={className}
      aria-label={value}
      data-scramble={done ? "done" : "active"}
    >
      {display}
    </span>
  );
}
