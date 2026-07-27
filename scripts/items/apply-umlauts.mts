// APPLY the reviewed umlaut restorations to the telc/Goethe German bundles.
//
//   npx tsx scripts/items/apply-umlauts.mts            (dry run)
//   npx tsx scripts/items/apply-umlauts.mts --write    (part of the staged batch)
//
// Reads reports/umlaut-decided.json — the file beta-g reviewed — and does NOT re-run the
// classifier. Re-deriving spellings at write time would mean the bank could take a word
// nobody looked at, which is the entire reason the propose step is separate.
//
// REFUSES while any entry still starts with "?". Those are the ones the bank could not
// settle, and they are the ones that matter: Goethe must stay Goethe, and Gruezi is
// Grüezi rather than the Grüzi the rule generates. Applying 122 correct restorations and
// three wrong ones would leave the track looking finished and still wrong.
//
// Replacement is per WHOLE TOKEN and only inside string VALUES of the parsed JSON — never
// a text-level find-replace over the file, which would rewrite keys and slugs too.

import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "src", "data", "items");
const DECIDED = path.join(process.cwd(), "reports", "umlaut-decided.json");
const WRITE = process.argv.includes("--write");
const TARGET = (f: string) => f.startsWith("telc-goethe-german");

type Decision = { token: string; to: string; why: string; occurrences: number };
const decided: Decision[] = JSON.parse(fs.readFileSync(DECIDED, "utf8"));

const open = decided.filter((d) => d.to.trim().startsWith("?"));
if (open.length) {
  console.error(`REFUSING: ${open.length} token(s) are still marked "?" — undecided:`);
  for (const o of open.slice(0, 40)) console.error(`  ${o.token.padEnd(22)} → ${o.to}`);
  console.error(`\nEdit the "to" field in ${path.relative(process.cwd(), DECIDED)} and drop the "?".`);
  process.exit(2);
}

// A restoration that still contains ae/oe/ue where it was supposed to lose one is almost
// certainly an unedited placeholder. Better to stop than to write it.
const suspicious = decided.filter((d) => d.to !== d.token && /(?<![ae])(ae|oe|ue)/i.test(d.to));
if (suspicious.length) {
  console.error(`REFUSING: ${suspicious.length} restoration(s) still contain an un-restored sequence:`);
  for (const s of suspicious) console.error(`  ${s.token} → ${s.to}`);
  process.exit(2);
}

const changes = new Map(decided.filter((d) => d.to !== d.token).map((d) => [d.token, d.to]));
const applied = new Map<string, number>();

function fixString(s: string): string {
  return s.replace(/[A-Za-zÄÖÜäöüß]+/g, (w) => {
    const to = changes.get(w);
    if (!to) return w;
    applied.set(w, (applied.get(w) ?? 0) + 1);
    return to;
  });
}

/** Walks values only. Object KEYS are schema, not prose, and must not be rewritten. */
function walk(node: any): any {
  if (typeof node === "string") return fixString(node);
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(node)) out[k] = walk(v);
    return out;
  }
  return node;
}

const files = fs.readdirSync(DIR).filter(TARGET);
let touchedFiles = 0;
for (const f of files) {
  const full = path.join(DIR, f);
  const before = fs.readFileSync(full, "utf8");
  const after = `${JSON.stringify(walk(JSON.parse(before)), null, 2)}\n`;
  if (after === before) continue;
  touchedFiles++;
  if (WRITE) fs.writeFileSync(full, after, "utf8");
}

const unused = [...changes.keys()].filter((t) => !applied.has(t));
const total = [...applied.values()].reduce((a, b) => a + b, 0);

console.log(`${decided.length} reviewed token(s); ${changes.size} carry a change`);
console.log(`${total} occurrence(s) rewritten across ${touchedFiles}/${files.length} bundle(s)${WRITE ? " — WRITTEN" : ""}`);
for (const [from, to] of [...changes].slice(0, 12)) console.log(`  ${from.padEnd(22)} → ${to.padEnd(22)} ×${applied.get(from) ?? 0}`);
if (changes.size > 12) console.log(`  … ${changes.size - 12} more`);

// A decision that matched nothing means the bank moved under the review.
if (unused.length) {
  console.log(`\n${unused.length} reviewed token(s) matched NOTHING in the bundles:`);
  for (const u of unused.slice(0, 10)) console.log(`  ${u}`);
  console.log(`\nREFUSING: the bank has changed since the review — re-run propose-umlauts.mts.`);
  process.exit(1);
}

// Nothing may survive that still looks transliterated, or the fix is partial and the
// track goes out half-corrected.
const leftovers: string[] = [];
for (const f of files) {
  const text = WRITE ? fs.readFileSync(path.join(DIR, f), "utf8") : `${JSON.stringify(walk(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"))), null, 2)}\n`;
  for (const tok of new Set(text.match(/[A-Za-zÄÖÜäöüß]*(?<![ae])(?:ae|oe|ue)[A-Za-zÄÖÜäöüß]*/g) ?? [])) {
    const keep = decided.find((d) => d.to === tok && d.to === d.token);
    if (!keep && tok.toLowerCase() !== "question") leftovers.push(`${f}: ${tok}`);
  }
}
if (leftovers.length) {
  console.log(`\n${leftovers.length} token(s) still transliterated after the pass:`);
  for (const l of leftovers.slice(0, 10)) console.log(`  ${l}`);
  process.exit(1);
}
console.log(`\nNo transliterated token survives the pass.`);
if (!WRITE) console.log(`DRY — nothing written. Staged for the batch.`);
