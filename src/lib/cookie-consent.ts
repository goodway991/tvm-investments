export const COOKIE_CONSENT_VERSION = "2026-09-15";

export type CookiePreferences = {
  version: string;
  necessary: true;
  functional: boolean;
  analytics: boolean;
  decidedAt: number;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function cookieConsentStorageKey(uid: string) {
  return `tvm-cookie-consent:${uid}`;
}

const DEVICE_ANALYTICS_KEY = "tvm-cookie-analytics";

export function defaultCookieDraft(): Omit<CookiePreferences, "version" | "decidedAt"> {
  return { necessary: true, functional: true, analytics: false };
}

export function parseCookiePreferences(raw: string | null): CookiePreferences | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (parsed.necessary !== true) return null;
    if (typeof parsed.functional !== "boolean") return null;
    if (typeof parsed.analytics !== "boolean") return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      functional: parsed.functional,
      analytics: parsed.analytics,
      decidedAt: typeof parsed.decidedAt === "number" ? parsed.decidedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function readDeviceAnalyticsAllowed() {
  try {
    return window.localStorage.getItem(DEVICE_ANALYTICS_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistCookiePreferences(uid: string, prefs: CookiePreferences) {
  const payload = JSON.stringify(prefs);
  try {
    window.localStorage.setItem(cookieConsentStorageKey(uid), payload);
    window.localStorage.setItem(DEVICE_ANALYTICS_KEY, prefs.analytics ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export function applyAnalyticsConsent(granted: boolean) {
  if (typeof window === "undefined") return;
  window.gtag?.("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}
