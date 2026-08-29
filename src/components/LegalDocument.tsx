import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

export function LegalDocument({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <PublicShell>
      <main className="animate-rise">
        <article className="mx-auto max-w-3xl px-6 pb-24 pt-36">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            Legal
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Effective {updated}. Please read this document carefully.
          </p>
          <div className="glass-strong prose-tvm mt-8 rounded-[28px] p-6 text-sm sm:p-10">
            {children}
          </div>
          <p className="mt-8 text-center text-xs text-ink-soft">
            <Link href="/terms" className="text-violet hover:underline">
              Terms of Service
            </Link>
            {" · "}
            <Link href="/privacy" className="text-violet hover:underline">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/refunds" className="text-violet hover:underline">
              Refunds
            </Link>
            {" · "}
            <Link href="/disclaimer" className="text-violet hover:underline">
              Risk Disclaimer
            </Link>
          </p>
        </article>
      </main>
    </PublicShell>
  );
}
