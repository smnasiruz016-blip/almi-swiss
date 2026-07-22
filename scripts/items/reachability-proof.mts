// REACHABILITY PROOF — over the bundles. No database, no credentials.
//
// Swiss serves items from src/data/items/*.json; nothing writes SwissItem. So the
// bundles ARE the bank, and proving reachability over them proves it for production.
//
// Proves what "it typechecks" does not:
//   1. NO REPEAT WITHIN A RUN — a single run never serves the same item twice.
//   2. THE BANK IS REACHABLE — across runs, every item can be served. Before the
//      seed was wired, pickPractice returned pool.slice(0, n): the same first 8
//      objective / 4 productive items forever, so 1182 of 1390 items could not be
//      reached by any route through the UI.
//
// It calls the SHIPPED pickPractice(), not a copy of its logic. A proof that
// re-implements the thing it checks proves nothing about the thing that ships.
//
// Run: npx tsx scripts/items/reachability-proof.mts

import { ALL_EXAMS } from "../../src/lib/ch/registry";
import { itemsForSurface, pickPractice } from "../../src/lib/ch/items";
import { isFreeSkill } from "../../src/lib/ch/types";

/** Enough runs that the coupon-collector tail is covered for a 125-item pool served
 *  4 at a time. Deterministic seeds so the proof is reproducible. */
const RUNS = 4000;

let built = 0;
let reachableNow = 0;
let reachableBefore = 0;
let withinRunRepeats = 0;
let shortRuns = 0;
const stubborn: string[] = [];

for (const e of ALL_EXAMS) {
  for (const skill of e.skills) {
    const pool = itemsForSurface(e, skill);
    if (pool.length === 0) continue;
    built += pool.length;

    const objective = isFreeSkill(skill);
    const n = objective ? 8 : 4;

    // BEFORE: no seed → pool.slice(0, n), identical every time.
    reachableBefore += Math.min(pool.length, n);

    // AFTER: a different seed per run, as runSeed() produces in production.
    const seen = new Set<string>();
    for (let r = 0; r < RUNS; r++) {
      const run = pickPractice(e, skill, n, r * 2654435761);
      if (run.length !== Math.min(pool.length, n)) shortRuns++;

      const inRun = new Set<string>();
      for (const it of run) {
        if (inRun.has(it.title)) withinRunRepeats++;
        inRun.add(it.title);
        seen.add(it.title);
      }
    }
    reachableNow += seen.size;
    if (seen.size !== pool.length) {
      stubborn.push(`${e.slug} ${skill}: ${seen.size} of ${pool.length} seen in ${RUNS} runs`);
    }
  }
}

const pct = (x: number) => `${((x / built) * 100).toFixed(1)}%`;

console.log("── 1. NO REPEAT WITHIN A RUN ──");
console.log(`  runs simulated per surface:   ${RUNS}`);
console.log(`  within-run repeats:           ${withinRunRepeats}`);
console.log(`  short runs (fewer than n):    ${shortRuns}`);

console.log("\n── 2. REACHABILITY ──");
console.log(`  BEFORE (no seed, slice(0,n)): ${reachableBefore} / ${built}  (${pct(reachableBefore)})`);
console.log(`  AFTER  (per-run seed):        ${reachableNow} / ${built}  (${pct(reachableNow)})`);
console.log(`  items unlocked:               +${reachableNow - reachableBefore}`);
if (stubborn.length) {
  console.log("\n  surfaces not fully covered:");
  for (const s of stubborn) console.log(`    ${s}`);
}

const ok = withinRunRepeats === 0 && shortRuns === 0 && reachableNow === built;
console.log(`\n${ok ? "✓ PROOF PASSED" : "✗ PROOF FAILED"}`);
process.exit(ok ? 0 : 1);
