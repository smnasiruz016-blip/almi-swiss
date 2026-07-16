import type { Metadata } from "next";
import { Inter, Allura } from "next/font/google";
import "./globals.css";
import { GlobalHeader } from "@/components/GlobalHeader";
import { GlobalFooter } from "@/components/GlobalFooter";
import { SITE_URL, ROBOTS_META } from "@/lib/site";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const allura = Allura({ variable: "--font-allura", subsets: ["latin"], weight: "400", display: "swap" });



export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AlmiSwiss | fide Practice for Swiss Permits & Naturalisation, with Honest Readiness",
    template: "%s · AlmiSwiss",
  },
  description:
    "Switzerland asks B1 spoken and A2 written for naturalisation — a federal minimum, not the answer, because your canton and commune decide. Practise fide in German or French with honest per-skill readiness bands. $12/month with a 7-day free trial. Original material, never copied. Not affiliated with SEM — confirm your requirement with your cantonal migration authority. Part of the AlmiWorld family.",
  applicationName: "AlmiSwiss",
  authors: [{ name: "AlmiWorld" }],
  // Keywords reflect what people actually search when they are trying to work this
  // out — including the two questions this product exists to answer honestly: which
  // level, and who decides. No keyword here implies a national civics test or a
  // university-admission route, because neither is something we can deliver.
  keywords: ["fide test practice", "Swiss naturalisation language requirement", "B1 spoken A2 written Switzerland", "fide Sprachnachweis", "C permit language level", "fide German practice", "fide French practice", "Swiss citizenship language test", "canton language requirement", "AlmiSwiss", "AlmiWorld"],
  openGraph: {
    title: "AlmiSwiss — honest fide practice for permits and naturalisation",
    description: "Original fide practice in German and French, built around real Swiss situations — honest per-skill readiness estimates and AI feedback. Your canton decides the bar; we help you clear it.",
    url: SITE_URL,
    siteName: "AlmiSwiss",
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: "AlmiSwiss — fide practice for Swiss permits & naturalisation", description: "Honest fide practice — per-skill readiness bands, never one inflated number." },
  robots: ROBOTS_META,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${allura.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <GlobalHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <GlobalFooter />
      </body>
    </html>
  );
}
