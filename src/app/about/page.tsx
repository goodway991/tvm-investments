import type { Metadata } from "next";
import { AboutPage } from "@/components/AboutPage";

export const metadata: Metadata = {
  title: "About — TVM Investments",
  description: "Who TVM Investments is for, what the daily research desk does, and the people building it.",
};

export default function AboutRoute() {
  return <AboutPage />;
}
