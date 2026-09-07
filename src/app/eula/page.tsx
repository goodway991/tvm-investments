import type { Metadata } from "next";
import { LegalContact } from "@/components/LegalContact";
import { LegalDocument } from "@/components/LegalDocument";
import {
  EULA_EFFECTIVE_DATE,
  EULA_JURISDICTION,
  EULA_LICENSORS,
  EULA_MANAGING_OWNER,
  EULA_VENUE,
  EULA_VERSION,
  LEGAL_ENTITY,
} from "@/lib/legal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "End User License Agreement — TVM Investments",
  robots: { index: true, follow: true },
  description:
    "End User License Agreement for the TVM Investments web application, including license scope, restrictions, updates, and intellectual property.",
};

export default function EulaPage() {
  return (
    <LegalDocument
      title="End User License Agreement (EULA)"
      updated={EULA_EFFECTIVE_DATE}
    >
      <p>
        This End User License Agreement (“EULA”) is a legally binding license
        between you (“you” or “User”) and {EULA_LICENSORS} (collectively,
        “Licensor,” “we,” “us,” or “our”). The named individuals are part owners
        of {LEGAL_ENTITY}. {EULA_MANAGING_OWNER} is the managing owner: he
        directs the product and the work of the other part owners, and day-to-day
        decisions for the Application are made under his direction.
      </p>
      <p>
        It governs your license to access and use the TVM Investments web
        application available at{" "}
        <a href="https://tvminvest.com">https://tvminvest.com</a> and related
        web pages, dashboards, and research tools we operate online (the
        “Application”). This EULA applies to the web Application only. The
        Application is not distributed through the Apple App Store or Google
        Play Store.
      </p>
      <p>
        By creating an account, checking an acceptance box, paying for a plan,
        or using the Application, you agree to this EULA, our{" "}
        <a href="/terms">Terms of Service</a>,{" "}
        <a href="/privacy">Privacy Policy</a>, and{" "}
        <a href="/disclaimer">Risk Disclaimer</a>. If you do not agree, do not
        use the Application.
      </p>
      <p>Document version {EULA_VERSION}.</p>

      <h2>1. License grant</h2>
      <p>
        Subject to this EULA and your compliance with it, Licensor grants you a
        limited, revocable, non-exclusive, non-transferable, non-sublicensable
        license to access and use the Application for your personal,
        non-commercial purposes only.
      </p>
      <p>
        This is a license to use the Application, not a sale of the Application
        or of any copy of our software, content, models, or data. Except for the
        limited rights expressly granted here, Licensor reserves all rights,
        title, and interest in and to the Application.
      </p>

      <h2>2. License restrictions</h2>
      <p>You may not, and you agree not to:</p>
      <ul>
        <li>
          sell, rent, lease, sublicense, distribute, transmit, host, publicly
          display, or otherwise commercially exploit the Application or any
          substantial part of it;
        </li>
        <li>
          copy, reproduce, or use the Application for any purpose other than
          your personal, non-commercial use of the research desk and related
          features;
        </li>
        <li>
          modify, adapt, translate, decrypt, reverse compile, reverse engineer,
          disassemble, or attempt to derive source code or underlying ideas,
          algorithms, or non-public interfaces from the Application, except to
          the limited extent applicable law expressly prohibits this restriction;
        </li>
        <li>
          remove, obscure, or alter proprietary notices, trademarks, or labels;
        </li>
        <li>
          use the Application to build a competing product or to scrape,
          harvest, or systematically extract our screens, scores, notes, or
          other content beyond ordinary interactive use;
        </li>
        <li>
          interfere with the Application’s security, quotas, billing, or access
          controls, or attempt to bypass plan limits; or
        </li>
        <li>
          use the Application in violation of law, our Terms of Service, or
          third-party rights.
        </li>
      </ul>

      <h2>3. Accounts, age, and research-only use</h2>
      <p>
        You must be at least <strong>13 years old</strong> to create an account
        or use the Application. If you are between 13 and 17, you may use the
        Application only with permission of a parent or legal guardian who
        agrees to this EULA on your behalf where required by law.
      </p>
      <p>
        <strong>
          We do not promote investing to anyone under 18.
        </strong>{" "}
        The Application is an educational research desk. Anyone who meets the
        age requirement may use screens, notes, watchlists, and paper/simulated
        trading features. Simulated or paper results are not real brokerage
        activity and do not guarantee live-market results. See our{" "}
        <a href="/disclaimer">Risk Disclaimer</a> and{" "}
        <a href="/terms">Terms of Service</a>.
      </p>

      <h2>4. What the Application is (and is not)</h2>
      <p>
        The Application provides informational and educational market-research
        tools (for example, end-of-day screens, scores, movers, notes,
        watchlists, portfolio logging, and scenario tools). It is not a
        brokerage, exchange, bank, custodian, robo-adviser, or dealer. Nothing
        in the Application is investment, tax, or legal advice.
      </p>

      <h2>5. Updates and changes</h2>
      <p>
        We may update, modify, suspend, or discontinue the Application (or any
        feature) at any time, including with new features, bug fixes, security
        patches, plan changes, or content refreshes. We may require you to
        accept an updated EULA or Terms to continue using the Application.
        Continued use after an update becomes effective constitutes acceptance
        of the then-current EULA, except where applicable law requires a
        different process.
      </p>

      <h2>6. Feedback and suggestions</h2>
      <p>
        If you send us ideas, feedback, suggestions, or other materials about
        the Application (“Feedback”), you grant Licensor a perpetual,
        irrevocable, worldwide, royalty-free, fully paid, transferable,
        sublicensable license to use, copy, modify, publish, and commercialize
        the Feedback for any purpose, without compensation, attribution, or
        obligation to you. You represent that you have the right to provide that
        Feedback and that it does not infringe others’ rights.
      </p>

      <h2>7. User account information (no user-generated media)</h2>
      <p>
        The Application does not offer a general content-upload or social-posting
        feature for images, files, or public posts. Account profile details and
        optional feedback you submit are handled under our{" "}
        <a href="/privacy">Privacy Policy</a> and Terms of Service. You are
        responsible for the accuracy of information you provide and for keeping
        your credentials confidential.
      </p>

      <h2>8. Personal information</h2>
      <p>
        We may collect certain personal information from users (for example,
        email address and account profile data) as described in our{" "}
        <a href="/privacy">Privacy Policy</a>. By using the Application, you
        acknowledge that collection and processing.
      </p>

      <h2>9. Intellectual property</h2>
      <p>
        The Application, including its software, design, text, graphics, logos,
        trademarks, service marks, compilations, screens, scoring methods,
        research presentation, and other content (excluding third-party market
        data licensed to us), are the exclusive intellectual property of
        Licensor or its licensors and are protected by copyright, trademark,
        trade secret, and other laws.
      </p>
      <p>
        “TVM,” “TVM Investments,” and related marks are trademarks of Licensor.
        You receive no rights in our trademarks except as needed to refer
        factually to the Application. Third-party names and marks belong to
        their owners.
      </p>

      <h2>10. Third-party services and data</h2>
      <p>
        The Application may rely on third-party hosting, authentication,
        payments, and market-data or news sources. Those services are subject to
        their own terms. We do not warrant uninterrupted or error-free
        third-party data.
      </p>

      <h2>11. Subscriptions and paid features</h2>
      <p>
        Some features require a paid plan. Billing, cancellation, and refunds
        are governed by our <a href="/terms">Terms of Service</a> and{" "}
        <a href="/refunds">Cancellation and refunds</a> policy, and by Stripe’s
        terms where applicable. Failure to pay may result in suspension or
        termination of licensed access to paid features.
      </p>

      <h2>12. Disclaimer of warranties</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE APPLICATION IS PROVIDED “AS
        IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
        IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT
        WARRANT THAT THE APPLICATION WILL BE UNINTERRUPTED, SECURE, OR
        ERROR-FREE, OR THAT OUTPUTS, SCORES, FORECASTS, OR DATA WILL BE
        ACCURATE OR COMPLETE.
      </p>

      <h2>13. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, LICENSOR AND ITS SUPPLIERS WILL
        NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
        EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE,
        DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR RELATED TO
        THIS EULA OR THE APPLICATION, WHETHER BASED IN CONTRACT, TORT, STRICT
        LIABILITY, OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
        DAMAGES.
      </p>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, LICENSOR’S TOTAL LIABILITY FOR
        ALL CLAIMS ARISING OUT OF OR RELATED TO THIS EULA OR THE APPLICATION
        WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO LICENSOR FOR
        THE APPLICATION IN THE TWELVE (12) MONTHS BEFORE THE CLAIM AROSE, OR (B)
        FIFTY U.S. DOLLARS (US $50).
      </p>
      <p>
        Some jurisdictions do not allow certain limitations; in those places,
        our liability is limited to the fullest extent permitted by law. Market
        losses from your trading or investment decisions remain your
        responsibility as described in the Risk Disclaimer.
      </p>

      <h2>14. Termination</h2>
      <p>
        This EULA is effective until terminated. Your license ends automatically
        if you breach it. We may suspend or terminate access at any time for
        violation of this EULA or our Terms, for non-payment, for security or
        legal reasons, or if we discontinue the Application. On termination, you
        must stop using the Application. Sections that by their nature should
        survive (including intellectual property, Feedback, disclaimers,
        limitations of liability, and governing law) will survive.
      </p>

      <h2>15. Governing law and disputes</h2>
      <p>
        This EULA is governed by the laws of {EULA_JURISDICTION}, without regard
        to conflict-of-law rules. Except where our Terms of Service require
        arbitration or another process for Service disputes, exclusive venue for
        disputes arising under this EULA lies in {EULA_VENUE}, and you consent
        to personal jurisdiction there. If this EULA and the Terms conflict on
        the same subject, the Terms control for Service use, billing, and
        account issues, and this EULA controls for the software license grant
        and license restrictions.
      </p>

      <h2>16. Miscellaneous</h2>
      <p>
        If any provision of this EULA is held unenforceable, the remainder
        remains in effect. Our failure to enforce a provision is not a waiver.
        You may not assign this EULA without our prior written consent; we may
        assign it in connection with a reorganization, merger, or sale of
        assets. This EULA, together with the Terms, Privacy Policy, and Risk
        Disclaimer, is the entire agreement between you and Licensor regarding
        the license to the Application and supersedes prior agreements on that
        subject.
      </p>

      <h2>17. Contact</h2>
      <p>
        For questions about this EULA, contact us by email or through this
        website:
      </p>
      <ul>
        <li>
          Email: <LegalContact purpose="EULA questions" />
        </li>
        <li>
          Website:{" "}
          <a href="https://tvminvest.com/eula">https://tvminvest.com/eula</a>
        </li>
      </ul>
    </LegalDocument>
  );
}
