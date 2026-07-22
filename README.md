# AlmiSwiss

AI-powered **Swiss integration-exam practice** — a **separate** product in the AlmiWorld family, on its own
subdomain **almiswiss.almiworld.com**.

The practice layer is a bundled item bank: items are authored as JSON under `src/data/items/*.json`, one file
per (language × exam × skill), and served straight from disk. **Nothing writes `SwissItem`** — the Prisma
table exists but is never populated, so `/api/status` counts the bundles, not the database.

## Tracks

| Track | Exam(s) | Languages |
|---|---|---|
| **Naturalisation** (lead) | `fide` | German, French |
| **C permit** | `fide-c-permit` | German, French |
| **Certificate** | `telc-goethe` (German), `delf-tcf` (French) | German, French |
| **Canton civic** | `canton-civic` — knowledge only | German, French |
| **Getting started** | `getting-started` | German, French |

`src/lib/ch/registry.ts` is the single source of truth for the tree. Read it before changing any claim.

**Italian is declared in the type system but does not ship.** `SHIPPING_LANGUAGES = ["DE", "FR"]`, so no
Italian surface materialises. That is a documented scope decision, not an oversight — Romansh is likewise not
modelled, deliberately.

## Honesty doctrine

Results are **per-skill readiness bands** (Clear / Borderline / Below) against each exam's real criteria —
never an official result. All content is **original**, never copied from official exam material.

The rule that governs every claim on this site:

> **Naturalisation language requirements are a FEDERAL MINIMUM — oral B1, written A2 — and cantons may set
> higher bars.** No surface may present those levels as universally sufficient. Every page that names a level
> also tells the reader to confirm with their canton.

Because the requirement genuinely varies by canton and commune, "it depends where you live" is the honest
answer, and the product says so rather than picking a number that looks tidier.

`language` is a **required** argument on every item lookup, not an optional filter. `fide-german` and
`fide-french` are different exams; an optional filter would let a caller silently serve a French candidate
German items — nothing would throw, and wrong items just look like content.

## What the build enforces

`build` runs these in order, and any failure blocks the deploy:

| gate | asserts |
|---|---|
| `countries-axis` | the origin-country axis is complete and excludes Switzerland itself |
| `fork-hygiene` | no ancestor-country noun anywhere in `src`, `scripts`, `prisma` — **or in this README and package.json** |
| `real-entity` | no invented business or misattributed real organisation in item content |
| `uniqueness` | per-origin pSEO content is not a name-swap of another origin |
| `verify-items` | every answer key self-grades and agrees with its payload; Rule #7 (≥15 per module per language track) |

## Fork hygiene

Lineage: `celpip → goethe → icelandic → danish → norwegian → swedish → swiss`. Every hop leaked the previous
country's facts into user-facing copy, and the gate exists because those leaks reached production — Danish <!-- hygiene-allow: names the ancestors to document the leaks this gate prevents -->
universities asserted as Norwegian, a fabricated "University of Southern Norway" produced by find-replacing a <!-- hygiene-allow: names the ancestors to document the leaks this gate prevents -->
country name, Norwegian transcripts read aloud in an Icelandic voice. <!-- hygiene-allow: names the ancestors to document the leaks this gate prevents -->

Two rules the list encodes, both learned here:

1. **Add the immediate ancestor.** Swedish was absent from the inherited list because in `almi-swedish` <!-- hygiene-allow: names the ancestors to document the leaks this gate prevents -->
   Swedish was the *subject*. The gate is always weakest against the fork that just happened. <!-- hygiene-allow: names the ancestors to document the leaks this gate prevents -->
2. **Remove what this country legitimately owns.** The inherited list banned `Schreiben`, `Sprechen` and
   `Goethe-Institut` — correct for a Nordic product, wrong here: German is a Swiss national language and
   Goethe is an SEM-recognised certificate this product offers. A gate that fails on correct content trains
   you to ignore it.

Note one deliberate absence: **`UHR` is not banned.** It is Sweden's exam authority *and* the German word for <!-- hygiene-allow: names the ancestors to document the leaks this gate prevents -->
o'clock — it appears in every German item that names a time. A brand that is also a common word cannot be
caught by name.

## Billing

Routed through the **central billing router** — no per-product Stripe webhook slot.
`session.metadata.product = "almi-swiss"`, per-product `ROUTER_WEBHOOK_SECRET`, price IDs from env
(`STRIPE_PRICE_ID_MONTHLY`). `/api/billing/health` must report `ok:true`. $12/month with a 7-day trial (the
trial lives in `subscription_data`, not on the price).

## Stack

Next.js 16 (App Router) · React 19 · Prisma 6 + Neon · Tailwind v4 (CSS-first, tokens in `globals.css`) ·
Stripe · Resend · Anthropic (productive-skill feedback) · browser SpeechSynthesis for listening audio
(`de-CH` / `fr-CH`, no Blob storage).

## pSEO

Study and jobs matrices on the cost-optimised path (`revalidate: false`, constant `lastModified`, taught-gate
on real curriculum data). Axes live in `src/data/seo/*.json`; totals are computed from array lengths at
runtime — **re-derive them, never copy the figure from a comment**.
