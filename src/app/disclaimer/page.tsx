import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Risk Disclaimer — TVM Investments",
  robots: { index: true, follow: true },
  description:
    "TVM Investments is educational research only. It is not investment advice, and you can lose money in the markets.",
};

export default function DisclaimerPage() {
  return (
    <LegalDocument title="Investment risk disclaimer" updated={LEGAL_EFFECTIVE_DATE}>
      <p className="rounded-2xl bg-coral/10 p-4 font-medium text-ink">
        {LEGAL_ENTITY} is for educational and research use only. It is not
        investment, tax, or legal advice. You can lose money in the markets,
        including all of the money you invest. We are not responsible for your
        losses.
      </p>

      <h2>1. Not advice, not a recommendation</h2>
      <p>
        Tickers, “flagged picks,” composite scores, movers lists, charts,
        forecast ranges, projected returns, sector notes, news summaries, and
        any similar output are not recommendations to buy, sell, or hold. They
        are not personalized to your financial situation, objectives, or risk
        tolerance. Saving a watchlist or portfolio does not make the research
        personalized advice.
      </p>
      <p>
        No communication from {LEGAL_ENTITY} creates an adviser-client,
        broker-customer, or fiduciary relationship. We are not a registered
        investment adviser, broker-dealer, or commodity trading advisor.
      </p>

      <h2>2. You can lose money</h2>
      <p>
        Equity and related markets are volatile. Prices can gap down, companies
        can fail, and liquidity can disappear. You may lose some or all of any
        capital you choose to put at risk in the markets. That risk exists
        whether or not you use this website.
      </p>

      <h2>3. Hypothetical and backtested results</h2>
      <p>
        Hypothetical, backtested, paper-traded, or simulated performance has
        inherent limitations. It may overfit history, ignore commissions,
        slippage, borrow fees, dividends, taxes, and capacity, and may not
        reflect actual trading. Past results do not guarantee future results.
        Forecast cones and scenario calculators are illustrations, not
        predictions you should rely on to size a real position.
      </p>

      <h2>4. No accountability for your trades</h2>
      <p>
        If you choose to trade or invest based on anything you see here, you do
        so solely at your own risk. {LEGAL_ENTITY}, its founders, and its
        affiliates are not accountable for your profits or losses, missed
        opportunities, or tax consequences. You agree to independently verify
        all information and to use licensed professionals as needed.
      </p>
      <p>
        This disclaimer is in addition to the limitation of liability and
        indemnity in the <a href="/terms">Terms of Service</a>.
      </p>

      <h2>5. Data may be wrong, delayed, or incomplete</h2>
      <p>
        Quotes, news, fundamentals, and charts may be delayed, incomplete, or
        incorrect. The site may run in demonstration mode with sample data.
        Third-party sources such as Yahoo Finance are unofficial and can change
        or rate-limit without notice. Language-model summaries can hallucinate
        or omit material facts.
      </p>

      <h2>6. Forward-looking statements</h2>
      <p>
        Any discussion of potential returns, catalysts, or outlooks is
        speculative. Actual events may differ materially. You should not place
        undue reliance on forward-looking statements.
      </p>

      <h2>7. Regulatory status</h2>
      <p>
        {LEGAL_ENTITY} does not hold itself out as a broker-dealer, registered
        investment adviser, or similar regulated intermediary. Use of general
        research tools does not mean we are managing your money or recommending
        a transaction.
      </p>

      <h2>8. If you do not accept this risk</h2>
      <p>
        Do not use the Service, and do not make investment decisions based on it.
        By creating an account or continuing to use the Service, you acknowledge
        that you have read this disclaimer, the Terms of Service, and the
        Privacy Policy.
      </p>
    </LegalDocument>
  );
}
