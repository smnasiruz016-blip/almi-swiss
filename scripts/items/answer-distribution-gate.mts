// ANSWER-DISTRIBUTION GATE — is the correct answer gameable from its position?
//
// The completion audit found the gamed-key signature across both fide flagships and
// every smaller objective bank: a learner who always picks the first MCQ option, or the
// first CLOZE choice, or "false" on every TRUE_FALSE, scores 80–99% knowing no German or
// French. No gate caught it — this is that gate. It is type-aware, mirroring the sibling
// goethe gate:
//   MULTI  (MCQ_SINGLE, CLOZE)   — POSITION CLUSTERING. No option index may hold more
//                                  than CLUSTER of the section's answers (needs MIN_N).
//   BINARY (TRUE_FALSE)          — BALANCE. Neither value past BINARY_SKEW (needs MIN_N).
//   EXTREME SKEW (any type)      — one value at/above EXTREME_SKEW (incl. all-same) fires
//                                  at any n ≥ EXTREME_MIN_N; catches small skewed sections
//                                  MIN_N was hiding (see the constant block below).
// MATCHING and ORDERING are not single-index gameable and are excluded.
//
// Scope = one served surface × taskType (`${exam.slug}::${skill}::${taskType}`) — the
// axis a learner actually practises. Reads the bundles by surface (itemsForSurface), the
// same unambiguous loader the rest of the engine uses.
//
// Run: npm run gate:answer-distribution

import { ALL_EXAMS } from "../../src/lib/ch/registry";
import { itemsForSurface } from "../../src/lib/ch/items";

// TWO rules, because a small section can be gameable in a way a spread threshold misses:
//   1. SPREAD (needs volume) — the top index holds more than its type's fair share.
//      Requires n ≥ MIN_N: below that a 4/6 lean is as likely chance as design.
//   2. EXTREME SKEW (needs almost none) — one value holds ≥ EXTREME_SKEW of the section,
//      including the all-same case. Fires at any n ≥ EXTREME_MIN_N: a 3/3 all-"Falsch"
//      section is gameable on 3 answers, and MIN_N was hiding exactly these — a learner
//      picking that one value scores 80–100% knowing no German or French.
const CLUSTER = 0.6; // a MULTI option index past this share is clustered (spread rule)
const BINARY_SKEW = 0.75; // a TRUE_FALSE value past this share is skewed (spread rule)
const MIN_N = 6; // spread rule: too few answers below this to tell a pattern from chance
const EXTREME_SKEW = 0.8; // extreme-skew rule: one value at/above this share is gameable…
const EXTREME_MIN_N = 3; // …at any section of at least this many answers (incl. all-same)

type Row = { section: string; taskType: string; n: number; share: number; top: string; binary: boolean; reason: "spread" | "extreme" | null };

const rows: Row[] = [];

for (const e of ALL_EXAMS) {
  for (const skill of e.skills) {
    const items = itemsForSurface(e, skill);
    const byTask = new Map<string, number[]>();
    for (const it of items) {
      const a = it.answer;
      if (!a) continue;
      if (a.type === "MCQ_SINGLE" || a.type === "TRUE_FALSE") {
        (byTask.get(a.type) ?? byTask.set(a.type, []).get(a.type)!).push(a.correctIndex);
      } else if (a.type === "CLOZE") {
        const arr = byTask.get("CLOZE") ?? byTask.set("CLOZE", []).get("CLOZE")!;
        for (const c of a.correct) arr.push(c.index);
      }
      // MATCHING / ORDERING: not single-index gameable → skip
    }
    for (const [taskType, positions] of byTask) {
      const n = positions.length;
      if (n < EXTREME_MIN_N) continue; // even the extreme rule needs 3 answers to mean anything
      const count = new Map<number, number>();
      for (const p of positions) count.set(p, (count.get(p) ?? 0) + 1);
      let topKey = 0;
      let topN = 0;
      for (const [k, v] of count) if (v > topN) [topKey, topN] = [k, v];
      const share = topN / n;
      const binary = taskType === "TRUE_FALSE";
      const spread = n >= MIN_N && share > (binary ? BINARY_SKEW : CLUSTER);
      const extreme = share >= EXTREME_SKEW;
      const reason = spread ? "spread" : extreme ? "extreme" : null;
      rows.push({ section: `${e.slug}::${skill}`, taskType, n, share, top: `idx ${topKey}`, binary, reason });
    }
  }
}

const flagged = rows.filter((r) => r.reason !== null).sort((a, b) => b.share - a.share);

if (flagged.length > 0) {
  console.error(`\n✗ ANSWER-DISTRIBUTION GATE FAILED — ${flagged.length} of ${rows.length} objective sections are gameable from position.\n`);
  for (const r of flagged) {
    const rule = r.reason === "extreme" ? `extreme ≥80% @ n≥3` : r.binary ? "spread binary >75%" : "spread multi >60%";
    console.error(`  ${Math.round(r.share * 100)}% → ${r.top}   ${r.section}::${r.taskType}  (n=${r.n}, ${rule})`);
  }
  console.error(`\n  Fix: permute order-independent MCQ (deterministic, by title+index), author-balance CLOZE/TRUE_FALSE — preserve single-answer and decidability, never make an item wrong to satisfy a count.\n`);
  process.exit(1);
}

console.log(`✓ ANSWER-DISTRIBUTION GATE: ${rows.length} objective sections scanned; no gameable position pattern.`);
