import type { Metadata } from "next";
import { AboutPage } from "@/components/AboutPage";

export const metadata: Metadata = {
  title: "About — TVM Investments",
  description: "The mission, research method, and team behind TVM Investments.",
};

export default function AboutRoute() {
  return <AboutPage />;
}
