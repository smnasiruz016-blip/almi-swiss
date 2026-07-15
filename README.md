# AlmiSwedish

AI-powered **Swedish exam and civic practice** — a **separate** product in the AlmiWorld family, on its own
subdomain **almiswedish.almiworld.com**.

Forked from AlmiNorwegian's app chassis. The practice layer is an item-bank (`SwedishItem ↔ SwedishAttempt`,
data-driven task registry — no if-chains), with a **fork-hygiene gate** wired into `build` (see below).

## Tracks

| Track | Exam(s) | Level |
|---|---|---|
| **Citizenship** (lead) | Medborgarskapsprovet — the society component | Knowledge test |
| **University** | Tisus (Stockholms universitet) | ≈C1 — accepted as equivalent to Svenska 3 |
| **Getting started** | SFI Courses A–B | ≈A1–A2 |
| **Proficiency** | SFI Courses C–D → Swedish B1–B2 | ≈A2–B1+ → B1–B2 |

`src/lib/sv/registry.ts` is the single source of truth for the tree, and carries a dated fact-base comment.
Read it before changing any claim.

## Honesty doctrine

Results are **per-skill readiness bands** (Clear / Borderline) against each exam's real criteria — never an
official result. All content is **original**, never copied from UHR, Skolverket or Stockholms universitet
material. 25% of proceeds fund the Shamool Foundation.

Three rules specific to this product, because Sweden's citizenship test is brand new:

1. **Never state a pass mark for Medborgarskapsprovet.** UHR has not published one. Anyone quoting a number is
   guessing, and we say so rather than joining them.
2. **Never imply the citizenship language test exists.** UHR indicates autumn 2028 at the earliest and has set
   no CEFR level. We ship no practice for it — there is nothing published to practise against.
3. **We are not affiliated with UHR, and we say so on the page.** UHR has stated publicly that it does not
   stand behind unofficial practice tests found online and that their quality is not checked by UHR. That
   includes ours. The site points users at UHR's free *Sverige i fokus* as the source of truth.

The 15 Aug 2026 first sitting is an **utprövningsprov** (pilot), free of charge — not a general launch.

## Deliberate omissions

- **No Swedex.** It cannot be taken after 31 Dec 2026.
- **No permanent-residence track.** Sweden imposes no language or knowledge test for PR; the Norwegian
  ancestor's track does not transfer.
- **No citizenship language exam.** See rule 2.

## Fork hygiene gate

`npm run gate:hygiene` (also the first step of `build`) fails the build on any ancestor-country proper noun.

This exists because the lineage `celpip → goethe → icelandic → danish → norwegian → swedish` leaked at **every**
hop, and shipped to production:

- `DK_UNIS = "the University of Copenhagen, Aarhus University and other **Norwegian** universities"`
- healthcare copy citing *"the Norwegian Patient Safety Authority, Styrelsen for Patientsikkerhed"* — Denmark's
  regulator, on the pages of a Norwegian product
- *"the University of Southern Norway"* — a **fabricated** institution, from find-replacing Denmark→Norway
- `ttsLang() → "is-IS"` — Norwegian transcripts read aloud in an **Icelandic** voice

The lesson encoded in the gate: grepping the previous country's nouns is not enough, because the dangerous
leaks are the ones where the *label* was localized and the *fact* was not. Fix the fact, not the label.

## Billing

Routed through the **central billing router** — no per-product Stripe webhook slot.
`session.metadata.product = "almi-swedish"`, per-product `ROUTER_WEBHOOK_SECRET`, price IDs from env
(`STRIPE_PRICE_ID_MONTHLY`). `/api/billing/health` must report `ok:true`. $12/month with a 7-day trial (the
trial lives in `subscription_data`, not on the price).

## Stack

Next.js 16 (App Router) · React 19 · Prisma 6 + Neon · Tailwind v4 (CSS-first, tokens in `globals.css`) ·
Stripe · Resend · Anthropic (productive-skill feedback) · browser SpeechSynthesis for listening audio
(`sv-SE`, no Blob storage).

## pSEO

Study and jobs matrices on the cost-optimised path (`revalidate: false`, constant `lastModified`, taught-gate
on real curriculum data). Axes live in `src/data/seo/*.json`; totals are computed from array lengths at
runtime — **re-derive them, never copy the figure from a comment**. (The Norwegian base's comment said "512
roles" while `roles.json` held 518, and the wrong number propagated into planning docs.)
