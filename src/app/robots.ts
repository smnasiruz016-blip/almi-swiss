import type { MetadataRoute } from "next";
import { SITE_URL, IS_LIVE } from "@/lib/site";

const DEEP_LEAVES = ["/study-in-switzerland/*/from/", "/work-in-switzerland/*/from/"];

const HEAVY_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "anthropic-ai",
  "CCBot", "Bytespider", "Amazonbot", "PerplexityBot", "Google-Extended",
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "DataForSeoBot", "PetalBot",
];

export default function robots(): MetadataRoute.Robots {
  // Pre-launch: whole site closed to crawlers (must agree with the noindex in the
  // root layout). No sitemap advertised while closed. UNCHANGED.
  if (!IS_LIVE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      // HOLDING 2026-08-09 — DEEP_LEAVES now applies to Googlebot and Bingbot too. Those routes no
      // longer render (dynamicParams = false), so there is nothing there to crawl. Note robots.txt
      // is advisory and is NOT what stops the ISR writes — almi-danish kept writing after the same
      // block went live; the route config is the control. Remove DEEP_LEAVES here to reverse.
      { userAgent: ["Googlebot", "Bingbot"], allow: "/", disallow: ["/practice/", "/account", "/admin", "/api/", ...DEEP_LEAVES] },
      { userAgent: "*", allow: "/", disallow: ["/practice/", "/account", "/admin", "/api/", ...DEEP_LEAVES], crawlDelay: 10 },
      { userAgent: HEAVY_BOTS, disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap-index.xml`,
  };
}
