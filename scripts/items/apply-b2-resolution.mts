// WRITE the reviewed B2 resolution onto the fide CITIZENSHIP (DE) bank.
//
//   npx tsx scripts/items/apply-b2-resolution.mts            (dry run)
//   npx tsx scripts/items/apply-b2-resolution.mts --write
//
// THE FINDING. fide ceilings at B1 — the registry advertises it as A1–B1, and
// goalCefrFor(FIDE, SPEAKING) is B1, the federal spoken minimum for naturalisation.
// The German speaking bundle nevertheless held 20 items declaring cefr B2. Nothing
// caught it: verify-items requires a level on a surface that declares a goal, but it
// never compares the level TO the goal, so "above the ceiling" was unrepresentable.
//
// THE RESOLUTION (beta-g reviewed, Nasir GREEN):
//   • 18 "Vermitteln" mediation items → B1. Their topics and lexis were always B1
//     (a laundry rota, a bike room, a barking dog); only the neutral-mediator framing
//     read as B2, and that framing is not what fide tests.
//   • 4 of those 18 carry more argumentative load than the rest — competing
//     entitlements, a contested fact, a norm-vs-preference asymmetry, an excuse and
//     its rebuttal. They are B1 AND tagged seedFor B2.
//   • 2 items are genuinely B2 (chairing a formal multi-party discussion) and have no
//     fide home. They are WITHHELD, never deleted, with the reason in the bank.
//
// Reads reports/fide-de-b2-decided.json and does NOT re-classify. Re-deriving a level
// at write time would let the bank take a level nobody looked at — the thing this
// two-step exists to prevent.
//
// WHY IT ABORTS RATHER THAN HALF-APPLIES: every check runs, and every edit is computed,
// before a single byte is written. A bank left half-relevelled is worse than one left
// wrong, because it looks finished.
//
// SEEN RED (each guard was proven to fire before this script was trusted):
//   • point a decision id at an item whose cefr is B1  → "is not B2" abort
//   • delete one decision from the file                → "undecided B2 item" abort
//   • change a decision id by one character            → "matched 0 items" abort

import fs from "node:fs";
import path from "node:path";
import { readBundle, itemSpans, keyValueSpan, indentAt, spliceAll, assertFaithful } from "./json-text-edit.mjs";

const DIR = path.join(process.cwd(), "src", "data", "items");
const DECIDED = path.join(process.cwd(), "reports", "fide-de-b2-decided.json");
const WRITE = process.argv.includes("--write");

// The scope this script is allowed to touch. An item outside it is a mis-targeted id,
// not a surprise to absorb.
const SCOPE = { language: "DE", track: "CITIZENSHIP", exam: "FIDE" } as const;
const CEILING = "B1"; // fide's top level, and the goal for CITIZENSHIP speaking.

type Decision = {
  id: string;
  surface: string;
  index: number;
  title: string;
  fromCefr: string;
  action: "RELEVEL" | "DEACTIVATE";
  toCefr?: string;
  seedFor?: string;
  withheldReason?: string;
  why: string;
};

type Item = Record<string, unknown> & {
  language: string; track: string; exam: string; skill: string;
  title: string; cefr?: string; active?: boolean; withheldReason?: string; seedFor?: string;
};

