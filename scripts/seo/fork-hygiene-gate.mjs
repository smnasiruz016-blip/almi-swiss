// Build-time FORK HYGIENE GATE — the AlmiWorld §7 rule, enforced instead of trusted.
//
// WHY THIS EXISTS. This repo's lineage is:
//   almi-celpip → almi-goethe → almi-icelandic → almi-danish → almi-norwegian → almi-swedish
// and every hop leaked the previous country's facts into user-facing copy. Real
// examples found live in production, not hypotheticals:
//   • almi-norwegian shipped `DK_UNIS = "the University of Copenhagen, Aarhus
//     University and other NORWEGIAN universities"` — Danish universities asserted
//     as Norwegian, on roughly a third of the study matrix.
//   • It cited "the Norwegian Patient Safety Authority, Styrelsen for
//     Patientsikkerhed" — Denmark's regulator — telling healthcare applicants to
//     seek authorisation from the wrong country's authority.
//   • It named "the University of Southern Norway", a FABRICATED institution
//     produced by find-replacing "Denmark"→"Norway" in "University of Southern
//     Denmark".
//   • Its listening module called ttsLang() → "is-IS": every Norwegian transcript
//     read aloud in an ICELANDIC voice, inherited from almi-icelandic.
//
// The lesson: a grep for the previous country's nouns is NOT enough, because the
// dangerous cases are the ones where the LABEL was localized and the FACT was not
// ("...and other Norwegian universities" passes a "Norway" grep). So this gate
// bans the ancestors' proper nouns outright — any occurrence is a leak, since a
// Swedish product has no reason to name Norwegian exams or Danish agencies.
//
// Runs before the build and FAILS it on any hit. If a future fork descends from
// this repo, update BANNED to add Swedish nouns and keep the ancestors listed.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "scripts", "prisma"];
const SCAN_EXT = /\.(ts|tsx|js|mjs|json|prisma|css|md)$/;

// Files allowed to mention an ancestor noun, with the reason. Kept deliberately
// tiny — every entry is a hole in the gate.
const ALLOWLIST = new Map([
  // The family nav legitimately links to sibling products by name.
  ["src/lib/nav/family.ts", "links to sibling AlmiWorld products by name"],
  // This gate documents the exact leaks it prevents.
  ["scripts/seo/fork-hygiene-gate.mjs", "documents the banned nouns"],
  // REAL-WORLD REFERENCE DATA, not authored copy. Norway/Denmark/Iceland are
  // legitimate ORIGIN countries for a Swedish product (someone really can move
  // from Norway to Sweden), universities.json lists institutions worldwide as
  // origin references, and Malmö's hub profile correctly mentions the Öresund
  // link to Copenhagen. These axes are imported, not written — the fork risk
  // lives in the prose that consumes them, which is NOT allowlisted.
  ["src/data/seo/countries.json", "Norway/Denmark are valid origin countries"],
  ["src/data/seo/universities.json", "worldwide origin institutions"],
  ["src/data/seo/hubs.json", "Malmö genuinely borders Denmark via the Öresund Bridge"],
]);

// Per-line escape for prose that must NAME an ancestor to warn about it (e.g. the
// comments documenting the DK_UNIS leak). Deliberately verbose so it shows up in
// review: a line carrying this marker is asserting "I mean this on purpose".
const LINE_ESCAPE = "hygiene-allow";

// Ancestor proper nouns. A Swedish product naming any of these is a fork leak.
const BANNED = [
  // — Norwegian —
  "Norskprøven", "Norskprøve", "Norskprov", "norskprove",
  "Bergenstesten", "Bergenstest",
  "Statsborgerprøven", "Statsborgerprove",
  "Samfunnskunnskapsprøven", "Samfunnskunnskap",
  "Utlendingsdirektoratet", "HK-dir",
  "Leseforståelse", "Lytteforståelse", "Skriftlig framstilling",
  "Norge", "Norwegian", "Norway",
  "nb-NO", "nn-NO",
  // — Danish —
  "Prøve i Dansk", "Indfødsretsprøven", "Studieprøven",
  "Styrelsen for Patientsikkerhed", "Styrelsen for International Rekruttering",
  "Læsning", "Lytning", "Skrivning",
  "Danmark", "Danish", "Denmark",
  "da-DK",
  // — Icelandic —
  "Ríkisborgarapróf", "Útlendingastofnun", "Háskóli Íslands",
  "Iceland", "Icelandic",
  "is-IS",
  // — Earlier ancestors (German / Portuguese / Dutch / CELPIP) —
  "Goethe-Institut", "AlmiGoethe", "Schreiben", "Sprechen",
  "CAPLE", "Celpe-Bras", "AlmiPortuguese",
  "AlmiCELPIP", "AlmiDanish", "AlmiNorwegian", "AlmiIcelandic",
  "almi-danish", "almi-norwegian", "almi-icelandic",
];

// `SIRI` and `UDI` need word boundaries — they collide with ordinary substrings.
const BANNED_WORD = ["UDI", "SIRI"];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === "node_modules" || e === ".next" || e === ".git") continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCAN_EXT.test(e)) out.push(full);
  }
  return out;
}

const violations = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (ALLOWLIST.has(rel)) continue;
    const text = readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);

    lines.forEach((line, i) => {
      if (line.includes(LINE_ESCAPE)) return;
      for (const term of BANNED) {
        if (line.includes(term)) {
          violations.push(`${rel}:${i + 1}  banned ancestor noun "${term}"\n      ${line.trim().slice(0, 120)}`);
        }
      }
      for (const term of BANNED_WORD) {
        if (new RegExp(`\\b${term}\\b`).test(line)) {
          violations.push(`${rel}:${i + 1}  banned ancestor noun "${term}"\n      ${line.trim().slice(0, 120)}`);
        }
      }
    });
  }
}

if (violations.length) {
  console.error("\n✗ FORK HYGIENE GATE FAILED — ancestor-country content found.\n");
  console.error("  Sweden must read as Sweden. These are leaks from the fork lineage");
  console.error("  (celpip → goethe → icelandic → danish → norwegian → swedish).\n");
  for (const v of violations) console.error(`  ${v}`);
  console.error(`\n  ${violations.length} violation(s). Fix the FACT, not just the label —`);
  console.error("  the worst leaks are the ones where only the country word was swapped.\n");
  process.exit(1);
}

console.log(`✓ Fork hygiene gate: clean (no ancestor-country nouns across ${SCAN_DIRS.join(", ")}).`);
