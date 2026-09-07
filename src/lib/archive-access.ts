import "server-only";
import { NextResponse } from "next/server";
import { archiveWindow } from "@/lib/archive-window";
import {
  getPlanForUser,
  isAdminEmail,
} from "@/lib/firebase/admin";
import type { PlanId } from "@/lib/plans";

async function authCreatedAt(uid: string): Promise<string | null> {
  try {
    const { getApps } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");
    const app = getApps()[0];
    if (!app) return null;
    const user = await getAuth(app).getUser(uid);
    const raw = user.metadata.creationTime;
    if (!raw) return null;
    const ymd = new Date(raw).toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });
    return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
  } catch {
    return null;
  }
}

export async function resolveArchiveAccess(uid: string, email: string) {
  const plan = await getPlanForUser(uid, email);
  const role: "client" | "admin" = isAdminEmail(email) ? "admin" : "client";
  const joinedOn = role === "admin" || plan === "free" ? null : await authCreatedAt(uid);
  const window = archiveWindow(plan, joinedOn, role);
  return { plan, role, window, joinedOn };
}

/** Reject archive dates outside the caller's plan window (latest/live = allowed). */
export async function requireArchiveDate(
  uid: string,
  email: string,
  date: string | null,
): Promise<
  | { ok: true; plan: PlanId; window: { from: string; to: string } }
  | { ok: false; response: NextResponse }
> {
  const access = await resolveArchiveAccess(uid, email);
  if (date && (date < access.window.from || date > access.window.to)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            access.plan === "free"
              ? "Free archive covers the last few sessions. Upgrade for history from your join date."
              : "That session is outside your archive window.",
        },
        { status: 403 },
      ),
    };
  }
  return { ok: true, plan: access.plan, window: access.window };
}

/** Filter date lists so free/pro clients never learn about locked sessions. */
export function filterDatesForWindow(
  dates: string[],
  window: { from: string; to: string },
) {
  return dates.filter((date) => date >= window.from && date <= window.to);
}
