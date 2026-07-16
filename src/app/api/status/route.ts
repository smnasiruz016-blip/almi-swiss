// Lightweight ops/health endpoint: reports the shipped task counts per surface
// (no PII, counts only). DB-optional — never 500s, so a deploy can be verified
// before Neon is wired (dbError is surfaced honestly instead).
//
// ⚠️ ITEM COUNTS COME FROM THE JSON BUNDLES, NOT THE DATABASE — because that is
// where this product's items actually live. The runner serves tasks via
// pickPractice()/itemsForSurface(), which read src/data/items/*.json off disk.
// NOTHING in this repo ever WRITES prisma.swissItem.
//
// This endpoint used to count prisma.swissItem, inherited from an ancestor that
// seeded its bank into the DB. Here that query was reading a table nobody fills,
// so it reported itemsActive: 0 forever while 510 tasks shipped and served fine.
// Nothing threw; the number was simply false. And this is the endpoint AlmiMonitor
// attributes health from, so "no content" was the answer it would have believed.
//
// The fix is NOT to seed the DB to match. That would create a SECOND source of
// truth: edit a JSON bundle, forget the seeder, and this endpoint lies again —
// only now with a number that looks maintained. One source, read at the source.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ALL_EXAMS } from "@/lib/ch/registry";
import { itemCount } from "@/lib/ch/items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ `product` here is an IDENTITY KEY, not a label: AlmiMonitor reads this endpoint
// to attribute health to a product in its registry. Forked with the ancestor's value,
// this product's uptime and item counts would have been reported as the Swedish  hygiene-allow
// product's — two products claiming one identity, and the monitor believing the last
// one it polled. Same class of bug as metadata.product in lib/billing/stripe.ts.
export async function GET(): Promise<NextResponse> {
  // Keyed by SLUG, not exam. `exam` does not identify a surface: FIDE spans
  // CITIZENSHIP, C_PERMIT and GETTING_STARTED, so the old "FIDE.READING" key silently
  // merged three different modules into one number — the same mistake that once let
  // Rule #7 read as satisfied for empty modules. Slugs are unique per registry entry.
  const items: Record<string, number> = {};
  let itemsActive = 0;
  for (const exam of ALL_EXAMS) {
    for (const skill of exam.skills) {
      const n = itemCount(exam, skill);
      if (n > 0) items[`${exam.slug}.${skill}`] = n;
      itemsActive += n;
    }
  }

  // The DB still answers for things the DB actually owns.
  let approvedReviews: number | null = null;
  let dbError: string | null = null;
  try {
    approvedReviews = await prisma.review.count({ where: { approved: true } });
  } catch (e) {
    dbError = e instanceof Error ? e.message : "db error";
  }

  return NextResponse.json(
    { ok: true, product: "almi-swiss", itemsActive, items, approvedReviews, dbError },
    { headers: { "Cache-Control": "no-store" } },
  );
}
