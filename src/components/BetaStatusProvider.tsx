"use client";

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
import {
  DISCORD_PENDING_KEY,
  EMPTY_BETA_STATUS,
  SHOW_BETA_WAITLIST,
  type BetaStatus,
} from "@/lib/beta-waitlist";

type BetaContextValue = BetaStatus & {
  show: boolean;
  loading: boolean;
  joinWaitlist: () => Promise<void>;
  connectDiscord: () => Promise<void>;
};

const BetaContext = createContext<BetaContextValue>({
  ...EMPTY_BETA_STATUS,
  show: SHOW_BETA_WAITLIST,
  loading: false,
  joinWaitlist: async () => undefined,
  connectDiscord: async () => undefined,
});

export function useBetaStatus() {
  return useContext(BetaContext);
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
  const { user } = useAuth();
  const [status, setStatus] = useState<BetaStatus>(EMPTY_BETA_STATUS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !SHOW_BETA_WAITLIST) {
      setStatus(EMPTY_BETA_STATUS);
      return;
    }
    const response = await authedFetch("/api/beta/status");
    const payload = (await response.json()) as BetaStatus;
    if (response.ok) setStatus(payload);
  }, [user]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

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

  const value = useMemo(
    () => ({
      ...status,
      show: SHOW_BETA_WAITLIST,
      loading,
      joinWaitlist,
      connectDiscord,
    }),
    [connectDiscord, joinWaitlist, loading, status],
  );

  return <BetaContext.Provider value={value}>{children}</BetaContext.Provider>;
}
