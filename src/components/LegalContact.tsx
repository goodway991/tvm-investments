import { getLegalContactEmail } from "@/lib/legal";

export function LegalContact({ purpose }: { purpose?: string }) {
  const email = getLegalContactEmail();
  const label = purpose ? `${purpose}: ` : "";
  if (email) {
    return (
      <>
        {label}
        <a href={`mailto:${email}`}>{email}</a>
      </>
    );
  }
  return (
    <>
      {label}use the in-app feedback form in Settings. A public contact address will
      appear here when it is published.
    </>
  );
}
