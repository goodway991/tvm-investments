import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Log in — TVM Investments",
};

export default function LoginRoute() {
  return <AuthPage initialMode="login" />;
}
