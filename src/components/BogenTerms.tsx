"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useBogenSafe } from "@/components/BogenProvider";
import { BOGEN_GLOSSARY } from "@/lib/bogen-glossary";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const GLOSSARY_PATTERN = new RegExp(
  `\\b(${BOGEN_GLOSSARY.map((item) => escapeRegExp(item.term)).join("|")})\\b`,
  "gi",
);

const BY_LOWER = new Map(
  BOGEN_GLOSSARY.map((item) => [item.term.toLowerCase(), item]),
);

export function BogenTerms({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const { enabled } = useBogenSafe();
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".bogen-term, .bogen-term-pop")) return;
      setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const parts = useMemo(() => {
    if (!text) return [] as Array<{ type: "text" | "term"; value: string }>;
    const chunks: Array<{ type: "text" | "term"; value: string }> = [];
    let cursor = 0;
    const matcher = new RegExp(GLOSSARY_PATTERN.source, "gi");
    let match = matcher.exec(text);
    while (match) {
      if (match.index > cursor) {
        chunks.push({ type: "text", value: text.slice(cursor, match.index) });
      }
      chunks.push({ type: "term", value: match[0] });
      cursor = match.index + match[0].length;
      match = matcher.exec(text);
    }
    if (cursor < text.length) chunks.push({ type: "text", value: text.slice(cursor) });
    return chunks;
  }, [text]);

  if (!enabled) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "text") return <span key={index}>{part.value}</span>;
        const entry = BY_LOWER.get(part.value.toLowerCase());
        if (!entry) return <span key={index}>{part.value}</span>;
        const active = open === `${index}:${entry.term}`;
        return (
          <span key={index} className="relative inline">
            <button
              type="button"
              className="bogen-term"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(active ? null : `${index}:${entry.term}`);
              }}
            >
              {part.value}
            </button>
            {active ? (
              <span
                role="tooltip"
                className="bogen-term-pop"
                onClick={(event) => event.stopPropagation()}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-violet">
                  Bogen
                </span>
                <span className="mt-1 block text-sm font-semibold text-ink">
                  {entry.term}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                  {entry.blurb}
                </span>
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

export function BogenCopy({
  text,
  as = "p",
  className = "",
}: {
  text: string;
  as?: "p" | "span";
  className?: string;
}) {
  const body: ReactNode = <BogenTerms text={text} />;
  if (as === "span") return <span className={className}>{body}</span>;
  return <p className={className}>{body}</p>;
}
