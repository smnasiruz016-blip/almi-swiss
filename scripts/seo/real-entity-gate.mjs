// Real-entity gate — no invented document may be signed by a real COMPANY.
//
// Run: npm run gate:real-entity   (also wired into `build`)
//
// WHY
//
// Our items ARE fabrications: invented letters, invented phone calls, invented
// notices. That is legitimate — until one is signed with a real company's name. Then
// it stops being a practice task and becomes words put in that company's mouth.
//
// Twice now, and a person caught it both times, not a check:
//   * PR#11 — two reading tasks signed invented insurance letters "Helvetia Kranken AG"
//     and "Helvetia Santé SA". Helvetia is a real Swiss insurer (1858, Basel). The
//     amounts were CORRECT — CHF 300 franchise, 10% Selbstbehalt — which is exactly why
//     it survived: the fact-check passes, and the fact-check is not what is wrong.
//   * 2026-07-17 — an invented notice for a "Repair-Café", a real trademarked name.
//
// No other gate can see this: every word is allowed. fork-hygiene hunts ANCESTOR
// nouns; this hunts REAL-WORLD COMMERCIAL ones. Different failure, different list.
//
// 🔴 THIS IS A REGRESSION GUARD, NOT A COMPLETENESS CHECK.
//
// A green run means "none of the names we already got wrong, or already thought of,
// is in the bank". It does NOT mean no real company is named — there are thousands,
// and this list has 40-odd. The next unknown entity will be caught by READING the
// item, exactly as both of these were. Do not let this gate stand in for that, and do
// not treat the list as the definition of the rule. The rule is: an invented document
// names no real company. When reading turns up a new one, add it here so it can never
// come back — that is all this file is for.
//
// AUTHORITIES ARE NOT ON THIS LIST, ON PURPOSE. SEM, fide, telc, Goethe, "die
// Gemeinde", "der Kanton", "die Einwohnerdienste" are named deliberately and correctly
// — the bank's whole civic discipline is to attribute claims to a document or an
// authority. Only COMMERCIAL entities are blocked: insurers, banks, retailers,
// telecoms, transport, trademarked programmes.

import fs from "node:fs";
import path from "node:path";

// Unambiguous brands: the word is the company, so a bare match is enough.
const BRANDS = [
  "Helsana", "Swica", "SWICA", "Baloise", "Atupri", "ÖKK", "EGK", "Agrisano", "Aquilana",
  "Vaudoise", "AXA", "Allianz", "Generali",
  "UBS", "PostFinance", "Raiffeisen", "ZKB", "Zürcher Kantonalbank", "Credit Suisse",
  "Migros Bank", "Migros", "Coop", "Denner", "Manor", "Aldi", "Lidl",
  "Swisscom", "Sunrise",
  "SBB", "CFF", "FFS",
  "Klubschule Migros", "Repair Café", "Repair-Café", "Repair Cafe", "Repair-Cafe",
  "Groupe Mutuel",
];

// Names that are ALSO ordinary words. These fire ONLY next to a corporate marker, or in
// sender form ("die <Name>"). Without that rule the gate produces noise and gets
// ignored — an ignored gate is worse than none, because it reads as coverage:
//   * "Mobiliar"  = furnishings — a Wohnungsabnahme item may say "das Mobiliar".
//   * "Helvetia"  = the national personification (Confoederatio Helvetica → CH).
//   * "Concordia" = concord; also a real university elsewhere.
//   * "Sanitas"/"Visana"/"Assura"/"Sympany"/"CSS"/"KPT" = look like words/initialisms.
const COMMON_WORD_BRANDS = [
  "Helvetia", "CSS", "Concordia", "Sanitas", "Visana", "Assura", "Sympany", "Mobiliar",
  "KPT",
];

// What makes a mention corporate rather than ordinary.
const CORPORATE_MARKER = /\b(AG|SA|SAGL|GmbH|Versicherung(?:en)?|Krankenkasse|Krankenversicherung|Kasse|Bank|Gruppe|Assurance|Assicurazione)\b/u;
const SENDER_FORM = /\b[Dd]ie\s*$/u;

