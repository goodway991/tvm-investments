/** Localhost (and non-Vercel) keeps Beta 3 labs on. Vercel stays off until we flip this. */
export function showBeta3Labs() {
  if (process.env.NEXT_PUBLIC_TVM_BETA3_LABS === "1") return true;
  if (process.env.NEXT_PUBLIC_TVM_BETA3_LABS === "0") return false;
  const vercel =
    process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || "";
  if (vercel === "production" || vercel === "preview") return false;
  return true;
}
