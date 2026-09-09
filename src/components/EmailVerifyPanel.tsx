"use client";

import { type FormEvent, useEffect, useState } from "react";
import { authedFetch } from "@/lib/authed-fetch";
import { getClientAuth } from "@/lib/firebase/client";

export function EmailVerifyPanel({
  email,
  onVerified,
  onSignOut,
}: {
  email: string;
  onVerified: () => void | Promise<void>;
  onSignOut?: () => void | Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sentOnce, setSentOnce] = useState(false);

  async function refreshAuthUser() {
    const auth = getClientAuth();
    const user = auth?.currentUser;
    if (!user) return false;
    await user.reload();
    await user.getIdToken(true);
    return user.emailVerified;
  }

  async function finishIfVerified() {
    const ok = await refreshAuthUser();
    if (ok) {
      await onVerified();
      return true;
    }
    return false;
  }

  async function sendCode(auto = false) {
    setError("");
    if (!auto) setMessage("");
    setSending(true);
    try {
      const response = await authedFetch("/api/auth/email-code/send", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        alreadyVerified?: boolean;
      };
      if (!response.ok) {
        setError(payload.error || "Could not send a verification code.");
        return;
      }
      if (payload.alreadyVerified) {
        await finishIfVerified();
        return;
      }
      setSentOnce(true);
      setMessage(`We sent a one-time code to ${email}. You will not need this again after you verify.`);
    } catch {
      setError("Could not send a verification code.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await authedFetch("/api/auth/email-status", {
          method: "POST",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          verified?: boolean;
        };
        if (cancelled) return;
        if (response.ok && payload.verified) {
          await finishIfVerified();
          return;
        }
        // First-time proof only — send a single code when the account is not verified yet.
        await sendCode(true);
      } catch {
        if (!cancelled) setError("Could not check email verification status.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time mount check
  }, []);

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await authedFetch("/api/auth/email-code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error || "Incorrect code.");
        return;
      }
      const ok = await finishIfVerified();
      if (!ok) {
        setError("Verified on the server, but the session did not refresh. Try signing in again.");
      }
    } catch {
      setError("Could not verify that code.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet/20 border-t-violet" />
        <p className="text-sm text-ink-soft">Checking your email…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Verify your email</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Enter the one-time code we sent to{" "}
          <span className="font-medium text-ink">{email}</span>. This is only
          required the first time you create an account or sign in — not on later
          logins.
        </p>
      </div>

      <form className="space-y-4" onSubmit={verify}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">6-digit code</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="field w-full rounded-2xl px-4 py-3 text-center text-xl tracking-[0.35em] text-ink placeholder:text-ink-soft/50"
          />
        </label>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="glass-violet inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[15px] font-medium text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          disabled={sending}
          onClick={() => void sendCode(false)}
          className="cursor-pointer font-medium text-violet disabled:opacity-60"
        >
          {sending ? "Sending…" : sentOnce ? "Resend code" : "Send code"}
        </button>
        {onSignOut && (
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="cursor-pointer text-ink-soft hover:text-violet"
          >
            Use a different email
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-coral/10 px-3 py-2 text-center text-xs text-coral" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-xl bg-violet/5 px-3 py-2 text-center text-xs text-ink-soft" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
