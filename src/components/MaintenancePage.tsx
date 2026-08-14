"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { PublicShell } from "@/components/PublicShell";

export function MaintenancePage() {
  const { user, logout } = useAuth();

  return (
    <PublicShell>
      <section className="mx-auto grid min-h-[70vh] w-[min(720px,100%)] place-items-center px-5 py-16">
        <article className="glass-strong w-full rounded-[28px] p-8 text-center shadow-[0_18px_40px_-24px_rgba(52,41,120,0.4)] sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet">
            Desk notice
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
            Site maintenance
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
            The research desk is briefly offline. Check back later — landing and
            about pages stay open in the meantime.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="glass-violet inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white"
            >
              Back to home
            </Link>
            {user ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="glass inline-flex rounded-full px-6 py-3 text-sm font-semibold text-violet"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </article>
      </section>
    </PublicShell>
  );
}
