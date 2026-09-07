export const TOS_VERSION = "2026-08-26";
export const PRIVACY_VERSION = "2026-08-26";
export const EULA_VERSION = "2026-09-07";
export const LEGAL_STORAGE_KEY = "tvm-legal-acceptance";
export const LEGAL_EFFECTIVE_DATE = "August 26, 2026";
export const PRIVACY_EFFECTIVE_DATE = "August 26, 2026";
export const EULA_EFFECTIVE_DATE = "September 7, 2026";

export const LEGAL_ENTITY = "TVM Investments";
/** Named individuals who license the TVM web application under the EULA. */
export const EULA_LICENSORS =
  "Varish Desai, Taiki Okada, and Miguel Rosales, individuals doing business as TVM Investments";
export const LEGAL_JURISDICTION = "the State of New York";
export const LEGAL_VENUE =
  "the state or federal courts located in New York County, New York";
export const EULA_JURISDICTION = "the State of Maryland";
export const EULA_VENUE =
  "the state or federal courts located in the State of Maryland";

/** Public legal/privacy inbox. Settings feedback still uses the server ops address. */
export const PUBLIC_LEGAL_EMAIL = "investmentstvm@gmail.com";

export function getLegalContactEmail() {
  return process.env.NEXT_PUBLIC_TVM_CONTACT_EMAIL?.trim() || PUBLIC_LEGAL_EMAIL;
}
