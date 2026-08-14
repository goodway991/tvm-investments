export const SIGNUP_NAME_KEY = "tvm-signup-name";

export function normalizePersonName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isPersonName(value: string) {
  const next = normalizePersonName(value);
  return next.length >= 1 && next.length <= 40 && !/[0-9@]/.test(next);
}

export function fullDisplayName(firstName: string, lastName: string) {
  return `${normalizePersonName(firstName)} ${normalizePersonName(lastName)}`;
}

export type SignupName = { firstName: string; lastName: string };

const GENERIC_ACCOUNT_NAMES = new Set([
  "tvm investor",
  "tvm user",
  "tvm member",
  "account",
  "admin",
]);

export function splitPersonName(displayName: string | null | undefined): SignupName | null {
  const next = normalizePersonName(displayName || "");
  if (!next) return null;
  const parts = next.split(" ");
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
  if (!isPersonName(firstName)) return null;
  if (lastName && isPersonName(lastName)) return { firstName, lastName };
  return null;
}

export function resolveAccountName(input: {
  profileName?: string | null;
  authName?: string | null;
  email?: string | null;
}) {
  const profile = input.profileName?.trim() || "";
  const auth = input.authName?.trim() || "";
  const fromEmail = input.email?.split("@")[0]?.trim() || "";
  for (const candidate of [profile, auth, fromEmail]) {
    if (
      candidate &&
      !GENERIC_ACCOUNT_NAMES.has(candidate.toLowerCase())
    ) {
      return candidate;
    }
  }
  return auth || fromEmail || profile || "Account";
}

export function writeSignupName(name: SignupName) {
  try {
    sessionStorage.setItem(
      SIGNUP_NAME_KEY,
      JSON.stringify({
        firstName: normalizePersonName(name.firstName),
        lastName: normalizePersonName(name.lastName),
      }),
    );
  } catch {
    /* private browsing */
  }
}

export function readSignupName(): SignupName | null {
  try {
    const raw = sessionStorage.getItem(SIGNUP_NAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SignupName;
    if (!isPersonName(parsed.firstName) || !isPersonName(parsed.lastName)) {
      return null;
    }
    return {
      firstName: normalizePersonName(parsed.firstName),
      lastName: normalizePersonName(parsed.lastName),
    };
  } catch {
    return null;
  }
}

export function clearSignupName() {
  try {
    sessionStorage.removeItem(SIGNUP_NAME_KEY);
  } catch {
    /* private browsing */
  }
}
