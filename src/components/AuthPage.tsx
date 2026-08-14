"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { type FormEvent, useState } from "react";
import { MiniChart } from "@/components/MiniChart";
import { PublicShell } from "@/components/PublicShell";
import { TVMBrand } from "@/components/TVMBrand";
import {
  getClientAuth,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { LEGAL_STORAGE_KEY, TOS_VERSION } from "@/lib/legal";
import { readMaintenanceEnabled } from "@/lib/maintenance";
import {
  clearSignupName,
  fullDisplayName,
  isPersonName,
  normalizePersonName,
  writeSignupName,
} from "@/lib/person-name";

type AuthMode = "login" | "signup";
const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_TVM_ADMIN_EMAIL || "admin@tvm-investments.test";

export function AuthPage({ initialMode }: { initialMode: AuthMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const firebaseConfigured = isFirebaseConfigured();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (mode === "signup" && !acceptedLegal) {
      setError("Accept the Terms of Service, Privacy Policy, and Risk Disclaimer to continue.");
      return;
    }

    if (!firebaseConfigured) {
      router.push("/dashboard");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (mode === "signup") {
      const first = normalizePersonName(firstName);
      const last = normalizePersonName(lastName);
      if (!isPersonName(first) || !isPersonName(last)) {
        setError("Enter a first and last name (letters only, no numbers).");
        return;
      }
    }
    if (mode === "signup" && !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode === "signup" && password.length < 12) {
      setError("Use a password with at least 12 characters.");
      return;
    }
    if (mode === "signup" && !/[A-Za-z]/.test(password)) {
      setError("Password must include a letter.");
      return;
    }
    if (mode === "signup" && !/[0-9]/.test(password)) {
      setError("Password must include a number.");
      return;
    }

    const auth = getClientAuth();
    if (!auth) {
      setError("Firebase Authentication is not configured.");
      return;
    }

    setLoading(true);
    try {
      const credentialEmail =
        mode === "login" && email.trim().toUpperCase() === "ADMIN"
          ? ADMIN_EMAIL
          : email.trim();
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence,
      );

      if (mode === "login") {
        clearSignupName();
        await signInWithEmailAndPassword(auth, credentialEmail, password);
      } else {
        sessionStorage.setItem(
          LEGAL_STORAGE_KEY,
          JSON.stringify({ tosVersion: TOS_VERSION, acceptedAt: Date.now() }),
        );
        const first = normalizePersonName(firstName);
        const last = normalizePersonName(lastName);
        writeSignupName({ firstName: first, lastName: last });
        const created = await createUserWithEmailAndPassword(
          auth,
          credentialEmail,
          password,
        );
        await updateProfile(created.user, {
          displayName: fullDisplayName(first, last),
        });
      }
      const goToDesk = (await readMaintenanceEnabled())
        && credentialEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase();
      router.push(goToDesk ? "/maintenance" : "/dashboard");
    } catch (authError) {
      if (authError instanceof FirebaseError) {
        const messages: Record<string, string> = {
          "auth/email-already-in-use": "An account already exists for this email.",
          "auth/invalid-credential": "The email or password is incorrect.",
          "auth/invalid-email": "Enter a valid email address.",
          "auth/weak-password": "Use a password with at least 12 characters, including a letter and a number.",
          "auth/too-many-requests": "Too many attempts. Please try again later.",
          "auth/operation-not-allowed":
            "Email/password sign-in has not been enabled for this Firebase project.",
        };
        setError(messages[authError.code] ?? "Authentication failed. Please try again.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError("");
    setMessage("");

    if (!firebaseConfigured) {
      setMessage("Password recovery is unavailable in demo mode.");
      return;
    }
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    const resetEmail =
      email.trim().toUpperCase() === "ADMIN" ? ADMIN_EMAIL : email.trim();
    if (!resetEmail.includes("@")) {
      setError("Enter a valid email address first.");
      return;
    }

    const auth = getClientAuth();
    if (!auth) {
      setError("Firebase Authentication is not configured.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setMessage("Password reset email sent.");
    } catch {
      setError("Unable to send a password reset email. Check the address and try again.");
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <PublicShell>
      <main className="animate-rise">
        <div className="grid min-h-screen lg:grid-cols-2">
          <div className="relative hidden flex-col justify-between overflow-hidden p-14 lg:flex">
            <Link href="/" className="w-fit" aria-label="TVM Investments home">
              <TVMBrand size={32} />
            </Link>
            <div className="relative">
              <div
                className="glass-strong max-w-sm rounded-[26px] p-6"
                style={{ animation: "floaty 7s ease-in-out infinite" }}
              >
                <div className="flex items-center justify-between text-sm text-ink-soft">
                  <span>Portfolio</span>
                  <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                    +12.4%
                  </span>
                </div>
                <div className="mt-1 font-display text-3xl font-bold text-ink">$128,540</div>
                <MiniChart
                  values={[12, 20, 15, 25, 18, 31, 24, 38, 35, 46]}
                  id="auth-portfolio"
                  height={110}
                />
              </div>
              <h2 className="mt-10 max-w-md font-display text-4xl font-bold leading-tight text-ink">
                The market, decoded every day.
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
                Sign in to see today&apos;s flagged picks, run the eight-signal screener, and track
                your projected returns.
              </p>
            </div>
            <p className="text-xs text-ink-soft">
              © {new Date().getFullYear()} TVM Investments, LLC · Research use only
            </p>
          </div>

          <div className="flex items-center justify-center p-6 pt-28 sm:p-14 sm:pt-32 lg:pt-14">
            <div className="glass-strong w-full max-w-md rounded-[28px] p-8 sm:p-10">
              <div className="mb-8 lg:hidden">
                <TVMBrand />
              </div>

              <div className="glass mb-8 flex rounded-full p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setMessage("");
                  }}
                  className={`flex-1 cursor-pointer rounded-full py-2.5 transition-all ${
                    isLogin ? "glass-violet text-white" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setMessage("");
                  }}
                  className={`flex-1 cursor-pointer rounded-full py-2.5 transition-all ${
                    !isLogin ? "glass-violet text-white" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Create account
                </button>
              </div>

              <h1 className="font-display text-2xl font-bold text-ink">
                {isLogin ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-1.5 text-sm text-ink-soft">
                {isLogin
                  ? "Sign in to your TVM workspace."
                  : "Start screening the market in minutes."}
              </p>

              {!firebaseConfigured && (
                <p className="mt-4 rounded-xl bg-violet/5 px-3 py-2 text-xs text-ink-soft">
                  Demo mode: Firebase is not configured, so credentials are not stored.
                </p>
              )}

              <form className="mt-7 space-y-4" onSubmit={submit}>
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block min-w-0">
                      <span className="mb-1.5 block text-sm font-medium text-ink">
                        First name
                      </span>
                      <input
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        required={firebaseConfigured}
                        maxLength={40}
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        placeholder="First"
                        className="field w-full rounded-2xl px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/50"
                      />
                    </label>
                    <label className="block min-w-0">
                      <span className="mb-1.5 block text-sm font-medium text-ink">
                        Last name
                      </span>
                      <input
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        required={firebaseConfigured}
                        maxLength={40}
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        placeholder="Last"
                        className="field w-full rounded-2xl px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/50"
                      />
                    </label>
                  </div>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    {isLogin ? "Email or username" : "Email address"}
                  </span>
                  <input
                    name="email"
                    type="text"
                    autoComplete="username"
                    required={firebaseConfigured}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={isLogin ? "you@email.com or ADMIN" : "you@email.com"}
                    className="field w-full rounded-2xl px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">Password</span>
                  <span className="relative block">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      required={firebaseConfigured}
                      minLength={firebaseConfigured ? 12 : undefined}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className="field w-full rounded-2xl px-4 py-3 pr-12 text-[15px] text-ink placeholder:text-ink-soft/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-medium text-violet"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </span>
                </label>

                {!isLogin && (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">
                      Confirm password
                    </span>
                    <input
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required={firebaseConfigured}
                      minLength={firebaseConfigured ? 12 : undefined}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="••••••••"
                      className="field w-full rounded-2xl px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/50"
                    />
                  </label>
                )}

                {isLogin && (
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex cursor-pointer items-center gap-2 text-ink-soft">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                        className="h-4 w-4 accent-violet"
                      />{" "}
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={resetPassword}
                      disabled={loading}
                      className="cursor-pointer font-medium text-violet"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {!isLogin && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-violet/[0.06] p-3 text-xs leading-relaxed text-ink-soft">
                    <input
                      type="checkbox"
                      required
                      checked={acceptedLegal}
                      onChange={(event) => setAcceptedLegal(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-violet"
                    />
                    <span>
                      I have read and agree to the{" "}
                      <Link href="/terms" className="font-semibold text-violet hover:underline">
                        Terms of Service
                      </Link>
                      ,{" "}
                      <Link href="/privacy" className="font-semibold text-violet hover:underline">
                        Privacy Policy
                      </Link>
                      , and{" "}
                      <Link href="/disclaimer" className="font-semibold text-violet hover:underline">
                        Risk Disclaimer
                      </Link>
                      . I understand this is educational research, not investment advice,
                      and that TVM Investments is not accountable for my investment losses.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading || (!isLogin && !acceptedLegal)}
                  className="glass-violet mt-2 inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[15px] font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-14px_rgba(75,52,220,0.7)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Please wait…"
                    : !firebaseConfigured
                      ? "Continue to demo dashboard"
                      : isLogin
                        ? "Log in"
                        : "Create account"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setMode(isLogin ? "signup" : "login");
                  setAcceptedLegal(false);
                  setError("");
                  setMessage("");
                }}
                className="mt-5 w-full cursor-pointer text-center text-sm text-ink-soft transition-colors hover:text-violet"
              >
                {isLogin ? "New to TVM? " : "Already have an account? "}
                <span className="font-semibold text-violet">
                  {isLogin ? "Create an account here" : "Log in"}
                </span>
              </button>

              {error && (
                <p
                  className="mt-4 rounded-xl bg-coral/10 px-3 py-2 text-center text-xs text-coral"
                  role="alert"
                >
                  {error}
                </p>
              )}

              {message && (
                <p
                  className="mt-4 rounded-xl bg-violet/5 px-3 py-2 text-center text-xs text-ink-soft"
                  role="status"
                >
                  {message}
                </p>
              )}

              {!isLogin && (
              <p className="mt-6 text-center text-[11px] leading-relaxed text-ink-soft/70">
                Educational research only — not a broker, adviser, or fiduciary. You can lose
                money. See our{" "}
                <Link href="/disclaimer" className="text-violet hover:underline">
                  Risk Disclaimer
                </Link>
                .
              </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
