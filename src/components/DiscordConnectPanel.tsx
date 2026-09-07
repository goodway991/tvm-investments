"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useBetaStatus } from "@/components/BetaStatusProvider";
import { authedFetch } from "@/lib/authed-fetch";
import {
  discordProfileAvatarUrl,
  discordProfileDisplayName,
  discordProfileHandle,
  type DiscordProfile,
} from "@/lib/discord-profile";
import { DISCORD_INVITE_URL } from "@/lib/community";

type DiscordConnectPanelProps = {
  variant?: "settings" | "auth";
  returnTo?: string;
};

type PendingDiscordView = {
  discordId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  discordAvatar: string | null;
  displayName: string;
  handle: string;
  avatarUrl: string;
};

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M20.317 4.369A19.791 19.791 0 0 0 16.885 3.2a12.995 12.995 0 0 0-.635 1.302 18.045 18.045 0 0 0-5.442 0 12.683 12.683 0 0 0-.648-1.302 19.736 19.736 0 0 0-3.432 1.169C2.163 7.953 1.34 11.52 1.686 15.012a19.9 19.9 0 0 0 6.043 3.073 15.053 15.053 0 0 0 1.287-2.082 12.838 12.838 0 0 1-2.032-.974 8.678 8.678 0 0 0 .372-.297 13.045 13.045 0 0 0 8.96 0c.12.103.243.204.372.297a12.754 12.754 0 0 1-2.033.974 15.042 15.042 0 0 0 1.287 2.082 19.878 19.878 0 0 0 6.043-3.073c.415-4.032-.698-7.594-3.094-10.643ZM8.02 13.065c-.955 0-1.734-.88-1.734-1.965 0-1.086.764-1.965 1.734-1.965.98 0 1.753.889 1.734 1.965 0 1.085-.754 1.965-1.734 1.965Zm7.974 0c-.955 0-1.734-.88-1.734-1.965 0-1.086.764-1.965 1.734-1.965.98 0 1.753.889 1.734 1.965 0 1.085-.754 1.965-1.734 1.965Z"
      />
    </svg>
  );
}

function UnlinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M9.5 14.5 14.5 9.5M8 11l-1.2 1.2a3.5 3.5 0 1 0 4.95 4.95L13 16M16 13l1.2-1.2a3.5 3.5 0 1 0-4.95-4.95L11 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SETTINGS_PERKS = [
  "Linked member access on our Discord",
  "Community channels as they open",
  "Beta status synced to your account",
  "Announcements and desk updates",
];

