/** Beta 3.0 is live for everyone. Set NEXT_PUBLIC_TVM_BETA3_LABS=0 only to roll it back. */
export function showBeta3Labs() {
  if (process.env.NEXT_PUBLIC_TVM_BETA3_LABS === "0") return false;
  return true;
}

/** TVM 1.0 is live. Set NEXT_PUBLIC_TVM_10_LABS=0 only to roll it back. */
export function showTvm10Labs() {
  if (process.env.NEXT_PUBLIC_TVM_10_LABS === "0") return false;
  return true;
}

/** Let’s customize — every account on Beta 3.0. */
export function showCustomizeExperience(_role?: string) {
  return showBeta3Labs();
}

export function showUltraDesk(plan?: string) {
  return showTvm10Labs() && plan === "ultra";
}
