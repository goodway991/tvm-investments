"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OverlaySheet } from "@/components/OverlaySheet";
import { useAuth } from "@/components/AuthProvider";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import {
  applyAnalyticsConsent,
  COOKIE_CONSENT_VERSION,
  defaultCookieDraft,
  parseCookiePreferences,
  persistCookiePreferences,
  readDeviceAnalyticsAllowed,
  cookieConsentStorageKey,
  type CookiePreferences,
} from "@/lib/cookie-consent";

type CookieConsentContextValue = {
  ready: boolean;
  pending: boolean;
  preferences: CookiePreferences | null;
  analyticsAllowed: boolean;
  openCookiePreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

function ToggleRow({
  title,
  body,
  checked,
  locked,
  onChange,
}: {
  title: string;
  body: string;
  checked: boolean;
  locked?: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl bg-surface p-4 ${
        locked ? "cursor-default opacity-90" : ""
      }`}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--violet))]"
        checked={checked}
        disabled={locked}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
          {body}
        </span>
      </span>
    </label>
  );
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences | null>(
    null,
  );
  const [draftFunctional, setDraftFunctional] = useState(true);
  const [draftAnalytics, setDraftAnalytics] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [deviceAnalytics, setDeviceAnalytics] = useState(false);

  const authPath =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/");
  const legalPath =
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/eula" ||
    pathname === "/disclaimer" ||
    pathname === "/refunds";

  useEffect(() => {
    setDeviceAnalytics(readDeviceAnalyticsAllowed());
    applyAnalyticsConsent(readDeviceAnalyticsAllowed());
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setPreferences(null);
      setReady(true);
      return;
    }
    let stored: CookiePreferences | null = null;
    try {
      stored = parseCookiePreferences(
        window.localStorage.getItem(cookieConsentStorageKey(user.uid)),
      );
    } catch {
      stored = null;
    }
    setPreferences(stored);
    if (stored) {
      setDraftFunctional(stored.functional);
      setDraftAnalytics(stored.analytics);
      applyAnalyticsConsent(stored.analytics);
      setDeviceAnalytics(stored.analytics);
    } else {
      const draft = defaultCookieDraft();
      setDraftFunctional(draft.functional);
      setDraftAnalytics(draft.analytics);
    }
    setReady(true);
  }, [loading, user]);

  const needsChoice = Boolean(user) && ready && !preferences && !authPath;
  const pending = needsChoice;

  const save = useCallback(
    (next: { functional: boolean; analytics: boolean }) => {
      if (!user) return;
      const prefs: CookiePreferences = {
        version: COOKIE_CONSENT_VERSION,
        necessary: true,
        functional: next.functional,
        analytics: next.analytics,
        decidedAt: Date.now(),
      };
      persistCookiePreferences(user.uid, prefs);
      applyAnalyticsConsent(next.analytics);
      setPreferences(prefs);
      setDraftFunctional(next.functional);
      setDraftAnalytics(next.analytics);
      setDeviceAnalytics(next.analytics);
      setPrefsOpen(false);
    },
    [user],
  );

  const openCookiePreferences = useCallback(() => {
    setPrefsOpen(true);
  }, []);

  const analyticsAllowed = preferences
    ? preferences.analytics
    : !user && deviceAnalytics;

  const value = useMemo(
    () => ({
      ready,
      pending,
      preferences,
      analyticsAllowed,
      openCookiePreferences,
    }),
    [analyticsAllowed, openCookiePreferences, pending, preferences, ready],
  );

  const showSheet =
    Boolean(user) &&
    !authPath &&
    (prefsOpen || (needsChoice && !legalPath));

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      <GoogleAnalytics allowed={analyticsAllowed} />
      {showSheet ? (
        <OverlaySheet
          labelledBy="cookie-consent-title"
          closeOnBackdrop={false}
          variant="card"
          zIndexClass="z-[130]"
          header={
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet">
                Cookies
              </p>
              <h2
                id="cookie-consent-title"
                className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl"
              >
                Cookie policy
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
                We use cookies and similar storage to run your account, remember
                desk preferences, and — only if you allow it — measure how the
                site is used. Necessary cookies stay on so sign-in works. You
                can change this anytime in Settings.
              </p>
            </div>
          }
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => save({ functional: false, analytics: false })}
                className="rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/[0.04]"
              >
                Reject non-essential
              </button>
              <button
                type="button"
                onClick={() =>
                  save({
                    functional: draftFunctional,
                    analytics: draftAnalytics,
                  })
                }
                className="rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/[0.04]"
              >
                Save choices
              </button>
              <button
                type="button"
                onClick={() => save({ functional: true, analytics: true })}
                className="glass-violet rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Accept all
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <ToggleRow
              locked
              checked
              title="Necessary (always on)"
              body="Firebase sign-in, security, and hosting cookies so the desk can recognize you. The site cannot work without these."
            />
            <ToggleRow
              checked={draftFunctional}
              onChange={setDraftFunctional}
              title="Functional"
              body="On-device storage for appearance, What’s New, the tour, and similar desk state. Not used for advertising."
            />
            <ToggleRow
              checked={draftAnalytics}
              onChange={setDraftAnalytics}
              title="Analytics"
              body="Google Analytics 4 with ads personalization off. Counts page views so we can see which parts of TVM are used. Off until you turn it on."
            />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            Details are in our{" "}
            <Link href="/terms#cookies" className="font-semibold text-violet hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy#cookies" className="font-semibold text-violet hover:underline">
              Privacy Policy
            </Link>
            . We do not use advertising cookies or sell your data.
          </p>
        </OverlaySheet>
      ) : null}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const value = useContext(CookieConsentContext);
  if (!value) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return value;
}
