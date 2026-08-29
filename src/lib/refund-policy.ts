export const REFUND_GRACE_DAYS = 7;
export const REFUND_GRACE_SECONDS = REFUND_GRACE_DAYS * 24 * 60 * 60;

export const REFUND_POLICY_CHECKOUT =
  `You have ${REFUND_GRACE_DAYS} days from this purchase to request a full refund. After that, the interval you paid for is non-refundable. Cancel auto-renew anytime to stop the next charge. Details: https://tvminvest.com/refunds`;

export function isWithinRefundGrace(purchasedAtUnix: number, nowMs = Date.now()) {
  if (!purchasedAtUnix || purchasedAtUnix <= 0) return false;
  return nowMs / 1000 - purchasedAtUnix < REFUND_GRACE_SECONDS;
}
