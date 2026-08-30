"use client";

import { useAuth } from "@/components/AuthProvider";
import {
  StripePricingTable,
  stripePricingTableConfigured,
} from "@/components/StripePricingTable";
import { useBetaStatus } from "@/components/BetaStatusProvider";
import { DiscordJoinButton } from "@/components/DiscordJoinButton";
import { ProGlowText } from "@/components/ProGlowText";
import { TVMBrand } from "@/components/TVMBrand";
import { UltraShinePhrase } from "@/components/UltraText";
import { authedFetch } from "@/lib/authed-fetch";
import { priceFor, yearlySavingsPercent, type BillingInterval, type PaidPlanId } from "@/lib/plans";
import { showTvm10Labs } from "@/lib/beta-labs";
import { useState } from "react";

function JoinOrPending({
  phase,
}: {
  phase: "join" | "pending";
}) {
  const { loading, joinWaitlist } = useBetaStatus();
  const [error, setError] = useState("");

  async function join() {
    setError("");
    try {
      await joinWaitlist();
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "Unable to join the waitlist.",
      );
    }
  }

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">
        Beta waitlist
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">
        {phase === "pending" ? "You're on the waitlist" : "Join the waitlist to start"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {phase === "pending"
          ? "You're in line. When you're admitted, you'll pick Pro or Ultra to open the desk."
          : "The desk is closed until you're admitted. Create the account first — that's done — then join the waitlist."}
      </p>
      {phase === "join" ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void join()}
          className="glass-violet mt-6 inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Joining…" : "Join the waitlist"}
        </button>
      ) : null}
      <DiscordJoinButton />
      {error ? (
        <p className="mt-4 text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function Paywall() {
  const { user } = useAuth();
  const showUltra = showTvm10Labs();
  const usePricingTable = stripePricingTableConfigured();
  const [plan, setPlan] = useState<PaidPlanId>("pro");
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const price = priceFor(plan, interval);
  const savePercent = yearlySavingsPercent(plan);

  async function checkout() {
    setError("");
    setLoading(true);
    try {
      const response = await authedFetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval, plan }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (payload.url) {
        window.location.href = payload.url;
        return;
      }
      setError(payload.error || "Checkout is not available yet.");
    } catch {
      setError("Could not start checkout. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">
        You&apos;re in
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">
        Pick Pro or Ultra to open the desk
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {usePricingTable
          ? "Pick Pro or Ultra below. Stripe handles checkout, tax, and promo codes."
          : "Beta testers need a paid plan. On the Stripe page, tap Add promotion code if you have a beta discount."}
      </p>
      {usePricingTable ? (
        <StripePricingTable
          className="mt-5 w-full"
          clientReferenceId={user?.uid}
          customerEmail={user?.email ?? undefined}
        />
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPlan("pro")}
              className={`rounded-2xl px-3 py-3 text-sm font-semibold ${
                plan === "pro" ? "glass-violet text-white" : "bg-surface text-ink"
              }`}
            >
              <ProGlowText>Pro</ProGlowText>
            </button>
            {showUltra ? (
              <button
                type="button"
                onClick={() => setPlan("ultra")}
                className={`rounded-2xl px-3 py-3 text-sm font-semibold ${
                  plan === "ultra" ? "glass-violet text-white" : "bg-surface text-ink"
                }`}
              >
                <UltraShinePhrase>Ultra</UltraShinePhrase>
              </button>
            ) : (
              <div />
            )}
          </div>
          <div className="mt-3 flex rounded-full bg-surface p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={`flex-1 rounded-full py-2 ${
                interval === "monthly" ? "glass-violet text-white" : "text-ink-soft"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("yearly")}
              className={`flex-1 rounded-full py-2 ${
                interval === "yearly" ? "glass-violet text-white" : "text-ink-soft"
              }`}
            >
              Yearly · save {savePercent}%
            </button>
          </div>
          <p className="mt-4 text-center font-display text-2xl font-bold text-ink">
            ${price.perMonth}
            <span className="text-sm font-medium text-ink-soft"> / month</span>
          </p>
          {interval === "yearly" ? (
            <p className="text-center text-xs text-ink-soft">
              Billed ${price.billed} once a year
            </p>
          ) : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => void checkout()}
            className="glass-violet mt-5 inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
          >
            {loading
              ? "Opening Stripe…"
              : plan === "ultra"
                ? "Continue to Ultra checkout"
                : "Continue to Pro checkout"}
          </button>
          {error ? (
            <p className="mt-4 text-sm text-coral" role="alert">
              {error}
            </p>
          ) : null}
        </>
      )}
      <DiscordJoinButton />
    </>
  );
}

export function BetaAccessScreen({ phase }: { phase: "join" | "pending" | "pay" }) {
  const { logout } = useAuth();

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-5">
      <div className="glass-strong w-full max-w-2xl rounded-[28px] p-8">
        <TVMBrand />
        <div className="mt-6">
          {phase === "pay" ? <Paywall /> : <JoinOrPending phase={phase} />}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-6 w-full text-center text-sm text-ink-soft hover:text-violet"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
