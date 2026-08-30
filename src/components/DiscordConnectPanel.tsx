"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useBetaStatus } from "@/components/BetaStatusProvider";
import { authedFetch } from "@/lib/authed-fetch";
import {
  discordProfileAvatarUrl,
  discordProfileDisplayName,
  discordProfileHandle,
} from "@/lib/discord-profile";
import { DISCORD_INVITE_URL } from "@/lib/community";

type DiscordConnectPanelProps = {
  variant?: "settings" | "auth";
  returnTo?: string;
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

export function DiscordConnectPanel({
  variant = "settings",
  returnTo,
}: DiscordConnectPanelProps) {
  const { user } = useAuth();
  const { discordConnected, discord, loading } = useBetaStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);
  const compact = variant === "auth";
  const targetReturnTo = returnTo || (compact ? "/login" : "/dashboard/settings");

  useEffect(() => {
    void fetch("/api/discord/config")
      .then((response) => response.json())
      .then((payload: { configured?: boolean }) => setConfigured(payload.configured === true))
      .catch(() => setConfigured(false));
  }, []);

  async function connect() {
    setBusy(true);
    setError("");
    try {
      if (user) {
        const response = await authedFetch("/api/discord/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returnTo: targetReturnTo }),
        });
        const payload = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !payload.url) {
          throw new Error(payload.error || "Unable to start Discord linking.");
        }
        window.location.href = payload.url;
        return;
      }
      window.location.href = `/api/discord/authorize?guest=1&returnTo=${encodeURIComponent(targetReturnTo)}`;
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
          Discord linking is not configured on this environment yet. Add{" "}
          <code className="text-ink">DISCORD_CLIENT_ID</code> and{" "}
          <code className="text-ink">DISCORD_CLIENT_SECRET</code> to{" "}
          <code className="text-ink">.env.local</code> to test locally.
        </p>
      </div>
    );
  }

  const linked = discordConnected && discord;

  return (
    <div className={compact ? "mt-2" : "mt-6 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-ink-soft"}>
      {!compact ? (
        <>
          <p className="font-semibold text-ink">Discord account</p>
          <p className="mt-1">
            Link your Discord account to access community channels and keep your beta
            status in sync.
          </p>
        </>
      ) : null}

      {linked ? (
        <div className={compact ? "mt-4 space-y-3" : "mt-4 space-y-3"}>
          <div className="flex items-center gap-3 rounded-2xl bg-[#5865F2]/15 px-4 py-3">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={discordProfileAvatarUrl(discord)}
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
                {discordProfileDisplayName(discord)}
              </p>
              <p className="truncate text-xs text-ink-soft">
                {discordProfileHandle(discord)}
              </p>
            </div>
            {!compact ? (
              <button
                type="button"
                disabled={busy || loading}
                onClick={() => void unlink()}
                className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                Unlink
              </button>
            ) : null}
          </div>
          <p className="flex items-center gap-2 text-xs font-medium text-emerald-400/90">
            <span aria-hidden="true">✓</span> Account linked
          </p>
          {!compact ? (
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm font-semibold text-violet hover:underline"
            >
              Open Discord server
            </a>
          ) : null}
        </div>
      ) : (
        <div className={compact ? "mt-4 space-y-3" : "mt-4 space-y-3"}>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void connect()}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-50 ${
              compact
                ? "border border-white/10 bg-[#5865F2]/10 text-ink hover:bg-[#5865F2]/20"
                : "glass-violet text-white hover:-translate-y-0.5"
            }`}
          >
            <DiscordMark className="h-5 w-5" />
            {busy ? "Connecting…" : "Connect Discord account"}
          </button>
          {!compact ? (
            <div className="rounded-2xl bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink">
                What you get
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  "Linked member access on our Discord",
                  "Community channels as they open",
                  "Beta status synced to your account",
                  "Announcements and desk updates",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-400" aria-hidden="true">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-center text-xs text-ink-soft">
              Connect Discord to link your account and join the community.
            </p>
          )}
        </div>
      )}

      {error ? (
        <p className="mt-3 rounded-xl bg-coral/10 px-3 py-2 text-xs text-coral" role="alert">
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
