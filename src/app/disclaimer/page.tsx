import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Risk Disclaimer — TVM Investments",
  robots: { index: true, follow: true },
  description:
    "Market risk, data limits, and how TVM Investments handles losses.",
};

export default function DisclaimerPage() {
  return (
    <LegalDocument title="Investment risk disclaimer" updated={LEGAL_EFFECTIVE_DATE}>
      <p className="rounded-2xl bg-coral/10 p-4 font-medium text-ink">
        You can lose money in the markets, including all of the money you
        invest. {LEGAL_ENTITY} is not responsible for your losses.
      </p>

      <h2>1. You can lose money</h2>
      <p>
        Equity and related markets are volatile. Prices can gap down, companies
        can fail, and liquidity can disappear. You may lose some or all of any
        capital you choose to put at risk in the markets. That risk exists
        whether or not you use this website.
      </p>

      <h2>2. Hypothetical and backtested results</h2>
      <p>
        Hypothetical, backtested, paper-traded, or simulated performance has
        inherent limitations. It may overfit history, ignore commissions,
        slippage, borrow fees, dividends, taxes, and capacity, and may not
        reflect actual trading. Past results do not guarantee future results.
        Forecast cones and scenario calculators are illustrations.
      </p>

      <h2>3. No accountability for your trades</h2>
      <p>
        If you choose to trade or invest based on anything you see here, you do
        so solely at your own risk. {LEGAL_ENTITY}, its founders, and its
        affiliates are not accountable for your profits or losses, missed
        opportunities, or tax consequences.
      </p>
      <p>
        This page is in addition to the limitation of liability and indemnity in
        the <a href="/terms">Terms of Service</a>.
      </p>

      <h2>4. Data may be wrong, delayed, or incomplete</h2>
      <p>
        Quotes, news, fundamentals, and charts may be delayed, incomplete, or
        incorrect. The site may run in demonstration mode with sample data.
        Third-party sources such as Yahoo Finance are unofficial and can change
        or rate-limit without notice. Language-model summaries can hallucinate
        or omit material facts.
      </p>

      <h2>5. Forward-looking statements</h2>
      <p>
        Any discussion of potential returns, catalysts, or outlooks is
        speculative. Actual events may differ materially.
      </p>

      <h2>6. If you do not accept this risk</h2>
      <p>
        Do not use the Service. By creating an account or continuing to use the
        Service, you acknowledge that you have read this page, the Terms of
        Service, and the Privacy Policy.
      </p>
    </LegalDocument>
  );
}
