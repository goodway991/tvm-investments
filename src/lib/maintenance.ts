import { doc, getDoc } from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase/client";

export const MAINTENANCE_COLLECTION = "site";
export const MAINTENANCE_DOC_ID = "maintenance";

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
