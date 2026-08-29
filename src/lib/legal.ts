export const TOS_VERSION = "2026-08-26";
export const PRIVACY_VERSION = "2026-08-26";
export const LEGAL_STORAGE_KEY = "tvm-legal-acceptance";
export const LEGAL_EFFECTIVE_DATE = "August 26, 2026";
export const PRIVACY_EFFECTIVE_DATE = "August 26, 2026";

export const LEGAL_ENTITY = "TVM Investments";
export const LEGAL_JURISDICTION = "the State of New York";
export const LEGAL_VENUE =
  "the state or federal courts located in New York County, New York";

export function getLegalContactEmail() {
  // Public legal pages only. The ops inbox for Settings feedback is separate
  // (TVM_CONTACT_EMAIL) and must not appear in the product UI.
  return process.env.NEXT_PUBLIC_TVM_CONTACT_EMAIL?.trim() || "";
}
