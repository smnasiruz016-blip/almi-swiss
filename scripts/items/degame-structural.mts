// DE-GAME the structural keys: matching pairs and ordering sequences.
//
//   npx tsx scripts/items/degame-structural.mts            (dry run)
//   npx tsx scripts/items/degame-structural.mts --write
//
// All 37 structural items in this bank are answerable with no language at all: every
// MATCHING key pairs row n to row n, so "pair them straight down" scores 100%, and
// every ORDERING key is [0,1,2,…], so leaving the list exactly as printed scores 100%.
// The branch is called ch-degame-hardened; the de-gaming reached MCQ option positions
// and never touched these.
//
// PRESENTATION IS PERMUTED, NOT THE ANSWER. For matching, the right-hand column is
// reordered and each pair is rewritten to point at the same right-hand STRING it always
// did. For ordering, the printed list is reordered and the key is rewritten to name the
// same steps in the same real sequence. Nothing about which answer is correct changes —
// only where the correct answer sits, which is the whole of the defect.
//
// The permutation is derived from the item id, so a rerun produces the same bank and a
// diff is reviewable. Math.random would make this unreproducible and untestable.

import fs from "node:fs";
import path from "node:path";
import { readBundle, itemSpans, keyValueSpan, indentAt, renderLike, spliceAll, assertFaithful } from "./json-text-edit.mjs";

const WRITE = process.argv.includes("--write");
const DIR = path.join(process.cwd(), "src", "data", "items");
const NEAR_DEGENERATE = 0.7; // matches the audit suite's measured threshold

/** Deterministic 32-bit hash → a reproducible seed per item. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Seeded shuffle. Same seed, same permutation, forever. */
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

const diagonalShare = (pairs: [number, number][]) =>
  pairs.filter(([l, r]) => l === r).length / pairs.length;
const inPlaceShare = (order: number[]) => {
  const n = order.length;
  const fwd = order.filter((v, i) => v === i).length;
  const rev = order.filter((v, i) => v === n - 1 - i).length;
  return Math.max(fwd, rev) / n;
};

/** A permutation that leaves the key below the degeneracy line. Tries successive seeds
 *  rather than looping forever, and reports if it cannot find one. */
function findPermutation(n: number, seed: number, ok: (perm: number[]) => boolean): number[] | null {
  for (let attempt = 0; attempt < 64; attempt++) {
    const perm = permutation(n, hash(`${seed}:${attempt}`));
    if (ok(perm)) return perm;
  }
  return null;
}

type Item = {
  language?: string; track?: string; exam?: string; skill?: string;
  title?: string; taskType: string;
  payload: Record<string, unknown>;
  answer: Record<string, unknown>;
};

/** The seed has to be stable across runs and unique per item. Seeds carry no `id` —
 *  stable ids are derived later by the id gate — so the identity fields plus the title
 *  are what makes one item distinguishable from another. */
const seedOf = (it: Item) =>
  [it.language, it.track, it.exam, it.skill, it.taskType, it.title].filter(Boolean).join("|");

const changed: string[] = [];
const failed: string[] = [];
let matching = 0, ordering = 0;

