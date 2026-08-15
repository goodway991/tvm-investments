import { Fragment } from "react";

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
  const parts = String(text).split(/(\bPro\b)/);
  return (
    <>
      {parts.map((part, index) =>
        part === "Pro" ? (
          <ProGlowPhrase key={index}>Pro</ProGlowPhrase>
        ) : part ? (
          <Fragment key={index}>{part}</Fragment>
        ) : null,
      )}
    </>
  );
}
