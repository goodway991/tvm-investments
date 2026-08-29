import type { Metadata } from "next";
import { LegalContact } from "@/components/LegalContact";
import { LegalDocument } from "@/components/LegalDocument";
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_ENTITY,
  LEGAL_JURISDICTION,
  LEGAL_VENUE,
  TOS_VERSION,
} from "@/lib/legal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Terms of Service — TVM Investments",
  robots: { index: true, follow: true },
  description:
    "Terms that govern use of TVM Investments, including the educational-research disclaimer, accounts, billing, and liability limits.",
};

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service" updated={LEGAL_EFFECTIVE_DATE}>
      <p>
        These Terms of Service (“Terms”) are a legally binding agreement between
        you and {LEGAL_ENTITY} (“TVM,” “we,” “us,” or “our”) governing access to
        and use of the TVM website, dashboard, research tools, and related
        services (the “Service”).
      </p>
      <p>
        By creating an account, checking the acceptance box, paying for a plan,
        or using the Service, you agree to these Terms, the{" "}
        <a href="/privacy">Privacy Policy</a>, and the{" "}
        <a href="/disclaimer">Risk Disclaimer</a>. If you do not agree, do not
        use the Service.
      </p>
      <p>Document version {TOS_VERSION}.</p>

      <h2>1. Who we are and what this Service is</h2>
      <p>
        TVM provides educational market-research tools: end-of-day screens,
        composite scores, movers lists, research notes, watchlists, a
        user-entered portfolio tracker, scenario calculators, and related
        displays. Some features may be labeled coming soon, preview, or beta.
      </p>
      <p>
        <strong>
          The Service is an informational and educational product. It is not a
          brokerage, exchange, bank, custodian, robo-adviser, or dealer.
        </strong>{" "}
        We do not take orders, hold your money or securities, or connect to your
        brokerage unless a separately disclosed integration is later added.
      </p>

      <h2>2. Not investment, tax, or legal advice</h2>
      <p>
        Nothing on the Service is investment advice, a recommendation to buy,
        sell, or hold any security, cryptocurrency, or other instrument, tax
        advice, legal advice, or an offer, solicitation, or recommendation to
        purchase or sell securities.
      </p>
      <p>
        Scores, flags, “picks,” rankings, charts, forecasts, cones, projected
        returns, sector notes, news summaries, and similar outputs are general,
        impersonal, and model- or rule-generated. They are not based on your
        financial situation, objectives, time horizon, tax status, or risk
        tolerance, even if you saved a watchlist or portfolio.
      </p>
      <p>
        TVM is not a broker-dealer, registered investment adviser, commodity
        trading advisor, municipal advisor, or fiduciary, and no
        adviser-client, broker-customer, or fiduciary relationship is created by
        your use of the Service or by any communication from us.
      </p>
      <p>
        You are solely responsible for your investment decisions. You should
        consult a licensed adviser, broker, accountant, or attorney before acting.
        You agree that you will not treat TVM outputs as a substitute for that
        advice.
      </p>

      <h2>3. Assumption of market risk</h2>
      <p>
        Investing involves a substantial risk of loss, including loss of
        principal. Markets gap, companies fail, and liquidity can disappear.
        Past performance — including any backtest, track record, composite
        score, or historical chart — does not predict future results.
      </p>
      <p>
        You use the Service at your own risk. If you choose to trade or invest
        based on anything you see here, you do so solely on your own behalf.
      </p>

      <h2>4. Eligibility</h2>
      <ul>
        <li>You must be at least 18 years old (or the age of majority where you live, if higher).</li>
        <li>You must have the legal capacity to enter this contract.</li>
        <li>You may not use the Service if you are barred under applicable law, including sanctions laws.</li>
        <li>
          If you use the Service on behalf of an organization, you represent that
          you have authority to bind it, and “you” includes that organization.
        </li>
      </ul>

      <h2>5. Accounts and security</h2>
      <p>
        You must provide accurate information, keep your password confidential,
        and notify us promptly of unauthorized access. You are responsible for
        all activity under your account. We may refuse, suspend, or terminate
        accounts that we reasonably believe violate these Terms, present a
        security risk, or abuse the Service.
      </p>
      <p>
        One person should not share a login to evade plan limits. We may treat
        that as a material breach.
      </p>

      <h2>6. Plans, payments, and cancellation</h2>
      <p>
        We may offer a Free plan and one or more paid plans (including “Pro”)
        with different limits. Feature lists on the site describe the then-current
        offering and may change.
      </p>
      <p>
        Paid plans are billed in advance on the interval you select (for example
        monthly or yearly) through our payment processor (currently expected to
        be Stripe). Prices are stated at checkout in U.S. dollars unless another
        currency is shown. Taxes may be added where required.
      </p>
      <ul>
        <li>
          <strong>Auto-renewal.</strong> Subscriptions renew automatically at the
          then-current rate until you cancel. You authorize us and the processor
          to charge the payment method on file.
        </li>
        <li>
          <strong>Cancellation.</strong> You may cancel auto-renew for the end of
          the current paid period through Settings (View plan → Downgrade to
          Free) or the processor’s customer portal. Cancellation stops the next
          renewal. You keep the paid plan until that period ends.
        </li>
        <li>
          <strong>Plan changes.</strong> Upgrades, downgrades, and switches
          between paid plans (including monthly and yearly) do not take effect
          until the current paid period ends. You keep the plan you already paid
          for until then. The new plan, and its charge, start at the next period.
          The processor’s customer portal does not switch plans mid-cycle.
        </li>
        <li>
          <strong>Refunds.</strong> You may request a full refund of your most
          recent paid charge within 7 days of that purchase. After 7 days, that
          charge is non-refundable and you remain paid for the interval you
          selected until it ends. Turning off auto-renew stops the next charge;
          it does not refund time already paid after the 7-day window. Mandatory
          consumer-law cooling-off rights, where they apply and are not waived,
          still apply. See{" "}
          <a href="/refunds">Cancellation and refunds</a>.
        </li>
        <li>
          <strong>Failed payments.</strong> If a charge fails, we may retry,
          downgrade you to Free, or suspend paid features.
        </li>
        <li>
          <strong>Price changes.</strong> We may change prices with notice before
          the next renewal. If you do not agree, cancel before the renewal date.
        </li>
      </ul>
      <p>
        Payment card data is handled by the processor, not stored on our
        application servers. The processor’s terms apply to the payment itself.
      </p>

      <h2>7. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>violate law, including securities, market-manipulation, or sanctions laws;</li>
        <li>misrepresent TVM outputs as personalized investment advice to others, or as a guaranteed return;</li>
        <li>scrape, crawl, harvest, or bulk-download the Service except through documented public pages using ordinary browsers;</li>
        <li>overload, probe, or attack the Service, or bypass rate limits or access controls;</li>
        <li>access another user’s account or data, or attempt to do so;</li>
        <li>reverse engineer the Service except as the law expressly allows;</li>
        <li>copy, resell, or redistribute our research, scores, or data feeds except for your personal educational use;</li>
        <li>upload malware or illegal content, or use the Service to send spam;</li>
        <li>enter Social Security numbers, bank or brokerage credentials, or full payment card numbers into any TVM field;</li>
        <li>use the Service if you are a competitor building a substitute, except to the extent evaluating it as an ordinary customer.</li>
      </ul>
      <p>
        We may investigate and may cooperate with law enforcement. We may remove
        content or disable access without prior notice where we reasonably
        believe these Terms or the law require it.
      </p>

      <h2>8. Your content and feedback</h2>
      <p>
        You retain ownership of watchlist symbols, portfolio numbers, and
        feedback you submit. You grant TVM a worldwide, non-exclusive,
        royalty-free license to host, process, and display that content solely
        to operate the Service for you.
      </p>
      <p>
        Feedback, ideas, and ratings may be used by TVM to operate and improve
        the Service without restriction, attribution, or compensation, and
        without treating them as confidential, except for personal information
        which remains governed by the Privacy Policy.
      </p>
      <p>
        You represent that your content is accurate to your knowledge and that
        you have the right to provide it.
      </p>

      <h2>9. Intellectual property</h2>
      <p>
        The Service, including software, layout, branding, original text, score
        presentation, and compilation of research, is owned by TVM or its
        licensors and is protected by intellectual-property laws. We grant you a
        limited, personal, revocable, non-transferable, non-sublicensable
        license to use the Service for your own educational research, subject to
        these Terms and your plan.
      </p>
      <p>
        Market data, company names, and third-party headlines remain the
        property of their owners. You may not scrape or republish that data from
        TVM.
      </p>
      <p>
        Daily Brief and similar news cards may show titles and short excerpts
        from third-party publishers, including Morning Brew, Yahoo Finance, and
        other wires we may use. That material stays the publisher’s. TVM is not
        affiliated with, sponsored by, or endorsed by Morning Brew Inc. or those
        other publishers. We do not claim their articles as our own.
      </p>
      <p>
        “TVM,” “TVM Investments,” and related marks are identifiers we use for
        the Service. You may not use them in a way that implies sponsorship or
        endorsement.
      </p>

      <h2>10. Third-party services and market data</h2>
      <p>
        The Service depends on third parties, including Google Firebase for
        authentication and database hosting, our website host, Stripe for
        payments, and market-data and news sources such as Yahoo Finance, Morning
        Brew, and other vendors we may use. Their availability, accuracy, and terms are
        outside our control.
      </p>
      <p>
        Quotes, fundamentals, charts, and news may be delayed, incomplete,
        unofficial, or wrong. The Service may run in a demonstration mode with
        sample data. You must not use TVM as the sole source for an order-entry
        or NAV calculation.
      </p>
      <p>
        Third-party market data is licensed for personal, non-commercial
        educational viewing on the Service. Redistribution is prohibited.
      </p>

      <h2>11. Simulated, preview, and archive features</h2>
      <p>
        Paper-trading, scenario calculators, forecast cones, “Horizon” or similar
        desks, and archive calendars are simulations or historical views. They
        do not place real orders, do not represent actual brokerage fills, and
        may omit commissions, slippage, borrow fees, dividends, corporate
        actions, and taxes.
      </p>
      <p>
        Archive views show stored research snapshots for dates we have retained.
        They are not a complete tick history. Free and paid plans may have
        different lookback windows. Preview features may be limited to certain
        accounts until we generally release them.
      </p>
      <p>
        Hypothetical or backtested results have inherent limitations. They may
        overfit history, ignore costs, and not reflect live trading. They are
        not a guarantee of future performance.
      </p>

      <h2>12. Portfolio tracker is not custody</h2>
      <p>
        Positions and cash you enter are a personal log. TVM does not verify
        them against a broker, does not safeguard assets, and is not responsible
        if those figures are wrong. Losing access to your account may lose
        those notes unless we can restore them from backups.
      </p>

      <h2>13. Disclaimers of warranty</h2>
      <p>
        THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM
        EXTENT PERMITTED BY LAW, TVM DISCLAIMS ALL WARRANTIES, EXPRESS, IMPLIED,
        OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, COMPLETENESS, TIMELINESS,
        AND UNINTERRUPTED OR ERROR-FREE OPERATION.
      </p>
      <p>
        We do not warrant that scores, news, AI-generated text, or forecasts are
        correct, or that the Service will meet your requirements or be available
        at any particular time (including during market hours).
      </p>
      <p>
        Some jurisdictions do not allow certain warranty disclaimers. In those
        places, the disclaimer applies to the fullest extent permitted, and
        statutory rights you cannot waive remain.
      </p>

      <h2>14. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, TVM AND ITS FOUNDERS, OFFICERS,
        EMPLOYEES, CONTRACTORS, AND AFFILIATES ARE NOT LIABLE FOR ANY TRADING
        OR INVESTMENT LOSSES, LOST PROFITS, LOST DATA, LOST GOODWILL, BUSINESS
        INTERRUPTION, OR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
        EXEMPLARY, OR PUNITIVE DAMAGES, WHETHER BASED IN CONTRACT, TORT
        (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR OTHERWISE, EVEN IF ADVISED
        OF THE POSSIBILITY.
      </p>
      <p>
        YOU AGREE THAT TVM IS NOT ACCOUNTABLE FOR YOUR INVESTMENT DECISIONS OR
        THEIR OUTCOMES, INCLUDING LOSSES, TAXES, OR MISSED OPPORTUNITIES.
      </p>
      <p>
        IF A COURT OR ARBITRATOR FINDS THAT ANY LIABILITY CANNOT BE DISCLAIMED,
        OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE
        SERVICE OR THESE TERMS IS LIMITED TO THE GREATER OF (A) THE AMOUNTS YOU
        PAID TO TVM FOR THE SERVICE IN THE TWELVE (12) MONTHS BEFORE THE CLAIM
        OR (B) FIFTY U.S. DOLLARS (US $50).
      </p>
      <p>
        These limits are a fundamental part of the bargain and apply even if a
        remedy fails of its essential purpose. They do not limit liability that
        cannot be limited under law, such as liability for our own fraud or
        willful misconduct, or for death or personal injury caused by negligence
        where that limitation is prohibited.
      </p>

      <h2>15. Indemnity</h2>
      <p>
        You will indemnify, defend, and hold harmless TVM and its people from
        any claim, loss, liability, damage, cost, or expense (including
        reasonable attorneys’ fees) arising out of: (a) your use of the Service;
        (b) your trading or investment activity; (c) your content; (d) your
        violation of these Terms or of law; or (e) your misuse of market data.
        We may assume exclusive defense of any matter, at your expense, and you
        will cooperate.
      </p>

      <h2>16. Dispute resolution; arbitration; class-action waiver</h2>
      <p>
        <strong>Informal resolution.</strong> Before filing a claim, you agree
        to email a description of the dispute: <LegalContact /> We will try in
        good faith to resolve it within 30 days.
      </p>
      <p>
        <strong>Binding arbitration.</strong> Except for the exclusions below,
        any dispute arising out of or relating to these Terms or the Service
        will be resolved by binding individual arbitration administered by the
        American Arbitration Association under its Consumer Arbitration Rules.
        The seat of arbitration is New York County, New York, unless the
        arbitrator determines that a different location or a remote hearing is
        required so the proceeding remains fair and accessible. Judgment on the
        award may be entered in any court of competent jurisdiction.
      </p>
      <p>
        <strong>Exclusions.</strong> Either party may bring an individual action
        in small-claims court. Either party may seek injunctive or other
        equitable relief in court for infringement or misuse of intellectual
        property or unauthorized access to the Service.
      </p>
      <p>
        <strong>Class-action waiver.</strong> YOU AND TVM AGREE THAT EACH MAY
        BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY, AND NOT
        AS A PLAINTIFF OR CLASS MEMBER IN ANY CLASS, COLLECTIVE, CONSOLIDATED,
        OR REPRESENTATIVE PROCEEDING. The arbitrator may not consolidate claims
        or preside over any form of representative proceeding unless both sides
        agree in writing.
      </p>
      <p>
        <strong>Opt out.</strong> You may opt out of arbitration and the
        class-action waiver by sending written notice within 30 days of first
        accepting these Terms, from the email on your account, stating your
        name, account email, and that you opt out of arbitration. <LegalContact />
      </p>
      <p>
        If the class-action waiver is found unenforceable as to a particular
        claim, that claim must proceed in court, not arbitration. If the
        arbitration agreement is found unenforceable in whole, Section 17
        (courts) applies.
      </p>
      <p>
        This Section 16 does not prevent you from filing a complaint with a
        government agency.
      </p>

      <h2>17. Governing law and venue</h2>
      <p>
        These Terms are governed by the laws of {LEGAL_JURISDICTION}, excluding
        conflict-of-law rules, except that the Federal Arbitration Act governs
        interpretation and enforcement of the arbitration agreement.
      </p>
      <p>
        Subject to Section 16, exclusive venue for court proceedings is{" "}
        {LEGAL_VENUE}, and you consent to personal jurisdiction there, except
        where a mandatory consumer-protection law in your place of residence
        requires otherwise. In that case, those non-waivable protections still
        apply.
      </p>

      <h2>18. Changes to the Service and to these Terms</h2>
      <p>
        We may modify or discontinue the Service, including Free and paid
        features, at any time. We may change these Terms by posting an updated
        version and changing the effective date. Material changes will be
        indicated on the Service or by email where reasonably practicable.
        Continued use after the effective date constitutes acceptance. If you do
        not agree, stop using the Service and cancel any paid plan.
      </p>

      <h2>19. Termination</h2>
      <p>
        You may stop using the Service and request account deletion as described
        in the Privacy Policy. We may suspend or terminate access immediately if
        you breach these Terms, if required by law, or if we shut down the
        Service. Sections that by their nature should survive (including 2, 3,
        7–17, 19–23) survive termination.
      </p>
      <p>
        Upon termination, your license ends. We may delete workspace data in
        accordance with the Privacy Policy. Paid features end when the account
        ends; unused time is not refunded except as required by law or Section 6.
      </p>

      <h2>20. Export and sanctions</h2>
      <p>
        You may not use the Service if you are located in a comprehensively
        sanctioned jurisdiction or if you are on a U.S. or other applicable
        government restricted-party list. You will comply with export-control
        and sanctions laws.
      </p>

      <h2>21. Copyright complaints</h2>
      <p>
        If you believe content on the Service infringes your copyright, send a
        notice that meets 17 U.S.C. § 512(c)(3) to: <LegalContact /> We may
        remove content and, in appropriate circumstances, terminate repeat
        infringers.
      </p>

      <h2>22. Electronic communications</h2>
      <p>
        You consent to receive notices electronically, including via the Service
        or the email on your account. Electronic acceptance of these Terms has
        the same effect as a physical signature.
      </p>

      <h2>23. Miscellaneous</h2>
      <ul>
        <li>
          <strong>Entire agreement.</strong> These Terms, the Privacy Policy, and
          the Risk Disclaimer are the entire agreement and supersede prior
          understandings about the Service.
        </li>
        <li>
          <strong>Severability.</strong> If a provision is unenforceable, it will
          be modified to the minimum extent necessary, and the rest remains in
          effect.
        </li>
        <li>
          <strong>Waiver.</strong> A failure to enforce a provision is not a
          waiver.
        </li>
        <li>
          <strong>Assignment.</strong> You may not assign these Terms without our
          consent. We may assign them in connection with a merger, acquisition,
          or sale of assets, or to an affiliate.
        </li>
        <li>
          <strong>Force majeure.</strong> We are not liable for delays or
          failures caused by events beyond our reasonable control, including
          outages of third-party data, hosting, or payment providers.
        </li>
        <li>
          <strong>No third-party beneficiaries.</strong> Except as stated for
          indemnified persons, these Terms do not create third-party beneficiary
          rights.
        </li>
        <li>
          <strong>Interpretation.</strong> Headings are for convenience only.
          “Including” means “including without limitation.”
        </li>
        <li>
          <strong>Conflicts.</strong> If these Terms conflict with in-product
          marketing copy, these Terms control.
        </li>
      </ul>

      <h2>24. Contact</h2>
      <p>
        <LegalContact purpose="Legal notices" />
      </p>
      <p>
        You can also use the signed-in Settings feedback form.
      </p>
    </LegalDocument>
  );
}
