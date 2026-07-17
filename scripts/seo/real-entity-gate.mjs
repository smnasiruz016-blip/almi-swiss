// Real-entity gate — no invented document may be signed by a real company.
//
// WHY THIS EXISTS
//
// Our items ARE fabrications: invented letters, invented phone calls, invented
// notices. That is legitimate — until one is signed with a real organisation's name.
// Then it stops being a practice task and becomes words put in a real company's mouth.
//
// It has happened twice, and both times a human caught it, not a check:
//   * PR#11 — two reading tasks signed invented insurance letters "Helvetia Kranken AG"
//     and "Helvetia Santé SA". Helvetia is a real Swiss insurer (1858, Basel). The
//     amounts in the letters were CORRECT — CHF 300 franchise, 10% Selbstbehalt — which
//     is exactly why it survived: the fact-check passes, and the fact-check is not what
//     is wrong.
//   * 2026-07-17 — a new reading task invented a notice for a "Repair-Café", a real
//     trademarked name (Repair Café International Foundation).
//
// No other gate can see this. Every word is allowed. The fork-hygiene gate hunts
// ANCESTOR nouns; this hunts REAL-WORLD ones. Different failure, different list.
//
// WHAT IT DOES NOT DO
//
// It does not ban naming a real body where naming one is the honest thing: fide, SEM,
// telc, Goethe are named on purpose ("we are not affiliated with..."). Those are not on
// this list. This list is organisations that could plausibly be a PARTY in one of our
// invented documents — insurers, banks, retailers, telecoms.
//
// AMBIGUITY IS HANDLED, NOT IGNORED. A blanket denylist would fire on true German prose
// and train everyone to ignore the gate:
//   * "Mobiliar" is an ordinary German noun (furnishings) AND an insurer (die Mobiliar).
//     A Wohnungsabnahme item may legitimately say "das Mobiliar". So the brand is matched
//     as the PHRASE "die Mobiliar", never the bare word.
//   * "Helvetia" is also the national personification (Confoederatio Helvetica → CH).
//     Banned in ITEMS, where it can only be a company; prose may need the other sense,
//     so prose can escape per line.
// Use `real-entity-allow` on a line that genuinely needs the word.

import fs from "node:fs";
import path from "node:path";

// Unambiguous brands. Word-boundary, case-sensitive.
const BRANDS = [
  // health insurers (BAG-authorised)
  "Helvetia", "Helsana", "CSS", "Swica", "SWICA", "Assura", "Concordia", "Sanitas",
  "Visana", "KPT", "Atupri", "Sympany", "ÖKK", "EGK", "Agrisano", "Aquilana",
  // other insurers
  "Baloise", "Vaudoise", "AXA", "Allianz", "Generali", "Zurich Insurance",
  // banks
  "UBS", "PostFinance", "Raiffeisen", "Credit Suisse", "Zürcher Kantonalbank", "ZKB",
  // retail / telecom / transport
  "Migros", "Coop", "Denner", "Manor", "Swisscom", "Sunrise", "Aldi", "Lidl",
  // trademarked programme names that read as generic
  "Repair Café", "Repair-Café", "Repair Cafe", "Repair-Cafe",
];

// Brands whose bare word is ordinary German. Matched only as the exact brand phrase.
const PHRASES = ["die Mobiliar", "Die Mobiliar", "der Mobiliar", "Groupe Mutuel", "Die Post AG"];

const ESCAPE = "real-entity-allow";

// SCOPE: items only, and that is the honest scope. Both real incidents were invented
// documents (an insurance letter, a notice). Prose is different work: naming a real
// body there can be correct — "not affiliated with fide", a real university in
// universities.json, "CSS" meaning the stylesheet language. A first draft of this gate
// scanned all of src and immediately produced exactly those two false positives. A gate
// that cries wolf gets ignored, and an ignored gate is worse than no gate, because it
// reads as coverage. So: invented content is where a real name can only be a mistake.
const ITEM_DIR = path.join(process.cwd(), "src", "data", "items");
const SCAN_DIRS = [ITEM_DIR];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".json")) out.push(full);
  }
  return out;
}

const problems = [];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function hits(text) {
  const found = [];
  for (const b of BRANDS) {
    if (new RegExp(`(^|\\P{L})${escapeRe(b)}($|\\P{L})`, "u").test(text)) found.push(b);
  }
  for (const p of PHRASES) if (text.includes(p)) found.push(p);
  return found;
}

/**
 * Walk the PARSED json and test each string value — never the raw file text.
 *
 * The first version scanned raw lines and MISSED the flagship case. In the file the
 * passage reads `Freundliche Grüsse
Helvetia Kranken AG`, and `
` there is two
 * characters: a backslash and the letter n. So the character before "Helvetia" is a
 * LETTER, the word-boundary never matched, and the gate went green on the exact bug it
 * was written for — a company name in a signature, which is precisely where `
` always
 * sits. Blind in the one place signatures live.
 *
 * Parsing first makes the boundary real: the value contains a genuine newline.
 */
function scanValue(v, file, trail) {
  if (typeof v === "string") {
    if (v.includes(ESCAPE)) return;
    for (const b of hits(v)) {
      problems.push(`${path.relative(process.cwd(), file)} ${trail} — real entity "${b}"`);
    }
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => scanValue(x, file, `${trail}[${i}]`));
  } else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) scanValue(x, file, `${trail}.${k}`);
  }
}

function scan(file) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    problems.push(`${path.relative(process.cwd(), file)} — unparseable JSON`);
    return;
  }
  scanValue(parsed, file, "");
}

for (const d of SCAN_DIRS) for (const f of walk(d)) scan(f);

if (problems.length) {
  console.error(`\n✗ real-entity gate: ${problems.length} hit(s) — an invented document must not name a real organisation.\n`);
  for (const p of problems) console.error("  " + p);
  console.error(`\nFix by inventing a placeholder ("Kranken AG", "Muster AG" — the Confederation's own`);
  console.error(`specimens use Muster*), or reuse one the bank already ships. If a line genuinely needs`);
  console.error(`the word (e.g. Helvetia as the national personification), add "${ESCAPE}" to that line.`);
  process.exit(1);
}

console.log(`✓ Real-entity gate: clean (${BRANDS.length + PHRASES.length} real orgs checked across the item bank).`);
