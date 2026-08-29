import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { REFUND_GRACE_DAYS } from "@/lib/refund-policy";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cancellation and refunds — TVM Investments",
  robots: { index: true, follow: true },
  description: `TVM Investments refunds paid plans within a ${REFUND_GRACE_DAYS}-day grace period. After that, cancel auto-renew to stop the next charge.`,
};

export default function RefundsPage() {
  return (
    <LegalDocument title="Cancellation and refunds" updated={LEGAL_EFFECTIVE_DATE}>
      <p>
        This page is the cancellation and refund policy for paid TVM plans. It
        is part of the{" "}
        <a href="/terms">Terms of Service</a>.
      </p>

      <h2>7-day refund window</h2>
      <p>
        You may request a full refund of your most recent paid charge within{" "}
        {REFUND_GRACE_DAYS} days of that purchase. The refund returns the money
        for that charge and ends paid access.
      </p>
      <p>
        After {REFUND_GRACE_DAYS} days, that charge is non-refundable. You keep
        paid access through the interval you already paid for (month or year).
      </p>

      <h2>Plan changes</h2>
      <p>
        Upgrades, downgrades, and switches between paid plans wait until the
        current billing period ends. You keep the plan you already paid for until
        then. The new plan starts at the next period. You cannot move to another
        paid plan immediately while a period is still running.
      </p>

      <h2>Auto-renew</h2>
      <p>
        Subscriptions renew automatically until you turn auto-renew off. Cancel
        anytime in Settings → View plan → Downgrade to Free, or Manage billing.
        Canceling stops the next charge. It does not refund time already paid
        after the {REFUND_GRACE_DAYS}-day window.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Signed-in accounts can use Settings → View plan → Request refund during
        the {REFUND_GRACE_DAYS}-day window. You can also use Settings →
        Feedback → Support. Mandatory consumer-law cooling-off rights, where
        they apply and are not waived, still apply.
      </p>
    </LegalDocument>
  );
}
