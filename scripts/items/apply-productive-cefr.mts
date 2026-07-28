// LEVEL the productive items on the certificate tracks (DELF_TCF::FR, TELC_GOETHE::DE).
//
//   npx tsx scripts/items/apply-productive-cefr.mts            (dry run)
//   npx tsx scripts/items/apply-productive-cefr.mts --write    (Nasir's GREEN only)
//
// Reads reports/productive-cefr-decided.json and does NOT re-derive a level. Same
// two-step as apply-cefr.mts: deciding is a reviewed, diffable data file; applying is a
// mechanical write. A script that inferred the level at write time could put a level in
// the bank that nobody had looked at.
//
// WHY THESE ITEMS HAVE NO LEVEL YET. 60 productive items ship with `cefr` unset, and a
// grader must judge each task at ITS OWN declared level — the exam's label is a RANGE
// ("A1–B1") and a range is not a standard. So these must be levelled BEFORE productive
// grading can cover them, and until then they are excluded rather than defaulted.
//
// LEVEL BY TASK TYPE, NEVER BY LENGTH. `difficulty` is a ladder INSIDE a module and
// crosses levels freely; charBand/minSeconds corroborate but never decide. That is the
// same rule grading.ts states for the level-crossing split, and it changed two calls
// here: a 50-second "disagree and justify" is B1 because sustaining a differing position
// is the B1 interactive act, and three 180–380-character "Kurze Nachricht" items are
// Goethe B1 Teil 3 — a short PART of a B1 exam, not A2 tasks.

import fs from "node:fs";
import path from "node:path";
import { readBundle, itemSpans, keyValueSpan, indentAt, spliceAll, assertFaithful } from "./json-text-edit.mjs";

const DIR = path.join(process.cwd(), "src", "data", "items");
const DECIDED = path.join(process.cwd(), "reports", "productive-cefr-decided.json");
const WRITE = process.argv.includes("--write");

type Verdict = { cefr: string; why: string };
const decided = JSON.parse(fs.readFileSync(DECIDED, "utf8")) as {
  decided: string; by: string; rule: string;
  sources: Record<string, string>; verdicts: Record<string, Verdict>;
};

const LEVELS = new Set(["A1", "A2", "B1"]);
const bad = Object.entries(decided.verdicts).filter(([, v]) => !LEVELS.has(v.cefr));
if (bad.length) {
  console.error(`REFUSING: ${bad.length} verdict(s) are not a level this track awards:`);
  for (const [k, v] of bad.slice(0, 5)) console.error(`  ${k} → ${v.cefr}`);
  process.exit(2);
}

const used = new Set<string>();
const changes: string[] = [];
const already: string[] = [];
const conflicts: string[] = [];
let totalAdded = 0;
const perFile: Array<[string, number, number]> = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const full = path.join(DIR, file);
  const { text, eol, items } = readBundle(full);
  const spans = itemSpans(text);
  const splices: Array<[number, number, string]> = [];
  let touched = false;

  for (const [idx, it] of items.entries()) {
    const v = decided.verdicts[`${file}|${it.title}`];
    if (!v) continue;
    used.add(`${file}|${it.title}`);
    if (it.cefr === v.cefr) { already.push(`${file}|${it.title}`); continue; }
    if (it.cefr) {
      // An item that ALREADY declares a level is not silently re-levelled here.
      conflicts.push(`${file}|${it.title}: bank says ${it.cefr}, decided says ${v.cefr}`);
      continue;
    }
    changes.push(`${file.padEnd(34)} ${v.cefr}  ${it.title}`);

    const existing = keyValueSpan(text, spans[idx][0], "cefr");
    if (existing) {
      splices.push([existing.valueStart, existing.valueEnd, JSON.stringify(v.cefr)]);
    } else {
      // After `difficulty`, matching the field order every other bundle uses.
      const anchor = keyValueSpan(text, spans[idx][0], "difficulty") ?? keyValueSpan(text, spans[idx][0], "taskType");
      if (!anchor) throw new Error(`${file} item ${idx}: no anchor key to place cefr after`);
      const indent = indentAt(text, anchor.keyStart);
      let at = anchor.valueEnd;
      if (text[at] === ",") at++;
      splices.push([at, at, `${eol}${indent}"cefr": ${JSON.stringify(v.cefr)},`]);
    }
    it.cefr = v.cefr;
    touched = true;
  }

  if (!touched) continue;
  const out = spliceAll(text, splices);
  const { added, removed } = assertFaithful(text, out, items, file);
  totalAdded += added;
  perFile.push([file, splices.length, added]);
  if (removed !== 0) throw new Error(`${file}: levelling removed ${removed} line(s) — expected inserts only`);
  if (WRITE) fs.writeFileSync(full, out, "utf8");
}

const orphans = Object.keys(decided.verdicts).filter((k) => !used.has(k));

console.log(`${Object.keys(decided.verdicts).length} reviewed verdict(s) — decided ${decided.decided} by ${decided.by}`);
console.log(`${changes.length} item(s) would take a level${WRITE ? " — WRITTEN" : ""}`);
const tally = new Map<string, number>();
for (const v of Object.values(decided.verdicts)) tally.set(v.cefr, (tally.get(v.cefr) ?? 0) + 1);
for (const [k, n] of [...tally].sort()) console.log(`  ${k}: ${n}`);
console.log(`already at the decided level: ${already.length}`);

if (conflicts.length) {
  console.error(`\n${conflicts.length} CONFLICT(S) — the bank already declares a different level:`);
  for (const c of conflicts) console.error(`  ✗ ${c}`);
  console.error(`  Re-levelling an item that already has a level is a separate decision. REFUSING.`);
  process.exit(1);
}
if (orphans.length) {
  console.error(`\n${orphans.length} verdict(s) matched NO item — a decision about nothing:`);
  for (const o of orphans.slice(0, 8)) console.error(`  ✗ ${o}`);
  console.error(`  REFUSING to write a partial levelling.`);
  process.exit(1);
}

console.log(`\nDIFF FOOTPRINT — surgical, existing formatting and line endings preserved`);
console.log(`  ${perFile.length} file(s) touched, +${totalAdded} line(s)`);
for (const [f, n, add] of perFile) console.log(`    ${f.padEnd(36)} ${String(n).padStart(3)} insert(s)  +${add}`);

if (!WRITE) console.log(`\nDRY — nothing written. Nasir's GREEN required for --write.`);
