export type SiteEraId = "beta-1" | "beta-1b" | "beta-2" | "live";

export type SiteEraFeatures = {
  darkMode: boolean;
  bogen: boolean;
  maintenanceNav: boolean;
  accountScore: boolean;
  eventExpand: boolean;
  proProfileStack: boolean;
  proProfileGlow: boolean;
  navOutlineGlow: boolean;
  sectorDives: boolean;
  scanUniverseCopy: boolean;
};

export type SiteEra = {
  id: SiteEraId;
  label: string;
  from: string;
  features: SiteEraFeatures;
};

const BETA_1_FEATURES: SiteEraFeatures = {
  darkMode: false,
  bogen: false,
  maintenanceNav: false,
  accountScore: false,
  eventExpand: false,
  proProfileStack: false,
  proProfileGlow: false,
  navOutlineGlow: false,
  sectorDives: true,
  scanUniverseCopy: false,
};

const BETA_1B_FEATURES: SiteEraFeatures = {
  ...BETA_1_FEATURES,
  maintenanceNav: true,
};

const BETA_2_FEATURES: SiteEraFeatures = {
  ...BETA_1B_FEATURES,
  darkMode: true,
  maintenanceNav: true,
  scanUniverseCopy: true,
};

const LIVE_FEATURES: SiteEraFeatures = {
  darkMode: true,
  bogen: true,
  maintenanceNav: true,
  accountScore: true,
  eventExpand: true,
  proProfileStack: true,
  proProfileGlow: true,
  navOutlineGlow: true,
  sectorDives: true,
  scanUniverseCopy: true,
};

export const SITE_ERAS: SiteEra[] = [
  {
    id: "beta-1",
    label: "Beta v1",
    from: "2026-08-12",
    features: BETA_1_FEATURES,
  },
  {
    id: "beta-1b",
    label: "Aug 13",
    from: "2026-08-13",
    features: BETA_1B_FEATURES,
  },
  {
    id: "beta-2",
    label: "Beta v2",
    from: "2026-08-14",
    features: BETA_2_FEATURES,
  },
  {
    id: "live",
    label: "Live",
    from: "2026-08-15",
    features: LIVE_FEATURES,
  },
];

export const LIVE_ERA = SITE_ERAS[SITE_ERAS.length - 1];

export function eraForDate(ymd?: string | null): SiteEra {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return LIVE_ERA;
  let matched = SITE_ERAS[0];
  for (const era of SITE_ERAS) {
    if (ymd >= era.from) matched = era;
  }
  return matched;
}

export function releaseVisibleOn(isoDate: string, archiveDate?: string | null) {
  if (!archiveDate) return true;
  return isoDate <= archiveDate;
}

export const RELEASE_ISO: Record<string, string> = {
  "beta-1": "2026-08-12",
  "beta-2": "2026-08-14",
  "beta-2.1": "2026-08-14",
};
