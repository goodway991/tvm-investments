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

export function ScrambleText({
  value,
  durationMs = 1000,
  className,
}: {
  value: string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setDisplay(scrambleFrame(value, progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    setDisplay(scrambleFrame(value, 0));
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return (
    <span
      className={className}
      aria-label={value}
      data-scramble={display === value ? "done" : "active"}
    >
      {display}
    </span>
  );
}
