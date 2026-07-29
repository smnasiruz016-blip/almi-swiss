// PROOF for the structural de-game, run in memory so nothing has to be written first.
//
//   npx tsx scripts/items/verify-degame.mts
//
// Permuting a key is only safe if it changes WHERE the answer sits and nothing about
// WHAT the answer is. Three things are checked for every one of the 37 items:
//
//   1. SEMANTICS PRESERVED. Before and after, the key must map the same left STRING to
//      the same right STRING — and the ordering key must name the same steps in the
//      same real sequence. Comparing indices would prove nothing; indices are exactly
//      what changed.
//   2. STILL GRADES. The product's own gradeObjective must award full marks to the
//      permuted key. Not the audit's opinion of grading — the code that runs in
//      production.
//   3. NO LONGER DEGENERATE. Diagonal share and in-place share must both fall below the
//      0.7 line the audit measured.

import fs from "node:fs";
import path from "node:path";
import { gradeObjective } from "../../src/lib/ch/grading";

const DIR = path.join(process.cwd(), "src", "data", "items");
const NEAR_DEGENERATE = 0.7;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function permutation(n: number, seed: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  let x = seed || 1;
  for (let i = n - 1; i > 0; i--) {
    x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function findPermutation(n: number, seed: number, ok: (p: number[]) => boolean): number[] | null {
  for (let attempt = 0; attempt < 64; attempt++) {
    const p = permutation(n, hash(`${seed}:${attempt}`));
    if (ok(p)) return p;
  }
  return null;
}
const inverseOf = (perm: number[]) => { const inv = new Array(perm.length); perm.forEach((o, n) => { inv[o] = n; }); return inv; };
const seedOf = (it: any) => [it.language, it.track, it.exam, it.skill, it.taskType, it.title].filter(Boolean).join("|");

let checked = 0, semanticsOk = 0, gradesOk = 0, degenBefore = 0, degenAfter = 0;
const problems: string[] = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  for (const it of JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")) as any[]) {
    if (it.taskType === "MATCHING") {
      const left: string[] = it.payload.left, right: string[] = it.payload.right;
      const pairs: [number, number][] = it.answer.pairs;
      if (!Array.isArray(right) || !Array.isArray(pairs) || pairs.length < 3) continue;
      checked++;
      if (pairs.filter(([l, r]) => l === r).length / pairs.length >= NEAR_DEGENERATE) degenBefore++;

      const before = pairs.map(([l, r]) => `${left[l]} => ${right[r]}`).sort();
      const perm = findPermutation(right.length, hash(seedOf(it)), (p) => {
        const inv = inverseOf(p);
        return pairs.filter(([l, r]) => l === inv[r]).length / pairs.length < NEAR_DEGENERATE;
      });
      if (!perm) { problems.push(`${it.title}: no permutation found`); continue; }
      const inv = inverseOf(perm);
      const newRight = perm.map((o) => right[o]);
      const newPairs = pairs.map(([l, r]) => [l, inv[r]] as [number, number]);
      const after = newPairs.map(([l, r]) => `${left[l]} => ${newRight[r]}`).sort();

      if (JSON.stringify(before) !== JSON.stringify(after)) problems.push(`${it.title}: the pairing CHANGED MEANING`);
      else semanticsOk++;

      const g = gradeObjective({ type: "MATCHING", pairs: newPairs } as any, { pairs: newPairs });
      if (g.points === g.maxPoints && g.maxPoints === newPairs.length) gradesOk++;
      else problems.push(`${it.title}: permuted key scores ${g.points}/${g.maxPoints}`);

      if (newPairs.filter(([l, r]) => l === r).length / newPairs.length >= NEAR_DEGENERATE) {
        degenAfter++; problems.push(`${it.title}: still degenerate after permuting`);
      }
    }

    if (it.taskType === "ORDERING") {
      const list: string[] = it.payload.items;
      const order: number[] = it.answer.order;
      if (!Array.isArray(list) || !Array.isArray(order) || order.length < 3) continue;
      checked++;
      const n = order.length;
      const shareOf = (o: number[]) => Math.max(o.filter((v, i) => v === i).length, o.filter((v, i) => v === n - 1 - i).length) / n;
      if (shareOf(order) >= NEAR_DEGENERATE) degenBefore++;

      const before = order.map((o) => list[o]);
      const perm = findPermutation(list.length, hash(seedOf(it)), (p) => shareOf(order.map((o) => inverseOf(p)[o])) < NEAR_DEGENERATE);
      if (!perm) { problems.push(`${it.title}: no permutation found`); continue; }
      const inv = inverseOf(perm);
      const newList = perm.map((o) => list[o]);
      const newOrder = order.map((o) => inv[o]);
      const after = newOrder.map((o) => newList[o]);

      if (JSON.stringify(before) !== JSON.stringify(after)) problems.push(`${it.title}: the step sequence CHANGED`);
      else semanticsOk++;

      const g = gradeObjective({ type: "ORDERING", order: newOrder } as any, { order: newOrder });
      if (g.points === g.maxPoints) gradesOk++;
      else problems.push(`${it.title}: permuted key scores ${g.points}/${g.maxPoints}`);

      if (shareOf(newOrder) >= NEAR_DEGENERATE) { degenAfter++; problems.push(`${it.title}: still degenerate`); }
    }
  }
}

console.log(`\n${checked} structural item(s) checked in memory\n`);
console.log(`  meaning preserved (same strings paired / same steps in sequence) : ${semanticsOk}/${checked}`);
console.log(`  permuted key scores full marks through the product's own grader  : ${gradesOk}/${checked}`);
console.log(`  degenerate BEFORE : ${degenBefore}/${checked}`);
console.log(`  degenerate AFTER  : ${degenAfter}/${checked}`);
if (problems.length) { console.log(`\n${problems.length} problem(s):`); for (const p of problems.slice(0, 10)) console.log(`  ${p}`); }
else console.log(`\nno problems.`);
process.exit(problems.length ? 1 : 0);
