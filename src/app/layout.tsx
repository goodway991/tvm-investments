import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: {
    default: "TVM Investments — Daily Stock Research",
    template: "%s",
  },
  description:
    "Educational daily stock screener using 8 weighted trading strategies, market events, and backtested track record.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${sora.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