function stableItemId(it: Item): string {
  const s = `${it.language}|${it.track}|${it.exam}|${it.skill}|${it.title}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

function abort(msg: string, detail: string[] = []): never {
  console.error(`\n✗ REFUSING TO APPLY — ${msg}`);
  for (const d of detail) console.error(`    ${d}`);
  console.error(`\n  Nothing written. The bank is unchanged.\n`);
  process.exit(1);
}

// ── 1. THE DECISION FILE IS WELL-FORMED ─────────────────────────────────────
const decided: Decision[] = JSON.parse(fs.readFileSync(DECIDED, "utf8"));

const dupes = decided.map((d) => d.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dupes.length) abort(`the decision file names the same id twice`, dupes);

for (const d of decided) {
  if (d.action !== "RELEVEL" && d.action !== "DEACTIVATE") abort(`unknown action "${d.action}"`, [d.id]);
  if (d.fromCefr !== "B2") abort(`a decision claims to start from "${d.fromCefr}", not B2`, [`${d.id} · ${d.title}`]);
  if (d.action === "RELEVEL" && d.toCefr !== CEILING) {
    abort(`a re-level targets "${d.toCefr}" — only ${CEILING} is a level fide can award`, [`${d.id} · ${d.title}`]);
  }
  if (d.action === "DEACTIVATE" && !d.withheldReason?.trim()) {
    abort(`an item would be withheld with no reason recorded in the bank`, [`${d.id} · ${d.title}`]);
  }
  if (d.seedFor !== undefined && d.seedFor !== "B2") abort(`unexpected seedFor "${d.seedFor}"`, [d.id]);
}

// ── 2. EVERY DECISION MATCHES EXACTLY ONE ITEM, AND THAT ITEM IS B2 IN SCOPE ─
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
const bank: Array<{ file: string; idx: number; it: Item }> = [];
for (const f of files) {
  for (const [idx, it] of (JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Item[]).entries()) {
    bank.push({ file: f, idx, it });
  }
}

const byId = new Map<string, Decision>(decided.map((d) => [d.id, d]));
const hits = new Map<string, Array<{ file: string; idx: number; it: Item }>>();
for (const row of bank) {
  const id = stableItemId(row.it);
  if (byId.has(id)) (hits.get(id) ?? hits.set(id, []).get(id)!).push(row);
}

const problems: string[] = [];
for (const d of decided) {
  const found = hits.get(d.id) ?? [];
  if (found.length !== 1) { problems.push(`${d.id} · ${d.title} — matched ${found.length} items, expected 1`); continue; }
  const { it, file } = found[0];
  // A mis-targeted id must fail loudly, not quietly re-level something already correct.
  if (it.cefr !== "B2") problems.push(`${d.id} · ${it.title} — current cefr is ${it.cefr ?? "(none)"}, not B2`);
  if (it.language !== SCOPE.language || it.track !== SCOPE.track || it.exam !== SCOPE.exam) {
    problems.push(`${d.id} · ${it.title} — outside scope (${it.language}/${it.track}/${it.exam}) in ${file}`);
  }
}
if (problems.length) abort(`${problems.length} decision(s) do not match the bank`, problems);

// ── 3. NO B2 ITEM IN SCOPE IS LEFT UNDECIDED ────────────────────────────────
const strays = bank
  .filter(({ it }) => it.cefr === "B2" && it.language === SCOPE.language && it.track === SCOPE.track && it.exam === SCOPE.exam)
  .filter(({ it }) => !byId.has(stableItemId(it)));
if (strays.length) {
  abort(`${strays.length} B2 item(s) in FIDE::CITIZENSHIP::DE have no decision`, strays.map((s) => `${s.file} #${s.idx} · ${s.it.title}`));
}

// ── 4. COMPUTE EVERY EDIT BEFORE WRITING ANY OF THEM ────────────────────────
const touchedFiles = [...new Set(decided.map((d) => `${d.surface}.json`))];
const planned: Array<{ file: string; full: string; out: string; text: string; items: Item[]; n: number }> = [];
const lines: string[] = [];

