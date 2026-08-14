import { doc, getDoc } from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase/client";

export const MAINTENANCE_COLLECTION = "site";
export const MAINTENANCE_DOC_ID = "maintenance";

export const DEFAULT_WARNING_MESSAGE =
  "Maintenance will start {start} and last until {end}.";

export type SiteMaintenance = {
  enabled: boolean;
  warning: boolean;
  start: string;
  end: string;
  message: string;
};

function asFlag(value: unknown) {
  return value === true || value === "true" || value === 1;
}

export function parseSiteMaintenance(
  data: Record<string, unknown> | undefined,
): SiteMaintenance {
  const message =
    typeof data?.message === "string" && data.message.trim()
      ? data.message.trim()
      : DEFAULT_WARNING_MESSAGE;
  return {
    enabled: asFlag(data?.enabled),
    warning: asFlag(data?.warning) || asFlag(data?.warningEnabled),
    start: typeof data?.start === "string" ? data.start.trim() : "",
    end: typeof data?.end === "string" ? data.end.trim() : "",
    message,
  };
}

export function formatWarningText(site: SiteMaintenance) {
  if (!site.start && !site.end) {
    return site.message === DEFAULT_WARNING_MESSAGE
      ? "Scheduled maintenance is coming soon."
      : site.message.replaceAll("{start}", "soon").replaceAll("{end}", "later");
  }
  return site.message
    .replaceAll("{start}", site.start || "soon")
    .replaceAll("{end}", site.end || "later");
}

export async function readMaintenanceEnabled() {
  const db = getClientFirestore();
  if (!db) return false;
  try {
    const snapshot = await getDoc(doc(db, MAINTENANCE_COLLECTION, MAINTENANCE_DOC_ID));
    return snapshot.data()?.enabled === true;
  } catch {
    return false;
  }
}
