export const TOS_VERSION = "2026-08-13";
export const LEGAL_STORAGE_KEY = "tvm-legal-acceptance";
export const LEGAL_EFFECTIVE_DATE = "August 13, 2026";

export const LEGAL_ENTITY = "TVM Investments";
export const LEGAL_JURISDICTION = "the State of New York";
export const LEGAL_VENUE =
  "the state or federal courts located in New York County, New York";

export function getLegalContactEmail() {
  const fromPublic = process.env.NEXT_PUBLIC_TVM_CONTACT_EMAIL?.trim();
  const fromServer = process.env.TVM_CONTACT_EMAIL?.trim();
  return fromPublic || fromServer || "";
}
