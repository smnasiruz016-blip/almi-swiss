// ANSWER-DISTRIBUTION GATE — is the correct answer gameable from its position?
//
// The completion audit found the gamed-key signature across both fide flagships and
// every smaller objective bank: a learner who always picks the first MCQ option, or the
// first CLOZE choice, or "false" on every TRUE_FALSE, scores 80–99% knowing no German or
// French. No gate caught it — this is that gate. It is type-aware, mirroring the sibling
// goethe gate:
//   MULTI  (MCQ_SINGLE, CLOZE)   — POSITION CLUSTERING. No option index may hold more
//                                  than CLUSTER of the section's answers.
//   BINARY (TRUE_FALSE)          — BALANCE. Neither value (true/false) past BINARY_SKEW.
// MATCHING and ORDERING are not single-index gameable and are excluded.
//
// Scope = one served surface × taskType (`${exam.slug}::${skill}::${taskType}`) — the
// axis a learner actually practises. Reads the bundles by surface (itemsForSurface), the
// same unambiguous loader the rest of the engine uses.
//
// Run: npm run gate:answer-distribution

import { ALL_EXAMS } from "../../src/lib/ch/registry";
import { itemsForSurface } from "../../src/lib/ch/items";

const CLUSTER = 0.6; // a MULTI option index past this share is clustered
const BINARY_SKEW = 0.75; // a TRUE_FALSE value past this share is skewed
const MIN_N = 6; // too few answers below this to tell a pattern from chance

type Row = { section: string; taskType: string; n: number; share: number; top: string; binary: boolean };

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
      if (n < MIN_N) continue;
      const count = new Map<number, number>();
      for (const p of positions) count.set(p, (count.get(p) ?? 0) + 1);
      let topKey = 0;
      let topN = 0;
      for (const [k, v] of count) if (v > topN) [topKey, topN] = [k, v];
      rows.push({ section: `${e.slug}::${skill}`, taskType, n, share: topN / n, top: `idx ${topKey}`, binary: taskType === "TRUE_FALSE" });
    }
  }
}

const flagged = rows.filter((r) => r.share > (r.binary ? BINARY_SKEW : CLUSTER)).sort((a, b) => b.share - a.share);

if (flagged.length > 0) {
  console.error(`\n✗ ANSWER-DISTRIBUTION GATE FAILED — ${flagged.length} of ${rows.length} objective sections are gameable from position.\n`);
  for (const r of flagged) {
    console.error(`  ${Math.round(r.share * 100)}% → ${r.top}   ${r.section}::${r.taskType}  (n=${r.n}, ${r.binary ? "binary >75%" : "multi >60%"})`);
  }
  console.error(`\n  Fix: permute order-independent MCQ (deterministic, by title+index), author-balance CLOZE/TRUE_FALSE — preserve single-answer and decidability, never make an item wrong to satisfy a count.\n`);
  process.exit(1);
}

console.log(`✓ ANSWER-DISTRIBUTION GATE: ${rows.length} objective sections scanned; no gameable position pattern.`);
