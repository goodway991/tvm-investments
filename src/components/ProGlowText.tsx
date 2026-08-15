import { Fragment } from "react";

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
          <span key={index} className="pro-name-glow">
            Pro
          </span>
        ) : part ? (
          <Fragment key={index}>{part}</Fragment>
        ) : null,
      )}
    </>
  );
}
