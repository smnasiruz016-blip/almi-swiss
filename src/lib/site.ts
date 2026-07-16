// AlmiSwiss — the single source of truth for this product's own identity.
//
// WHY THIS FILE EXISTS. At fork time TEN files hardcoded the ANCESTOR's domain
// (almiswedish.almiworld.com). Six stated it outright; four hid it as a FALLBACK:
//
//     process.env.NEXT_PUBLIC_APP_URL ?? "https://almiswedish.almiworld.com"
//
// The fallback form is the dangerous one. In production the env var is set, so it
// looks correct and tests green — and the moment it is missing (a preview build, a
// new environment, a typo'd var name) the product silently starts emitting the
// ANCESTOR's URLs: canonicals, sitemap entries, password-reset links, Stripe return
// URLs. Nothing throws. A user gets mailed a link to a different product.
//
// So: ONE export, no cross-product fallback ever. If a fork of THIS product reaches
// production without setting NEXT_PUBLIC_APP_URL, it must fail loudly at build —
// not quietly point at Switzerland.

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Never fall back to another product's domain. In a real deploy this is a fatal
  // misconfiguration; at build/lint time on a dev box it isn't worth exploding over.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not set. Refusing to guess a domain: a wrong guess " +
        "silently emits another product's URLs in canonicals, sitemaps and emails.",
    );
  }
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

/** This product's own domain, for display. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

// ── Launch gate ──
// A fork is a Swiss product with Swedish content until the conversion is finished.
// Shipping that to a live, indexable domain teaches Google that almiswiss is about
// Sweden — and an indexed wrong page outlives the mistake by months.
//
// So indexing is OPT-IN: default noindex, and only NEXT_PUBLIC_SITE_LIVE === "true"
// turns it on. Defaulting the other way means forgetting the flag = the bad outcome,
// and the whole point is that forgetting should be safe.
//
// ⚠️ NEXT_PUBLIC_* is INLINED AT BUILD TIME. Flipping this in the Vercel dashboard
// does nothing until a REDEPLOY, and it must be exactly the string "true".
export const IS_LIVE = process.env.NEXT_PUBLIC_SITE_LIVE === "true";

/** Robots directives for the root layout. While the fork is being converted, every
 *  page says noindex — including any page an early crawler would otherwise find. */
export const ROBOTS_META = IS_LIVE
  ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" as const } }
  : { index: false, follow: false, googleBot: { index: false, follow: false } };