for (const file of touchedFiles) {
  const full = path.join(DIR, file);
  const { text, eol, items } = readBundle(full) as { text: string; eol: "\r\n" | "\n"; items: Item[] };
  const spans = itemSpans(text);
  const splices: Array<[number, number, string]> = [];
  let n = 0;

  for (const [idx, it] of items.entries()) {
    const d = byId.get(stableItemId(it));
    if (!d) continue;

    const cefrSpan = keyValueSpan(text, spans[idx][0], "cefr");
    if (!cefrSpan) abort(`${file} item ${idx}: no cefr key to edit`, [it.title]);
    const indent = indentAt(text, cefrSpan.keyStart);

    // Status keys are inserted directly after `cefr`, so a withheld item reads as one
    // block: what level it is, that it is not served, why, and what it is kept for.
    const inserts: Array<[string, unknown]> = [];

    if (d.action === "RELEVEL") {
      splices.push([cefrSpan.valueStart, cefrSpan.valueEnd, JSON.stringify(d.toCefr)]);
      it.cefr = d.toCefr;
      if (d.seedFor) { inserts.push(["seedFor", d.seedFor]); it.seedFor = d.seedFor; }
      lines.push(`  ${d.id.padEnd(8)} B2 → ${d.toCefr}${d.seedFor ? "  [seedFor B2]" : "            "}  ${it.title}`);
    } else {
      // cefr STAYS B2: the item IS B2, which is precisely why fide cannot serve it.
      inserts.push(["active", false], ["withheldReason", d.withheldReason], ["seedFor", d.seedFor ?? "B2"]);
      it.active = false;
      it.withheldReason = d.withheldReason;
      it.seedFor = d.seedFor ?? "B2";
      lines.push(`  ${d.id.padEnd(8)} WITHHELD (stays B2, seedFor B2)  ${it.title}`);
    }

    if (inserts.length) {
      let at = cefrSpan.valueEnd;
      if (text[at] === ",") at++;
      splices.push([at, at, inserts.map(([k, v]) => `${eol}${indent}${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("")]);
    }
    n++;
  }

  const out = spliceAll(text, splices);
  assertFaithful(text, out, items, file); // edited TEXT must parse to the intended graph
  planned.push({ file, full, out, text, items, n });
}

const applied = planned.reduce((t, p) => t + p.n, 0);
if (applied !== decided.length) abort(`planned ${applied} edit(s) for ${decided.length} decision(s)`);

// ── 5. POST-STATE, ASSERTED ON THE PROJECTED BANK BEFORE IT IS WRITTEN ───────
function auditScope(itemsByFile: Map<string, Item[]>): { b1: number; seeds: number; withheld: number; servedB2: number; rawB2: number } {
  let b1 = 0, seeds = 0, withheld = 0, servedB2 = 0, rawB2 = 0;
  for (const [, items] of itemsByFile) {
    for (const it of items) {
      if (!byId.has(stableItemId(it))) continue;
      const served = it.active !== false;
      if (it.cefr === "B2") { rawB2++; if (served) servedB2++; }
      if (it.cefr === CEILING && served) b1++;
      if (it.seedFor === "B2") seeds++;
      if (!served) {
        withheld++;
        if (!it.withheldReason?.trim()) abort(`a withheld item carries no reason`, [it.title]);
      }
    }
  }
  return { b1, seeds, withheld, servedB2, rawB2 };
}

const projected = new Map<string, Item[]>(planned.map((p) => [p.file, JSON.parse(p.out) as Item[]]));
const post = auditScope(projected);
if (post.servedB2 !== 0) abort(`${post.servedB2} SERVED item(s) would still sit at B2 in FIDE::CITIZENSHIP::DE`);
if (post.b1 !== 18) abort(`expected 18 items at ${CEILING}, projected ${post.b1}`);
if (post.withheld !== 2) abort(`expected 2 withheld items, projected ${post.withheld}`);
if (post.seeds !== 6) abort(`expected 6 seedFor-B2 tags (4 upper-B1 + 2 withheld), projected ${post.seeds}`);

// ── 6. REPORT, THEN WRITE ───────────────────────────────────────────────────
console.log(`${decided.length} reviewed decision(s) · scope FIDE::CITIZENSHIP::DE`);
console.log(lines.sort().join("\n"));

console.log(`\nPROJECTED STATE (scope, decided items only)`);
console.log(`  served at ${CEILING}:            ${post.b1}`);
console.log(`  of those, seedFor B2:     4`);
console.log(`  withheld (active:false):  ${post.withheld}   — still cefr B2 in the file, not served`);
console.log(`  seedFor B2 in total:      ${post.seeds}`);
console.log(`  SERVED at B2:             ${post.servedB2}`);

console.log(`\nDIFF FOOTPRINT — surgical, existing formatting and line endings preserved`);
for (const p of planned) {
  const { added, removed } = assertFaithful(p.text, p.out, p.items, p.file);
  console.log(`  ${p.file.padEnd(34)} ${String(p.n).padStart(3)} item(s)  +${added} -${removed}`);
}

if (!WRITE) {
  console.log(`\nDRY — nothing written.`);
  process.exit(0);
}

for (const p of planned) fs.writeFileSync(p.full, p.out, "utf8");
console.log(`\n✓ WRITTEN to ${planned.length} bundle(s).`);
