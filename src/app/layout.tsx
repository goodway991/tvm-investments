import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Providers } from "@/components/Providers";
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
    "A daily research desk for self-directed investors. Eight-signal screens, movers, and notes.",
  applicationName: "TVM Investments",
  appleWebApp: {
    capable: true,
    title: "TVM Investments",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${sora.variable} font-sans antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var f=localStorage.getItem("tvm-appearance-forced-dark");if(f!=="1"){localStorage.setItem("tvm-appearance-forced-dark","1");localStorage.setItem("tvm-appearance","dark");}var t=localStorage.getItem("tvm-appearance");var d=t!=="light"&&(t!=="system"||window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}})();`,
          }}
        />
        <GoogleAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
