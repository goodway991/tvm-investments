"use client";

import { doc, onSnapshot } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import { authedFetch } from "@/lib/authed-fetch";
import { getClientFirestore } from "@/lib/firebase/client";
import {
  DISCORD_PENDING_KEY,
  EMPTY_BETA_STATUS,
  SHOW_BETA_WAITLIST,
  deskPhase,
  parseBetaStatus,
  type BetaStatus,
  type DeskPhase,
} from "@/lib/beta-waitlist";

type BetaContextValue = BetaStatus & {
  show: boolean;
  loading: boolean;
  ready: boolean;
  phase: DeskPhase;
  allowed: boolean;
  joinWaitlist: () => Promise<void>;
  connectDiscord: () => Promise<void>;
};

const BetaContext = createContext<BetaContextValue>({
  ...EMPTY_BETA_STATUS,
  show: SHOW_BETA_WAITLIST,
  loading: false,
  ready: !SHOW_BETA_WAITLIST,
  phase: SHOW_BETA_WAITLIST ? "join" : "open",
  allowed: !SHOW_BETA_WAITLIST,
  joinWaitlist: async () => undefined,
  connectDiscord: async () => undefined,
});

export function useBetaStatus() {
  return useContext(BetaContext);
}

export function useDeskAccess() {
  const beta = useBetaStatus();
  return {
    allowed: beta.allowed,
    ready: beta.ready,
    phase: beta.phase,
    show: beta.show,
  };
}

function readDiscordPending() {
  try {
    return window.localStorage.getItem(DISCORD_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDiscordPending() {
  try {
    window.localStorage.setItem(DISCORD_PENDING_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function markDiscordPending() {
  writeDiscordPending();
}

export function BetaStatusProvider({ children }: { children: React.ReactNode }) {
  const { user, entitlement, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<BetaStatus>(EMPTY_BETA_STATUS);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(!SHOW_BETA_WAITLIST);

  const refresh = useCallback(async () => {
    if (!user || !SHOW_BETA_WAITLIST) {
      setStatus(EMPTY_BETA_STATUS);
      setReady(true);
      return;
    }
    const response = await authedFetch("/api/beta/status");
    const payload = (await response.json()) as BetaStatus;
    if (response.ok) setStatus(payload);
    setReady(true);
  }, [user]);

  useEffect(() => {
    if (!user || !SHOW_BETA_WAITLIST) {
      setStatus(EMPTY_BETA_STATUS);
      setReady(true);
      return;
    }
    setReady(false);
    const db = getClientFirestore();
    if (!db) {
      void refresh();
      return;
    }
    return onSnapshot(
      doc(db, "beta_status", user.uid),
      (snapshot) => {
        setStatus(
          parseBetaStatus(snapshot.data() as Record<string, unknown> | undefined),
        );
        setReady(true);
      },
      () => {
        void refresh();
      },
    );
  }, [refresh, user]);

  useEffect(() => {
    if (!user || !SHOW_BETA_WAITLIST) return;
    if (!readDiscordPending() || status.discordConnected) return;
    void authedFetch("/api/beta/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "discord" }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as BetaStatus;
        if (response.ok) setStatus(payload);
      })
      .catch(() => undefined);
  }, [status.discordConnected, user]);

  const joinWaitlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await authedFetch("/api/beta/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "waitlist" }),
      });
      const payload = (await response.json()) as BetaStatus & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to join the waitlist.");
      setStatus(payload);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const connectDiscord = useCallback(async () => {
    writeDiscordPending();
    if (!user) return;
    setLoading(true);
    try {
      const response = await authedFetch("/api/beta/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discord" }),
      });
      const payload = (await response.json()) as BetaStatus & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to save Discord.");
      setStatus(payload);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const phase = deskPhase({
    show: SHOW_BETA_WAITLIST,
    role: entitlement.role,
    plan: entitlement.plan,
    waitlistStatus: status.waitlistStatus,
    betaTester: status.betaTester,
  });
  const allowed = !user || phase === "open";
  const statusReady =
    !SHOW_BETA_WAITLIST ||
    !user ||
    entitlement.role === "admin" ||
    (ready && !authLoading);

  const value = useMemo(
    () => ({
      ...status,
      show: SHOW_BETA_WAITLIST,
      loading,
      ready: statusReady,
      phase,
      allowed,
      joinWaitlist,
      connectDiscord,
    }),
    [
      allowed,
      connectDiscord,
      joinWaitlist,
      loading,
      phase,
      status,
      statusReady,
    ],
  );

  return <BetaContext.Provider value={value}>{children}</BetaContext.Provider>;
}
