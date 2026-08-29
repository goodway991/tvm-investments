import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Create account — TVM Investments",
};

export default function SignupRoute() {
  return <AuthPage initialMode="signup" />;
}
