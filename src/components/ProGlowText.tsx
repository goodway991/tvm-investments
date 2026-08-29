import { Fragment } from "react";
import { UltraShinePhrase } from "@/components/UltraText";

export function ProGlowPhrase({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <span className={`pro-glow-wrap ${className}`.trim()}>
      <span className="pro-name-glow">{children}</span>
    </span>
  );
}

export function ProGlowText({
  children,
}: {
  children: string | (string | number)[];
}) {
  const text = Array.isArray(children) ? children.join("") : children;
  const parts = String(text).split(
    /(\bUltra account\b|\bPro account\b|\bUltra\b|\bPro\b)/,
  );
  return (
    <>
      {parts.map((part, index) =>
        part === "Ultra" || part === "Ultra account" ? (
          <UltraShinePhrase key={index}>{part}</UltraShinePhrase>
        ) : part === "Pro" || part === "Pro account" ? (
          <ProGlowPhrase key={index}>{part}</ProGlowPhrase>
        ) : part ? (
          <Fragment key={index}>{part}</Fragment>
        ) : null,
      )}
    </>
  );
}
