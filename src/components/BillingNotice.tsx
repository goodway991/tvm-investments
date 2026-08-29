"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authedFetch } from "@/lib/authed-fetch";

export function BillingNotice() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const billing = searchParams.get("billing");
  const sessionId = searchParams.get("session_id");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (billing !== "success" && billing !== "cancel") return;
    if (billing === "cancel") {
      setMessage("Checkout was canceled. Your plan is unchanged.");
      return;
    }
    setMessage("Payment received. Unlocking your plan…");
    if (!sessionId) {
      setMessage("You're on the paid plan. Refresh if the chip still says Free.");
      return;
    }
    let cancelled = false;
    void authedFetch("/api/stripe/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as { error?: string };
        if (cancelled) return;
        setMessage(
          response.ok
            ? "You're on the paid plan. Welcome in."
            : payload.error || "Payment received. The plan should update in a few seconds.",
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("Payment received. The plan should update in a few seconds.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [billing, sessionId]);

  if (!message) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet/20 bg-violet/5 px-4 py-3 text-sm text-ink">
      <p>{message}</p>
      <button
        type="button"
        onClick={() => router.replace(pathname)}
        className="on-white rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-violet"
      >
        Dismiss
      </button>
    </div>
  );
}