let totalChangedLines = 0;
const perFile: Array<[string, number, number, number]> = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const full = path.join(DIR, file);
  const { text, eol, items } = readBundle(full) as { text: string; eol: "\r\n" | "\n"; items: Item[] };
  const spans = itemSpans(text);
  // [itemIndex, key] pairs whose VALUE this run rewrites. Only these spans are touched;
  // every other byte of the file — including whatever formatting style it is in — is
  // carried through untouched.
  const edits: Array<{ idx: number; key: string; container: "payload" | "answer" }> = [];
  let touched = false;

  for (const [idx, it] of items.entries()) {
    if (it.taskType === "MATCHING") {
      const right = it.payload.right as string[];
      const pairs = (it.answer as { pairs: [number, number][] }).pairs;
      if (!Array.isArray(right) || !Array.isArray(pairs) || pairs.length < 3) continue;
      matching++;
      // perm[k] = which OLD right index now sits at NEW index k.
      const perm = findPermutation(right.length, hash(seedOf(it)), (p) => {
        const inverse = new Array(right.length);
        p.forEach((oldIdx, newIdx) => { inverse[oldIdx] = newIdx; });
        return diagonalShare(pairs.map(([l, r]) => [l, inverse[r]] as [number, number])) < NEAR_DEGENERATE;
      });
      if (!perm) { failed.push(`${seedOf(it)} (matching, no non-degenerate permutation found)`); continue; }
      const inverse = new Array(right.length);
      perm.forEach((oldIdx, newIdx) => { inverse[oldIdx] = newIdx; });
      it.payload.right = perm.map((oldIdx) => right[oldIdx]);
      (it.answer as { pairs: [number, number][] }).pairs = pairs.map(([l, r]) => [l, inverse[r]]);
      changed.push(`${it.title ?? seedOf(it)} MATCHING`);
      edits.push({ idx, key: "right", container: "payload" }, { idx, key: "pairs", container: "answer" });
      touched = true;
    }

    if (it.taskType === "ORDERING") {
      const list = it.payload.items as string[];
      const order = (it.answer as { order: number[] }).order;
      if (!Array.isArray(list) || !Array.isArray(order) || order.length < 3) continue;
      ordering++;
      // perm[k] = which OLD item index now sits at NEW printed position k.
      const perm = findPermutation(list.length, hash(seedOf(it)), (p) => {
        const inverse = new Array(list.length);
        p.forEach((oldIdx, newIdx) => { inverse[oldIdx] = newIdx; });
        return inPlaceShare(order.map((o) => inverse[o])) < NEAR_DEGENERATE;
      });
      if (!perm) { failed.push(`${seedOf(it)} (ordering, no non-degenerate permutation found)`); continue; }
      const inverse = new Array(list.length);
      perm.forEach((oldIdx, newIdx) => { inverse[oldIdx] = newIdx; });
      it.payload.items = perm.map((oldIdx) => list[oldIdx]);
      (it.answer as { order: number[] }).order = order.map((o) => inverse[o]);
      changed.push(`${it.title ?? seedOf(it)} ORDERING`);
      edits.push({ idx, key: "items", container: "payload" }, { idx, key: "order", container: "answer" });
      touched = true;
    }
  }

  if (!touched) continue;

  // Surgery: replace only the four value spans per item, in their existing style.
  const splices: Array<[number, number, string]> = [];
  for (const { idx, key, container } of edits) {
    const outer = keyValueSpan(text, spans[idx][0], container);
    if (!outer) throw new Error(`${file} item ${idx}: no ${container} object`);
    const span = keyValueSpan(text, outer.valueStart, key);
    if (!span) throw new Error(`${file} item ${idx}: no ${container}.${key}`);
    const value = (items[idx] as any)[container][key];
    const original = text.slice(span.valueStart, span.valueEnd);
    splices.push([span.valueStart, span.valueEnd, renderLike(value, original, indentAt(text, span.keyStart), eol)]);
  }
  const out = spliceAll(text, splices);
  const { changedLines, added, removed } = assertFaithful(text, out, items, file);
  totalChangedLines += changedLines;
  perFile.push([file, edits.length / 2, added, removed]);

  if (WRITE) fs.writeFileSync(full, out, "utf8");
}

console.log(`${matching} matching + ${ordering} ordering item(s) examined`);
console.log(`${changed.length} permuted${WRITE ? " and written" : ""}`);
console.log(`\nDIFF FOOTPRINT — surgical, existing formatting and line endings preserved`);
console.log(`  ${perFile.length} file(s) touched, ${totalChangedLines} line(s) added+removed in total`);
for (const [f, n, add, rem] of perFile) console.log(`    ${f.padEnd(42)} ${String(n).padStart(2)} item(s)  +${add} -${rem}`);
if (failed.length) { console.log(`\n${failed.length} could not be permuted:`); for (const f of failed) console.log(`  ${f}`); }
if (!WRITE) console.log(`\nDRY — nothing written. Pass --write to apply.`);
