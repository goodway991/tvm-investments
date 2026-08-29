import type { Metadata } from "next";
import { LegalContact } from "@/components/LegalContact";
import { LegalDocument } from "@/components/LegalDocument";
import {
  LEGAL_ENTITY,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_VERSION,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — TVM Investments",
  robots: { index: true, follow: true },
  description:
    "How TVM Investments collects, uses, stores, and shares personal information, and the rights you have over that information.",
};

function Row({
  what,
  why,
  where,
}: {
  what: string;
  why: string;
  where: string;
}) {
  return (
    <tr>
      <td className="border-b border-ink/10 py-2.5 pr-4 align-top text-ink">{what}</td>
      <td className="border-b border-ink/10 py-2.5 pr-4 align-top">{why}</td>
      <td className="border-b border-ink/10 py-2.5 align-top">{where}</td>
    </tr>
  );
}

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy" updated={PRIVACY_EFFECTIVE_DATE}>
      <p>
        This Privacy Policy describes how {LEGAL_ENTITY} (“TVM,” “we,” “us,” or
        “our”) collects, uses, discloses, stores, and otherwise processes personal
        information when you visit{" "}
        <a href="https://tvminvest.com">tvminvest.com</a> (including{" "}
        tvm-investments.vercel.app), create an account, subscribe, submit
        feedback, or otherwise use our research tools (the “Service”).
      </p>
      <p>
        It is intended to be a complete notice at collection for users in the
        United States (including California), the European Economic Area, the
        United Kingdom, and other jurisdictions that grant privacy rights. If you
        do not agree with this Policy, do not use the Service.
      </p>
      <p>
        Document version {PRIVACY_VERSION}. This Policy should be read together
        with our <a href="/terms">Terms of Service</a> and{" "}
        <a href="/disclaimer">Risk Disclaimer</a>.
      </p>
      <p>
        <strong>What changed in this revision.</strong> On August 26, 2026 we
        added Support as a Settings note type next to bug reports and feature
        requests. On August 25, 2026 we updated this Policy so it matches how
        the live Service actually works: research tools now require a signed-in
        account; we store daily request counts to enforce plan limits; Settings
        notes are saved in our database and emailed through Google’s mail
        servers; and we spell out each category of data, why we collect it, and
        where it is processed.
      </p>

      <h2>1. Who we are</h2>
      <p>
        {LEGAL_ENTITY} is the controller of personal information described in
        this Policy. We operate a market-research website. We are not a bank,
        broker-dealer, registered investment adviser, commodity trading advisor,
        or other licensed financial intermediary. We do not custody client
        assets and we do not execute trades.
      </p>
      <p>
        We are based in the United States. We do not currently publish a postal
        mailing address. For privacy questions or requests: <LegalContact />
      </p>

      <h2>2. Scope</h2>
      <p>This Policy applies to personal information we process in connection with:</p>
      <ul>
        <li>the public website, including landing, about, and legal pages;</li>
        <li>account registration, authentication, and the signed-in dashboard;</li>
        <li>
          watchlists, portfolio entries you type in, and settings;
        </li>
        <li>paid subscriptions and checkout when payment processing is enabled;</li>
        <li>bug reports, feature requests, support notes, and ratings submitted in Settings;</li>
        <li>server, security, quota, and diagnostic logs created while operating the Service.</li>
      </ul>
      <p>
        It does not apply to third-party websites or services that we do not
        control, including Yahoo Finance, news publishers, Google (Firebase,
        Analytics, Gemini, and Gmail), Vercel, or Stripe. Their policies govern
        their own processing.
      </p>

      <h2>3. Notice at collection — what, why, and where</h2>
      <p>
        This table is the short version required by California and similar laws.
        Details follow in the sections below. We collect only the categories
        listed here. If we start collecting a new category, we will update this
        Policy first.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="border-b border-ink/20 pb-2 pr-4 font-semibold text-ink">
                What we collect
              </th>
              <th className="border-b border-ink/20 pb-2 pr-4 font-semibold text-ink">
                Why
              </th>
              <th className="border-b border-ink/20 pb-2 font-semibold text-ink">
                Where it goes
              </th>
            </tr>
          </thead>
          <tbody>
            <Row
              what="Email, first name, last name, display name, unique user ID"
              why="Create your account, sign you in, show your name, and isolate your records from other users"
              where="Google Firebase Authentication and Cloud Firestore (United States)"
            />
            <Row
              what="Password"
              why="Authenticate you"
              where="Hashed by Firebase Authentication. We do not store it in Firestore or in our application logs"
            />
            <Row
              what="Watchlist symbols, cooldown timestamps, portfolio cash, positions, and buy dates you enter"
              why="Save the workspace you asked us to keep"
              where="Cloud Firestore, under your user ID (United States)"
            />
            <Row
              what="Plan, role, and feature limits (Free or Pro)"
              why="Apply the correct watchlist size, cooldown, and daily request limits"
              where="Cloud Firestore entitlements document (United States). You cannot change these from the browser"
            />
            <Row
              what="Legal acceptance (policy version and timestamps)"
              why="Record that you agreed to the Terms, Privacy Policy, and Risk Disclaimer"
              where="Cloud Firestore user profile, plus brief session storage in your browser at sign-up"
            />
            <Row
              what="Tour, What’s New, and similar UI acknowledgements"
              why="Avoid re-showing onboarding you already finished"
              where="Cloud Firestore and/or your browser’s local storage"
            />
            <Row
              what="Theme and layout preferences"
              why="Remember dark/light appearance and similar display choices"
              where="Your browser only (local storage). Not copied to our database"
            />
            <Row
              what="Settings notes: bug/feature/support type, 1–5 star rating, message, account email, user ID, time"
              why="Investigate reports, improve the Service, and (for operators) review a copy in Settings"
              where="Cloud Firestore feedback records (United States), and a copy emailed through Google’s Gmail SMTP servers to our operations inbox"
            />
            <Row
              what="Daily API counts (market, research, and feedback requests)"
              why="Enforce per-plan request limits and stop abuse"
              where="Cloud Firestore usage document keyed to your user ID (United States). Counts reset on the Eastern calendar day"
            />
            <Row
              what="Short-lived Firebase ID token (Bearer token)"
              why="Prove you are signed in before our servers fetch quotes, charts, news, forecasts, or send a Settings note"
              where="Sent from your browser to our Vercel functions in the United States, then verified with Firebase. Not kept as a permanent record"
            />
            <Row
              what="Technical logs: IP address, user agent, URL, time, error traces"
              why="Operate, secure, rate-limit, and debug the Service"
              where="Vercel (hosting, typically U.S. East), Firebase Authentication, and Google Analytics. We do not write your IP into Firestore"
            />
            <Row
              what="Analytics: page views, referring URL, device/browser type, approximate location, Analytics cookie ID"
              why="Count visits and which public and signed-in pages are used"
              where="Google Analytics 4. IP anonymization is on; ads personalization and Google signals are off"
            />
            <Row
              what="Ticker symbols, chart windows, and public headlines you look up"
              why="Return quotes, charts, news, screens, and forecasts"
              where="Requested from our servers to Yahoo Finance and, for some write-ups and headline classification, to Google Gemini. Those providers typically see our server address, not yours"
            />
            <Row
              what="Payment identifiers (when checkout is enabled): Stripe customer/subscription IDs, plan, last four digits/brand"
              why="Recognize a paid plan and provide what you bought"
              where="Stripe processes the card. We do not receive full card numbers or CVV. Checkout may not be enabled yet"
            />
          </tbody>
        </table>
      </div>
      <p>
        We do <strong>not</strong> sell personal information. We do not share it
        for cross-context behavioral advertising. We do not use watchlist or
        portfolio data to give personalized investment advice or to trade
        against you.
      </p>

      <h2>4. Categories of information we collect</h2>
      <h3>4.1 Information you provide</h3>
      <ul>
        <li>
          <strong>Account identifiers:</strong> email address, first name, last
          name, display name, and a unique user ID issued by Firebase
          Authentication.
        </li>
        <li>
          <strong>Credentials:</strong> passwords are collected at sign-up or
          password reset. Firebase Authentication hashes and stores them. We do
          not write your password into Firestore, Settings notes, or analytics.
        </li>
        <li>
          <strong>Workspace data:</strong> ticker symbols on your watchlist;
          cash and positions you type into the portfolio tracker (shares,
          average cost, optional purchase date); and similar saved preferences.
          These are values you enter. They are not imported from a broker.
        </li>
        <li>
          <strong>Legal acceptance:</strong> the version of the Terms, Privacy
          Policy, and Risk Disclaimer you accepted, and the time of acceptance.
        </li>
        <li>
          <strong>Feedback:</strong> whether the note is a bug report, feature
          request, or support, a 1–5 star rating, the message (8 to 4,000 characters), your
          account email, your user ID, whether we succeeded in emailing a copy,
          and the time of submission.
        </li>
        <li>
          <strong>Support correspondence:</strong> emails or other messages you
          send to a published contact address, if one is listed on this page.
        </li>
      </ul>

      <h3>4.2 Information collected automatically</h3>
      <ul>
        <li>
          <strong>Authentication tokens:</strong> after you sign in, the
          dashboard sends a Firebase ID token with research requests to our
          servers so we can confirm it is you. Unsigned requests to those
          research routes are rejected.
        </li>
        <li>
          <strong>Usage counters:</strong> each allowed market-data, research,
          or feedback call increments a daily counter for your user ID so we can
          apply Free and Pro limits and a short burst limit (to stop rapid
          abuse). The burst limit is held briefly in server memory; the daily
          counts are stored in Firestore.
        </li>
        <li>
          <strong>Technical and security data:</strong> IP address, device and
          browser type, approximate time of access, request URLs, and error
          traces that Vercel, Firebase, or our application may record to
          operate, secure, and debug the Service.
        </li>
        <li>
          <strong>Session data:</strong> authentication cookies or tokens needed
          to keep you signed in, plus local or session storage used for legal
          acceptance at sign-up, the virtual tour, What’s New, complimentary-plan
          notices, appearance, and interface state.
        </li>
        <li>
          <strong>Usage data (analytics):</strong> page views, referring URL,
          device and browser type, and approximate location, collected by Google
          Analytics 4 so we can measure traffic.
        </li>
      </ul>

      <h3>4.3 Information from service providers</h3>
      <ul>
        <li>
          <strong>Authentication:</strong> Firebase Authentication confirms that
          a sign-in is valid and provides the user ID we use to isolate your
          records. Google may also retain standard authentication metadata
          (such as last sign-in time).
        </li>
        <li>
          <strong>Payments:</strong> if checkout is enabled and you purchase a
          paid plan, Stripe receives payment details directly. We may receive a
          customer identifier, subscription status, plan, billing interval, and
          limited payment-method metadata (for example, last four digits and
          brand). We do not receive or store full payment card numbers or CVV
          codes.
        </li>
        <li>
          <strong>Market data:</strong> quotes, charts, fundamentals, and
          headlines are requested from third-party market-data sources using
          ticker symbols, not your name. Those providers may log the technical
          request from our servers.
        </li>
        <li>
          <strong>Language models:</strong> Google Gemini (and, if configured,
          OpenAI) may receive ticker symbols, numeric path statistics, and
          public headlines so we can classify news or draft a short research
          note. We do not send them your name, email, password, watchlist as a
          personal profile, or payment card number.
        </li>
      </ul>

      <h2>5. Information we do not collect</h2>
      <p>We do not ask you to provide, and you should not enter into any field:</p>
      <ul>
        <li>Social Security numbers, tax IDs, or government ID images;</li>
        <li>bank account, routing, or brokerage account numbers;</li>
        <li>brokerage usernames, passwords, or API keys;</li>
        <li>full payment card numbers (those go to the payment processor only);</li>
        <li>biometric identifiers;</li>
        <li>precise GPS location;</li>
        <li>health, race, religion, union membership, or sexual orientation.</li>
      </ul>
      <p>
        Portfolio figures on the Service are values you type or that we derive
        from public market prices. They are not a live feed from your broker
        unless we later offer a separately disclosed integration, which this
        Policy would then describe.
      </p>

      <h2>6. How we use information</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>create and authenticate accounts and keep you signed in;</li>
        <li>save and display your watchlist, portfolio, and related workspace data;</li>
        <li>apply Free or Pro plan limits, including daily request caps;</li>
        <li>
          generate, cache, and show research snapshots, charts, screens, and
          reports;
        </li>
        <li>receive, store, email, investigate, and respond to Settings notes;</li>
        <li>let operators review Settings notes and manage complimentary plans;</li>
        <li>maintain security, prevent abuse, debug outages, and keep logs;</li>
        <li>comply with law, enforce our Terms, and protect our rights;</li>
        <li>
          send transactional messages about the account or Service (for example,
          password reset or material legal updates);
        </li>
        <li>improve the Service based on aggregated or de-identified usage patterns.</li>
      </ul>
      <p>
        We do not currently send marketing newsletters. If that changes, we will
        update this Policy and, where required, ask for consent.
      </p>

      <h3>6.1 Legal bases (EEA / UK / similar laws)</h3>
      <p>Where a “legal basis” is required, we rely on:</p>
      <ul>
        <li>
          <strong>Contract:</strong> to provide the account and Service you
          requested, including authentication, saved workspace data, plan
          limits, and paid features you purchase.
        </li>
        <li>
          <strong>Legitimate interests:</strong> to secure the Service, prevent
          fraud and abuse, keep essential logs and usage counters, understand
          product reliability, review Settings notes, and defend legal claims,
          in each case where those interests are not overridden by your rights.
        </li>
        <li>
          <strong>Consent:</strong> where we ask for it, including acceptance of
          this Policy at sign-up. You may withdraw consent by closing the
          account, subject to information we must keep for legal reasons.
        </li>
        <li>
          <strong>Legal obligation:</strong> when we must retain or disclose
          information to comply with law, regulation, or valid legal process.
        </li>
      </ul>

      <h2>7. Cookies and similar technologies</h2>
      <p>We use cookies, local storage, and similar technologies that are:</p>
      <ul>
        <li>
          <strong>Strictly necessary:</strong> Firebase Authentication session
          cookies or tokens so the dashboard can recognize you; security and
          load-balancing cookies from Vercel.
        </li>
        <li>
          <strong>Functional:</strong> local or session storage for legal
          acceptance version, tour/release acknowledgements, appearance, and
          interface state (for example, a collapsed menu).
        </li>
        <li>
          <strong>Analytics:</strong> Google Analytics 4 (via Google Tag) to
          count visits and which pages are used. Advertising signals and ads
          personalization are turned off. Google still sets an Analytics cookie
          that identifies your browser over time. Google’s own privacy notice
          applies to that processing.
        </li>
      </ul>
      <p>
        We do not use third-party advertising cookies, cross-site behavioral
        advertising pixels, or a marketing tag manager. If that changes, we will
        update this Policy and, where required, request consent.
      </p>
      <p>
        You can block cookies in your browser. If you block necessary cookies,
        sign-in and account features may not work. Blocking Analytics cookies
        does not stop the account database from storing the workspace you save.
      </p>

      <h2>8. Signed-in research requests and usage limits</h2>
      <p>
        Public pages (including this Policy) can be read without an account.
        Quotes, charts, news, screens, forecasts, calculators, snapshots, and
        the Settings note form are served through our own API on Vercel. Those
        routes require a valid Firebase ID token in the request header. We
        verify the token with Google’s Firebase Admin SDK, then apply a short
        burst limit and a daily quota that depends on your plan.
      </p>
      <p>
        Daily counts are stored in Firestore under your user ID (market,
        research, and feedback buckets) and reset at midnight Eastern Time. We
        keep the current day’s counts so the limit can be enforced. We do not
        sell these counters, and other users cannot read them.
      </p>

      <h2>9. Settings notes (feedback and ratings)</h2>
      <p>
        If you submit a bug report, feature request, or support note, we store the content,
        your rating, your account email, your user ID, whether an email copy was
        sent, and the time of submission in Firestore. Operators of the Service
        can read those records from an admin view in Settings. We also email a
        copy through Google’s Gmail SMTP service to our operations inbox. The
        inbox address is kept on our servers only; it is not shown in the public
        website or in the browser.
      </p>
      <p>
        Feedback is not anonymous. Do not include passwords, payment card
        numbers, or other sensitive data in a note. We may delete submissions
        that contain them.
      </p>
      <p>
        If mail delivery fails, the note may still be stored in Firestore so we
        can still see it. If both save and email fail, the form will tell you to
        try again.
      </p>

      <h2>10. Payments</h2>
      <p>
        Paid plans, when checkout is enabled, are processed by Stripe, Inc. and
        its affiliates (“Stripe”), or another processor identified at checkout.
        Stripe’s processing is described in Stripe’s own privacy notice. Card
        data is submitted to Stripe, not to our servers. We store only what we
        need to recognize your subscription and provide the plan you paid for.
      </p>
      <p>
        Complimentary Pro may be granted by an operator. That grant is stored in
        your entitlements record (plan and a “complimentary” source flag), not
        as a card charge.
      </p>
      <p>
        If you use a payment method that supports additional identity checks
        (for example, Link by Stripe), that provider’s terms and privacy notice
        also apply.
      </p>

      <h2>11. Automated processing and models</h2>
      <p>
        The Service uses quantitative rules and, in some cases, third-party
        language models (currently Google Gemini, with OpenAI as a possible
        fallback if configured) to classify headlines or draft short write-ups
        and forecast notes. Prompts include the ticker and public headlines or
        numeric path statistics. Those outputs are not credit, employment,
        insurance, or housing decisions. You can choose not to rely on them.
        Model providers process the text we send under their terms.
      </p>

      <h2>12. How we share information</h2>
      <p>We share personal information only as follows:</p>
      <ul>
        <li>
          <strong>Google LLC (Firebase Authentication and Cloud Firestore):</strong>{" "}
          account credentials, profile, watchlist, portfolio, entitlements,
          usage counters, and Settings notes. Processed in the United States on
          Google Cloud. Used to run the account and database.
        </li>
        <li>
          <strong>Google LLC (Google Analytics 4):</strong> page-view and device
          data as described above. Used to measure traffic.
        </li>
        <li>
          <strong>Google LLC (Gemini / Generative AI API):</strong> ticker,
          headlines, and numeric research context. Used to classify news or
          draft notes. Not used to identify you by name.
        </li>
        <li>
          <strong>Google LLC (Gmail SMTP):</strong> Settings notes, including
          your account email and message, so a copy reaches our operations
          inbox.
        </li>
        <li>
          <strong>Vercel Inc.:</strong> hosts the website and serverless
          functions (typically U.S. East). Receives HTTPS requests, may log IP
          address, user agent, URL, and errors, and holds server environment
          configuration. Used to deliver the Service.
        </li>
        <li>
          <strong>Yahoo (Yahoo Finance and related market-data endpoints):</strong>{" "}
          ticker symbols and request metadata from our servers, to retrieve
          quotes, charts, fundamentals, or news.
        </li>
        <li>
          <strong>OpenAI</strong> (only if we configure it as a fallback model
          provider): same class of research text as Gemini.
        </li>
        <li>
          <strong>Stripe:</strong> payment details when checkout is enabled, to
          charge for a paid plan.
        </li>
        <li>
          <strong>Resend or a similar email API</strong> (only if we configure
          it): would receive the same Settings-note content as Gmail SMTP.
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
        Other customers cannot read your account, watchlist, portfolio, usage
        counters, or Settings notes. Application access controls are designed so
        each signed-in user can access only their own documents. Operators of
        the Service (a small set of administrators) can read account emails,
        display names, plan status, and Settings notes in order to run and
        support the Service.
      </p>

      <h2>13. International transfers</h2>
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
        our processors’ certified transfer mechanisms (for example, Google’s and
        Vercel’s published transfer terms).
      </p>

      <h2>14. Retention</h2>
      <ul>
        <li>
          Account, watchlist, portfolio, entitlement, and related workspace
          data: for as long as the account remains open, then until we complete
          deletion after a verified request or after a period of inactivity we
          reasonably determine is abandonment.
        </li>
        <li>
          Legal acceptance records: for the life of the account and a reasonable
          period afterward to evidence agreement.
        </li>
        <li>
          Daily usage counters: overwritten as the Eastern calendar day changes;
          the document for your user ID remains while the account is open.
        </li>
        <li>
          Settings notes: for as long as needed to resolve the issue, operate
          the Service, and keep a support record, then as needed for our
          legitimate records or until a verified deletion request.
        </li>
        <li>
          Copies of Settings notes in our email inbox: until we delete that
          mail in the ordinary course, or sooner if you ask us to delete the
          underlying note and we can locate the copy.
        </li>
        <li>
          Research snapshots (market-wide, not tied to your name): retained on
          our systems for a limited archive window (currently on the order of
          sixty days unless we state otherwise) and then pruned.
        </li>
        <li>
          Security and server logs held by Vercel, Firebase, or Analytics:
          typically for a short operational period set by those providers,
          unless needed for an investigation or legal hold.
        </li>
        <li>
          Payment records: as required for tax, accounting, and dispute
          resolution, often several years, when checkout is used.
        </li>
      </ul>
      <p>
        Backup copies held by processors may persist for a limited time after
        deletion from live systems.
      </p>

      <h2>15. Security</h2>
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
          documents. Usage counters and Settings notes are written by our
          servers, not by other customers. Administrative access is limited to
          operators of the Service.
        </li>
        <li>
          <strong>Secrets:</strong> API keys, mail credentials, and similar
          secrets are stored in server environment configuration, not in the
          public website bundle.
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

      <h2>16. Your choices and rights</h2>
      <p>You may:</p>
      <ul>
        <li>access and update watchlist and portfolio data in the dashboard;</li>
        <li>log out and stop using the Service;</li>
        <li>
          request access, correction, or deletion of personal information we
          hold, including your profile, workspace, usage counters, and Settings
          notes;
        </li>
        <li>request a portable copy of account data we can reasonably export;</li>
        <li>
          object to or request restriction of certain processing where the law
          provides that right;
        </li>
        <li>
          withdraw consent where processing is based on consent, without
          affecting prior lawful processing;
        </li>
        <li>
          opt out of marketing emails if we ever send them (transactional mail
          may still be sent).
        </li>
      </ul>
      <p>
        To exercise rights, contact us: <LegalContact purpose="Privacy requests" />
        We may need to verify your identity (for example, by requiring you to
        send the request while signed in to the same account) before fulfilling
        it. We will not discriminate against you for exercising privacy rights.
        Where California law applies, we will respond within 45 days, or notify
        you if we need one permitted extension.
      </p>

      <h3>16.1 California (CCPA / CPRA)</h3>
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
        Categories collected in the last 12 months, sources, purposes, and
        recipients are the ones listed in this Policy. We do not use your
        information to train a TVM advertising profile.
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

      <h3>16.2 EEA, UK, and similar jurisdictions</h3>
      <p>
        You may lodge a complaint with your local supervisory authority. We
        encourage you to contact us first so we can try to resolve the issue. We
        do not currently maintain a separate EU or UK representative. Requests
        still go through the contact method on this page.
      </p>

      <h2>17. Children</h2>
      <p>
        The Service is for adults. It is not directed to children under 18, or
        under 13 where that is the relevant COPPA threshold. We do not knowingly
        collect personal information from children. If you believe a child has
        created an account, contact us and we will delete it.
      </p>

      <h2>18. Do Not Track</h2>
      <p>
        Some browsers send a “Do Not Track” signal. There is no consistent
        industry standard for responding to it. We treat necessary cookies as
        described above and do not use advertising trackers at this time.
        Google Analytics still runs on production pages unless you block it.
      </p>

      <h2>19. Changes</h2>
      <p>
        We may update this Policy. The “Effective” date at the top will change.
        Material changes will be posted on this page and, where required, we will
        provide additional notice (for example in-product or by email). Continued
        use after the effective date constitutes acceptance of the updated Policy
        where the law allows. Where consent is required, we will ask for it.
      </p>
      <p>
        This August 26, 2026 revision adds Support notes in Settings. The
        August 25, 2026 revision added usage counters, signed-in API tokens,
        Firestore copies of Settings notes, and mail delivery of those notes,
        and it names each processor and location we actually use.
      </p>

      <h2>20. Contact</h2>
      <p>
        <LegalContact purpose="Privacy and data-protection requests" />
      </p>
      <p>
        If no public email is listed yet, submit the request from the signed-in
        Settings feedback form using the same account the request concerns, and
        say that it is a privacy request.
      </p>
    </LegalDocument>
  );
}