const ESCAPE = "real-entity-allow";

// (a) SCOPE — item CONTENT only. Not prose, not code, not study data.
//
// A first draft scanned all of src and instantly produced two false positives:
// "Concordia" (a real university, legitimately in universities.json) and "CSS" (the
// stylesheet language, in brand.ts). Naming a real body in PROSE is frequently correct
// — "we are not affiliated with fide" is a sentence we want. Invented item content is
// the one place a real company name can only ever be a mistake, so that is the scope.
const ITEM_DIR = path.join(process.cwd(), "src", "data", "items");

// The fields a learner actually reads. Structural fields (language, exam, track, cefr,
// taskType) are not content and cannot carry a leak.
const CONTENT_KEYS = new Set([
  "title", "prompt", "passage", "transcript", "stimulus", "question", "instructions",
  "options", "left", "right", "items", "criteria",
]);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function findHits(text) {
  const found = [];

  for (const b of BRANDS) {
    if (new RegExp(`(^|\\P{L})${escapeRe(b)}($|\\P{L})`, "u").test(text)) found.push(b);
  }

  // (b) Common-word names need corporate context in the SAME string.
  for (const b of COMMON_WORD_BRANDS) {
    const re = new RegExp(`(^|\\P{L})${escapeRe(b)}($|\\P{L})`, "gu");
    let m;
    while ((m = re.exec(text)) !== null) {
      const at = m.index + m[1].length;
      const before = text.slice(Math.max(0, at - 30), at);
      const after = text.slice(at + b.length, at + b.length + 30);
      if (CORPORATE_MARKER.test(after) || CORPORATE_MARKER.test(before) || SENDER_FORM.test(before)) {
        found.push(b);
        break;
      }
    }
  }
  return found;
}

const problems = [];

/**
 * Test the PARSED string values, never raw file text.
 *
 * The first version scanned raw lines and WENT GREEN on the Helvetia bug when I
 * re-introduced it to test. In the file the passage reads
 * `Freundliche Grüsse\nHelvetia Kranken AG`, and there `\n` is two characters — a
 * backslash and the letter n. So the character before "Helvetia" was a LETTER, the
 * word boundary never matched, and the gate was blind in the exact place a company
 * name always sits: right after the newline in a signature. Repair-Café was caught
 * only because a space happened to precede it. Parsing first makes the boundary real.
 */
function scanContent(v, file, trail) {
  if (typeof v === "string") {
    if (v.includes(ESCAPE)) return;
    for (const b of findHits(v)) {
      problems.push(`${path.relative(process.cwd(), file)} ${trail} — real company "${b}"`);
    }
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => scanContent(x, file, `${trail}[${i}]`));
  }
}

function scanItem(item, file, trail) {
  for (const [k, v] of Object.entries(item)) {
    if (CONTENT_KEYS.has(k)) scanContent(v, file, `${trail}.${k}`);
    else if (v && typeof v === "object" && !Array.isArray(v)) scanItem(v, file, `${trail}.${k}`);
  }
}

for (const f of fs.readdirSync(ITEM_DIR).filter((n) => n.endsWith(".json"))) {
  const full = path.join(ITEM_DIR, f);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    problems.push(`${f} — unparseable JSON`);
    continue;
  }
  if (!Array.isArray(parsed)) continue;
  parsed.forEach((item, i) => scanItem(item, full, `[${i}]`));
}

if (problems.length) {
  console.error(`\n✗ real-entity gate: ${problems.length} hit(s) — an invented document must not name a real company.\n`);
  for (const p of problems) console.error("  " + p);
  console.error(`\nFix: invent a placeholder ("Kranken AG"; the Confederation's own specimens use`);
  console.error(`Muster*), or reuse one the bank already ships — a name already in use cannot`);
  console.error(`introduce a NEW collision. If a string genuinely needs the word (Helvetia as the`);
  console.error(`national personification), add "${ESCAPE}" to it.\n`);
  process.exit(1);
}

console.log(
  `✓ Real-entity gate: clean (${BRANDS.length + COMMON_WORD_BRANDS.length} known companies; regression guard, not a completeness check — a new one comes from reading the item).`,
);
