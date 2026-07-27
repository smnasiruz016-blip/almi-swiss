// WRITE the reviewed CEFR levels onto the getting-started items.
//
//   npx tsx scripts/items/apply-cefr.mts            (dry run)
//   npx tsx scripts/items/apply-cefr.mts --write    (part of the staged batch)
//
// Reads reports/getting-started-cefr-decided.json — the file beta-g reviewed — and does
// NOT re-run the classifier. Re-deriving levels at write time would mean the bank could
// take a level nobody had looked at, which is the whole thing this two-step exists to
// prevent.
//
// Refuses on anything it cannot match exactly: a decision without an item, an item
// without a decision, or a level that is not A1 or A2. A partial application would leave
// the track half-levelled and looking finished.

import fs from "node:fs";
import path from "node:path";
import { readBundle, itemSpans, keyValueSpan, indentAt, spliceAll, assertFaithful } from "./json-text-edit.mjs";

const DIR = path.join(process.cwd(), "src", "data", "items");
const DECIDED = path.join(process.cwd(), "reports", "getting-started-cefr-decided.json");
const WRITE = process.argv.includes("--write");

type Decision = { surface: string; title: string; level: string; why: string };
const decided: Decision[] = JSON.parse(fs.readFileSync(DECIDED, "utf8"));
const byKey = new Map(decided.map((d) => [`${d.surface}|${d.title}`, d]));

const bad = decided.filter((d) => d.level !== "A1" && d.level !== "A2");
if (bad.length) {
  console.error(`REFUSING: ${bad.length} decision(s) are not a final level:`);
  for (const b of bad.slice(0, 5)) console.error(`  ${b.surface} · ${b.title} → ${b.level}`);
  process.exit(2);
}

const used = new Set<string>();
const changes: string[] = [];
const missing: string[] = [];
const files = fs.readdirSync(DIR).filter((f) => f.startsWith("getting-started"));

// The bundles are not written in one style — 17 of 34 are hand-formatted and do not
// round-trip through JSON.stringify — so re-serialising a whole file reformats it. These
// items have no `cefr` field at all, so each change is a single INSERTED key, placed
// after `difficulty` to match the field order every other bundle already uses.
let totalChangedLines = 0;
const perFile: Array<[string, number, number, number]> = [];

for (const f of files) {
  const full = path.join(DIR, f);
  const surface = f.replace("getting-started-", "").replace(".json", "");
  const { text, eol, items } = readBundle(full);
  const spans = itemSpans(text);
  const splices: Array<[number, number, string]> = [];
  let touched = false;

  for (const [idx, it] of items.entries()) {
    const key = `${surface}|${it.title}`;
    const d = byKey.get(key);
    if (!d) { missing.push(key); continue; }
    used.add(key);
    if (it.cefr === d.level) continue;
    changes.push(`${surface.padEnd(18)} ${d.level}  ${it.title}`);

    const existing = keyValueSpan(text, spans[idx][0], "cefr");
    if (existing) {
      splices.push([existing.valueStart, existing.valueEnd, JSON.stringify(d.level)]);
    } else {
      // Insert after `difficulty` if present, else after `taskType`, else as first key.
      const anchor = keyValueSpan(text, spans[idx][0], "difficulty") ?? keyValueSpan(text, spans[idx][0], "taskType");
      if (!anchor) throw new Error(`${f} item ${idx}: no anchor key to place cefr after`);
      const indent = indentAt(text, anchor.keyStart);
      let at = anchor.valueEnd;
      if (text[at] === ",") at++;
      splices.push([at, at, `${eol}${indent}"cefr": ${JSON.stringify(d.level)},`]);
    }
    it.cefr = d.level;
    touched = true;
  }

  if (!touched) continue;
  const out = spliceAll(text, splices);
  const { changedLines, added, removed } = assertFaithful(text, out, items, f);
  totalChangedLines += changedLines;
  perFile.push([f, splices.length, added, removed]);
  if (WRITE) fs.writeFileSync(full, out, "utf8");
}

const orphans = decided.filter((d) => !used.has(`${d.surface}|${d.title}`));

console.log(`${decided.length} reviewed decision(s), ${files.length} bundle(s)`);
console.log(`${changes.length} item(s) would take a level${WRITE ? " — WRITTEN" : ""}`);
const tally = new Map<string, number>();
for (const d of decided) tally.set(d.level, (tally.get(d.level) ?? 0) + 1);
for (const [k, v] of [...tally].sort()) console.log(`  ${k}: ${v}`);

if (missing.length) { console.log(`\n${missing.length} item(s) in the bank with NO decision:`); for (const m of missing.slice(0, 5)) console.log(`  ${m}`); }
if (orphans.length) { console.log(`\n${orphans.length} decision(s) with no matching item:`); for (const o of orphans.slice(0, 5)) console.log(`  ${o.surface} · ${o.title}`); }
if (missing.length || orphans.length) { console.log(`\nREFUSING to write a partial levelling.`); process.exit(1); }

console.log(`\nDIFF FOOTPRINT — surgical, existing formatting and line endings preserved`);
console.log(`  ${perFile.length} file(s) touched, ${totalChangedLines} line(s) added+removed in total`);
for (const [f, n, add, rem] of perFile) console.log(`    ${f.padEnd(40)} ${String(n).padStart(3)} insert(s)  +${add} -${rem}`);

if (!WRITE) console.log(`\nDRY — nothing written. Staged for the batch.`);