export function DiscordConnectPanel({
  variant = "settings",
  returnTo,
}: DiscordConnectPanelProps) {
  const { user } = useAuth();
  const { discordConnected, discord, loading } = useBetaStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingReady, setPendingReady] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<PendingDiscordView | null>(null);
  const [configured, setConfigured] = useState(true);
  const compact = variant === "auth";
  const targetReturnTo =
    returnTo || (compact ? "/login" : "/dashboard/settings?tab=discord");
  const guestAuthorizeHref = `/api/discord/authorize?guest=1&returnTo=${encodeURIComponent(targetReturnTo)}`;

  useEffect(() => {
    void fetch("/api/discord/config")
      .then((response) => response.json())
      .then((payload: { configured?: boolean }) => setConfigured(payload.configured === true))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("discord") === "ready") setPendingReady(true);
    if (params.get("discord") === "error") {
      setError(params.get("discord_reason") || "Discord connection failed. Try again.");
    }
  }, []);

  useEffect(() => {
    if (!compact || discordConnected) return;
    let cancelled = false;
    void fetch("/api/discord/pending")
      .then((response) => response.json())
      .then((payload: { pending?: boolean; discord?: PendingDiscordView }) => {
        if (cancelled || !payload.pending || !payload.discord) return;
        setPendingProfile(payload.discord);
        setPendingReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [compact, discordConnected]);

  async function connectSignedIn() {
    setBusy(true);
    setError("");
    try {
      const response = await authedFetch("/api/discord/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: targetReturnTo }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to start Discord linking.");
      }
      window.location.assign(payload.url);
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Unable to connect Discord.",
      );
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    setError("");
    try {
      const response = await authedFetch("/api/discord/unlink", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to unlink Discord.");
    } catch (unlinkError) {
      setError(
        unlinkError instanceof Error ? unlinkError.message : "Unable to unlink Discord.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className={compact ? "mt-6" : ""}>
        <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-ink-soft">
          Discord linking is not configured on this environment yet.
        </p>
      </div>
    );
  }

  const linkedProfile: DiscordProfile | null = discordConnected && discord ? discord : null;
  const showAuthLinked = Boolean(linkedProfile || (pendingReady && pendingProfile));

  if (compact) {
    return (
      <div className="mt-4 space-y-3">
        {showAuthLinked ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[#5865F2]/25 bg-[#5865F2]/15 px-4 py-3">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  linkedProfile
                    ? discordProfileAvatarUrl(linkedProfile)
                    : pendingProfile!.avatarUrl
                }
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
                ✓
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">
                {linkedProfile
                  ? discordProfileDisplayName(linkedProfile)
                  : pendingProfile!.displayName}
              </p>
              <p className="truncate text-xs text-ink-soft">
                {linkedProfile
                  ? discordProfileHandle(linkedProfile)
                  : pendingProfile!.handle}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
              Linked!
            </span>
          </div>
        ) : (
          <>
            {user ? (
              <button
                type="button"
                disabled={busy || loading}
                onClick={() => void connectSignedIn()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-[#5865F2]/10 px-5 py-3 text-sm font-semibold text-ink transition-all duration-200 hover:bg-[#5865F2]/20 disabled:opacity-50"
              >
                <DiscordMark className="h-5 w-5" />
                {busy ? "Connecting…" : "Connect Discord account"}
              </button>
            ) : (
              <a
                href={guestAuthorizeHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-[#5865F2]/10 px-5 py-3 text-sm font-semibold text-ink transition-all duration-200 hover:bg-[#5865F2]/20"
              >
                <DiscordMark className="h-5 w-5" />
                Connect Discord account
              </a>
            )}
            <p className="text-center text-xs text-ink-soft">
              Links your Discord profile to TVM. Server invite:{" "}
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-violet hover:underline"
              >
                Join Discord
              </a>
              .
            </p>
          </>
        )}
        {error ? (
          <p className="rounded-xl bg-coral/10 px-3 py-2 text-xs text-coral" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm leading-relaxed text-ink-soft">
      <div>
        <p className="font-semibold text-ink">Discord account</p>
        <p className="mt-1">
          Link your Discord account to access community channels and keep your desk
          status in sync.
        </p>
      </div>

      {linkedProfile ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-[#5865F2]/20 px-4 py-3.5">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={discordProfileAvatarUrl(linkedProfile)}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
                ✓
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">
                {discordProfileDisplayName(linkedProfile)}
              </p>
              <p className="truncate text-xs text-ink-soft">
                {discordProfileHandle(linkedProfile)}
              </p>
            </div>
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => void unlink()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              <UnlinkIcon className="h-3.5 w-3.5" />
              Unlink
            </button>
          </div>
          <p className="flex items-center gap-2 text-xs font-medium text-emerald-400/90">
            <span aria-hidden="true">✓</span> Account linked
          </p>
        </>
      ) : (
        <button
          type="button"
          disabled={busy || loading || !user}
          onClick={() => void connectSignedIn()}
          className="glass-violet inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
        >
          <DiscordMark className="h-5 w-5" />
          {busy ? "Connecting…" : "Connect Discord account"}
        </button>
      )}

      <div className="rounded-2xl bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink">
          What you get
        </p>
        <ul className="mt-3 space-y-2">
          {SETTINGS_PERKS.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-400" aria-hidden="true">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-sm font-semibold text-violet hover:underline"
        >
          Open Discord server
        </a>
      </div>

      {error ? (
        <p className="rounded-xl bg-coral/10 px-3 py-2 text-xs text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export async function linkPendingDiscordAccount() {
  try {
    const response = await authedFetch("/api/discord/link", { method: "POST" });
    const payload = (await response.json()) as { linked?: boolean; error?: string };
    if (!response.ok && payload.error) throw new Error(payload.error);
    return payload.linked === true;
  } catch {
    return false;
  }
}
