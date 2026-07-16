import type { MetadataRoute } from "next";
import { SITE_URL, IS_LIVE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Before launch the whole site is closed to crawlers. This must agree with the
  // noindex in the root layout (ROBOTS_META): a robots.txt saying "allow: /" while
  // every page says noindex is a mixed signal, and it spends crawl budget on pages
  // we are still converting.
  //
  // No sitemap is advertised while closed, either — pointing a crawler at a sitemap
  // is an invitation, and its URLs are precisely what must not be indexed yet.
  if (!IS_LIVE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/practice/", "/account", "/admin", "/api/"] }],
    // Next 16's generateSitemaps has no auto-index at /sitemap.xml — point crawlers
    // at our explicit sitemap index, which lists every sharded sitemap.
    sitemap: `${SITE_URL}/sitemap-index.xml`,
  };
}
