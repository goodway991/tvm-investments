import type { Metadata } from "next";
import { LegalContact } from "@/components/LegalContact";
import { LegalDocument } from "@/components/LegalDocument";
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY, TOS_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — TVM Investments",
  robots: { index: true, follow: true },
  description:
    "How TVM Investments collects, uses, stores, and shares personal information, and the rights you have over that information.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy" updated={LEGAL_EFFECTIVE_DATE}>
      <p>
        This Privacy Policy describes how {LEGAL_ENTITY} (“TVM,” “we,” “us,” or
        “our”) collects, uses, discloses, stores, and otherwise processes personal
        information when you visit our website, create an account, subscribe, submit
        feedback, or otherwise use our research tools (the “Service”).
      </p>
      <p>
        It is intended to be a complete notice for users in the United States,
        the European Economic Area, the United Kingdom, and other jurisdictions
        that grant privacy rights. If you do not agree with this Policy, do not
        use the Service.
      </p>
      <p>
        Document version {TOS_VERSION}. This Policy should be read together with
        our <a href="/terms">Terms of Service</a> and{" "}
        <a href="/disclaimer">Risk Disclaimer</a>.
      </p>

      <h2>1. Who we are</h2>
      <p>
        {LEGAL_ENTITY} operates an educational market-research website. We are
        not a bank, broker-dealer, registered investment adviser, commodity
        trading advisor, or other licensed financial intermediary. We do not
        custody client assets and we do not execute trades.
      </p>
      <p>
        For privacy questions or requests: <LegalContact />
      </p>

      <h2>2. Scope</h2>
      <p>This Policy applies to personal information we process in connection with:</p>
      <ul>
        <li>the public website, including landing, about, and legal pages;</li>
        <li>account registration, authentication, and the signed-in dashboard;</li>
        <li>watchlists, portfolio entries, paper-trading / simulation features, and settings;</li>
        <li>paid subscriptions and checkout when payment processing is enabled;</li>
        <li>bug reports, ratings, and feature requests;</li>
        <li>server, security, and diagnostic logs created while operating the Service.</li>
      </ul>
      <p>
        It does not apply to third-party websites or services that we do not
        control, including Yahoo Finance, Google Firebase, Stripe, or news
        publishers linked from the Service. Their policies govern their processing.
      </p>

      <h2>3. Categories of information we collect</h2>
      <h3>3.1 Information you provide</h3>
      <ul>
        <li>
          <strong>Account identifiers:</strong> email address, first name, last
          name, display name, and a unique user ID issued by our authentication
          provider.
        </li>
        <li>
          <strong>Credentials:</strong> passwords are collected at sign-up or
          password reset. They are hashed and stored by Firebase Authentication.
          We do not write your password into our application database.
        </li>
        <li>
          <strong>Workspace data:</strong> watchlist symbols, portfolio cash and
          positions you enter, plan entitlement, and similar saved preferences.
        </li>
        <li>
          <strong>Legal acceptance:</strong> timestamp and version of the Terms,
          Privacy Policy, and Risk Disclaimer you accepted.
        </li>
        <li>
          <strong>Feedback:</strong> messages, a 1–5 star rating, and the email
          associated with your account so we can investigate and reply.
        </li>
        <li>
          <strong>Support correspondence:</strong> emails or other messages you
          send to our published contact address.
        </li>
      </ul>

      <h3>3.2 Information collected automatically</h3>
      <ul>
        <li>
          <strong>Technical and security data:</strong> IP address, device and
          browser type, approximate time of access, request URLs, and similar
          log data that Firebase, our hosting provider, or our application
          servers may record to operate, secure, and debug the Service.
        </li>
        <li>
          <strong>Session data:</strong> authentication cookies or tokens needed
          to keep you signed in, plus local or session storage used for legal
          acceptance, the virtual tour, and interface state.
        </li>
      </ul>

      <h3>3.3 Information from service providers</h3>
      <ul>
        <li>
          <strong>Authentication:</strong> Firebase Authentication confirms that
          a sign-in is valid and provides the user ID we use to isolate your
          records.
        </li>
        <li>
          <strong>Payments:</strong> if you purchase a paid plan, Stripe (or a
          similar processor we name at checkout) receives payment details
          directly. We may receive a customer identifier, subscription status,
          plan, billing interval, and limited payment-method metadata (for
          example, last four digits and brand). We do not receive or store full
          payment card numbers or CVV codes.
        </li>
        <li>
          <strong>Market data:</strong> quotes, charts, fundamentals, and
          headlines are requested from third-party market-data sources using
          ticker symbols, not your name. Those providers may log the technical
          request.
        </li>
      </ul>

      <h2>4. Information we do not collect</h2>
      <p>We do not ask you to provide, and you should not enter into any field:</p>
      <ul>
        <li>Social Security numbers, tax IDs, or government ID images;</li>
        <li>bank account, routing, or brokerage account numbers;</li>
        <li>brokerage usernames, passwords, or API keys;</li>
        <li>full payment card numbers (those go to the payment processor only);</li>
        <li>biometric identifiers;</li>
        <li>precise GPS location.</li>
      </ul>
      <p>
        Portfolio figures on the Service are values you type or that we derive
        from public market prices. They are not a live feed from your broker
        unless we later offer a separately disclosed integration, which this
        Policy would then describe.
      </p>

      <h2>5. How we use information</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>create and authenticate accounts and keep you signed in;</li>
        <li>save and display your watchlist, portfolio, and simulation data;</li>
        <li>apply Free or Pro plan limits and operate paid subscriptions;</li>
        <li>generate, cache, and show research snapshots, charts, and reports;</li>
        <li>receive, investigate, and respond to feedback and support requests;</li>
        <li>maintain security, prevent abuse, debug outages, and keep logs;</li>
        <li>comply with law, enforce our Terms, and protect our rights;</li>
        <li>send transactional messages about the account or Service (for example, password reset or material legal updates);</li>
        <li>improve the Service based on aggregated or de-identified usage patterns.</li>
      </ul>
      <p>
        We do <strong>not</strong> sell personal information. We do not use your
        watchlist or portfolio to provide personalized investment advice, and we
        do not use that data to trade against you.
      </p>

      <h3>5.1 Legal bases (EEA / UK / similar laws)</h3>
      <p>Where a “legal basis” is required, we rely on:</p>
      <ul>
        <li>
          <strong>Contract:</strong> to provide the account and Service you
          requested, including authentication, saved workspace data, and paid
          features you purchase.
        </li>
        <li>
          <strong>Legitimate interests:</strong> to secure the Service, prevent
          fraud and abuse, keep essential logs, understand product reliability,
          and defend legal claims, in each case where those interests are not
          overridden by your rights.
        </li>
        <li>
          <strong>Consent:</strong> where we ask for it, including acceptance of
          this Policy at sign-up, and for any optional cookies or marketing we
          may introduce later (we do not currently send marketing newsletters).
        </li>
        <li>
          <strong>Legal obligation:</strong> when we must retain or disclose
          information to comply with law, regulation, or valid legal process.
        </li>
      </ul>

      <h2>6. Cookies and similar technologies</h2>
      <p>We use cookies, local storage, and similar technologies that are:</p>
      <ul>
        <li>
          <strong>Strictly necessary:</strong> Firebase Authentication session
          cookies or tokens so the dashboard can recognize you; security and
          load-balancing cookies from our host.
        </li>
        <li>
          <strong>Functional:</strong> local or session storage for legal
          acceptance version and interface state (for example, a collapsed menu).
        </li>
      </ul>
      <p>
        We do not currently use third-party advertising cookies, cross-site
        behavioral advertising pixels, or a marketing tag manager. If that
        changes, we will update this Policy and, where required, request consent.
      </p>
      <p>
        You can block cookies in your browser. If you block necessary cookies,
        sign-in and account features may not work.
      </p>

      <h2>7. Payments</h2>
      <p>
        Paid plans are processed by Stripe, Inc. and its affiliates (“Stripe”),
        or another processor identified at checkout. Stripe’s processing is
        described in Stripe’s own privacy notice. Card data is submitted to
        Stripe, not to our servers. We store only what we need to recognize your
        subscription and provide the plan you paid for.
      </p>
      <p>
        If you use a payment method that supports additional identity checks
        (for example, Link by Stripe), that provider’s terms and privacy notice
        also apply.
      </p>

      <h2>8. Feedback and ratings</h2>
      <p>
        If you submit a bug report or feature request, we store the content, your
        rating, your account email, and the time of submission. We may also email
        a copy to our operations inbox when that inbox is configured. Feedback is
        not anonymous unless we expressly offer an anonymous channel.
      </p>
      <p>
        Do not include passwords, payment card numbers, or other sensitive data
        in feedback. We may delete submissions that contain them.
      </p>

      <h2>9. How we share information</h2>
      <p>We share personal information only as follows:</p>
      <ul>
        <li>
          <strong>Processors:</strong> Google (Firebase Authentication, Cloud
          Firestore, and related Google Cloud hosting), our website host (for
          example Vercel), email delivery providers if configured, and Stripe
          for payments. They may process data only to provide services to us.
        </li>
        <li>
          <strong>Market-data providers:</strong> ticker symbols and technical
          request metadata, not your name or email, in order to retrieve quotes,
          charts, fundamentals, or news.
        </li>
        <li>
          <strong>Legal and safety:</strong> if required by law, regulation,
          subpoena, court order, or to protect users, the public, or TVM from
          harm, fraud, or security threats.
        </li>
        <li>
          <strong>Business transfer:</strong> if we merge, are acquired, or sell
          assets, personal information may transfer to the successor, who must
          honor this Policy or provide notice of changes.
        </li>
        <li>
          <strong>With your direction:</strong> if you ask us to send information
          to someone else.
        </li>
      </ul>
      <p>
        Other users cannot read your account, watchlist, portfolio, or feedback.
        Application access controls are designed so each signed-in user can
        access only their own documents.
      </p>

      <h2>10. International transfers</h2>
      <p>
        We are based in the United States. If you access the Service from another
        country, your information is processed in the United States and possibly
        other countries where our processors operate. Those countries may have
        different data-protection laws than your own.
      </p>
      <p>
        Where required (including transfers from the EEA or UK), we rely on
        appropriate safeguards such as the European Commission’s Standard
        Contractual Clauses, the UK International Data Transfer Addendum, and/or
        our processors’ certified transfer mechanisms.
      </p>

      <h2>11. Retention</h2>
      <ul>
        <li>
          Account, watchlist, portfolio, entitlement, and simulation data: for
          as long as the account remains open, then until we complete deletion
          after a verified request or after a period of inactivity we reasonably
          determine is abandonment.
        </li>
        <li>
          Legal acceptance records: for the life of the account and a reasonable
          period afterward to evidence consent.
        </li>
        <li>Feedback: for as long as needed to resolve the issue and improve the Service, then as needed for our legitimate records.</li>
        <li>
          Research snapshots: retained on our systems for a limited archive
          window (currently on the order of sixty days unless we state otherwise)
          and then pruned.
        </li>
        <li>
          Security and server logs: typically for a short operational period
          unless needed for an investigation or legal hold.
        </li>
        <li>
          Payment records: as required for tax, accounting, and dispute
          resolution, often several years.
        </li>
      </ul>
      <p>
        Backup copies held by processors may persist for a limited time after
        deletion from live systems.
      </p>

      <h2>12. Security</h2>
      <ul>
        <li>
          <strong>In transit:</strong> connections to the Service use TLS/HTTPS.
        </li>
        <li>
          <strong>At rest:</strong> our processors encrypt stored data using
          industry-standard methods (Firebase/Google Cloud typically AES-256 at
          rest).
        </li>
        <li>
          <strong>Passwords:</strong> hashed by Firebase Authentication; not
          stored in our Firestore documents.
        </li>
        <li>
          <strong>Access control:</strong> Firestore security rules restrict a
          signed-in user to their own user, watchlist, portfolio, and related
          documents. Administrative access is limited to operators of the
          Service.
        </li>
      </ul>
      <p>
        This is not end-to-end encryption in which only you hold the key. Our
        processors must decrypt data to serve the application. No method of
        transmission or storage is 100% secure. You are responsible for choosing
        a strong password and keeping it confidential.
      </p>
      <p>
        If we become aware of a breach affecting your personal information, we
        will notify you and regulators as required by applicable law.
      </p>

      <h2>13. Your choices and rights</h2>
      <p>You may:</p>
      <ul>
        <li>access and update watchlist and portfolio data in the dashboard;</li>
        <li>log out and stop using the Service;</li>
        <li>request access, correction, or deletion of personal information we hold;</li>
        <li>request a portable copy of account data we can reasonably export;</li>
        <li>object to or request restriction of certain processing where the law provides that right;</li>
        <li>withdraw consent where processing is based on consent, without affecting prior lawful processing;</li>
        <li>opt out of marketing emails if we ever send them (transactional mail may still be sent).</li>
      </ul>
      <p>
        To exercise rights, contact us: <LegalContact purpose="Privacy requests" />
        We may need to verify your identity (for example, by requiring you to
        message us from the email on the account) before fulfilling a request.
        We will not discriminate against you for exercising privacy rights.
      </p>

      <h3>13.1 California (CCPA / CPRA)</h3>
      <p>
        California residents have the right to know, access, correct, and delete
        personal information, and to opt out of “sale” or “sharing” for
        cross-context behavioral advertising. We do not sell personal information
        and we do not share it for cross-context behavioral advertising as those
        terms are defined in California law. We do not use or disclose sensitive
        personal information for purposes that require a right to limit under
        CPRA, because we do not collect such information in the ordinary
        operation of the Service.
      </p>
      <p>
        If we ever sell or share personal information, we will provide a “Do Not
        Sell or Share My Personal Information” method and honor browser opt-out
        preference signals as required.
      </p>
      <p>
        You may use an authorized agent as permitted by California law. We may
        require proof of authorization and identity verification.
      </p>

      <h3>13.2 EEA, UK, and similar jurisdictions</h3>
      <p>
        You may lodge a complaint with your local supervisory authority. We
        encourage you to contact us first so we can try to resolve the issue.
      </p>

      <h2>14. Automated processing and models</h2>
      <p>
        The Service uses quantitative rules and, in some cases, third-party
        language models to classify headlines or draft educational write-ups.
        Those outputs are not credit, employment, insurance, or housing
        decisions, and they are not personalized investment advice. You can
        choose not to rely on them. Model providers process the text we send
        them under their terms; we do not send them your password or payment
        card number.
      </p>

      <h2>15. Children</h2>
      <p>
        The Service is for adults. It is not directed to children under 18, or
        under 13 where that is the relevant COPPA threshold. We do not knowingly
        collect personal information from children. If you believe a child has
        created an account, contact us and we will delete it.
      </p>

      <h2>16. Do Not Track</h2>
      <p>
        Some browsers send a “Do Not Track” signal. There is no consistent
        industry standard for responding to it. We treat necessary cookies as
        described above and do not use advertising trackers at this time.
      </p>

      <h2>17. Changes</h2>
      <p>
        We may update this Policy. The “Effective” date at the top will change.
        Material changes will be posted on this page and, where required, we will
        provide additional notice (for example in-product or by email). Continued
        use after the effective date constitutes acceptance of the updated Policy
        where the law allows. Where consent is required, we will ask for it.
      </p>

      <h2>18. Contact</h2>
      <p>
        <LegalContact purpose="Privacy and data-protection requests" />
      </p>
      <p>
        If no public email is listed yet, submit the request from the signed-in
        Settings feedback form using the same account the request concerns.
      </p>
    </LegalDocument>
  );
}
