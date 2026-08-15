"use client";

export function TvmSwitch({
  checked,
  onCheckedChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
      className={`tvm-switch ${checked ? "is-on" : ""}`}
    >
      <span className="tvm-switch-thumb" />
    </button>
  );
}
