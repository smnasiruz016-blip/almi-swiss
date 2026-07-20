// Build-time FORK HYGIENE GATE — the AlmiWorld §7 rule, enforced instead of trusted.
//
// WHY THIS EXISTS. This repo's lineage is:
//   almi-celpip → almi-goethe → almi-icelandic → almi-danish → almi-norwegian →
//   almi-swedish → almi-swiss  (you are here)
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
// Swiss product has no reason to name Swedish exams or Danish agencies.
//
// Runs before the build and FAILS it on any hit. If a future fork descends from
// this repo, RE-CUT BANNED in both directions: add the Swiss nouns (fide, SEM,
// canton names...), and REMOVE whatever the new country legitimately owns. See the
// note on BANNED — inheriting this list unchanged is itself a fork bug.

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
  // Same reason, and it earned the entry the honest way: this gate FAILED that
  // file's first build (2026-07-15) because its comments name almi-icelandic
  // while explaining which forks shared the self-origin bug. It is a build
  // script, not user-facing copy, and it must name the ancestors to explain the
  // absence bug it exists to catch — Portugal missing from all five forks.
  ["scripts/seo/countries-axis-gate.mjs", "documents the lineage bugs it prevents; build script, never rendered"],
  // site.ts names the ancestor domain ONLY inside the comment explaining why ten
  // files hardcoded it and why there is now no fallback. The names appear in prose
  // ABOUT the leak, never in a value: the sole export resolves from env and throws
  // in production rather than guess. Verified by grepping the file for the noun
  // outside a comment — if a real URL ever returns here, this entry must go.
  ["src/lib/site.ts", "explains the ancestor-domain leak it fixes; emits no ancestor value"],
  // REAL-WORLD REFERENCE DATA, not authored copy. Sweden/Norway/Denmark/Iceland are
  // legitimate ORIGIN countries for a Swiss product (someone really can move from
  // Sweden to Switzerland — and Sweden being the immediate ancestor does not stop
  // Swedes emigrating). universities.json lists institutions worldwide as origin
  // references, and Basel's hub profile correctly mentions the French and German
  // borders. These axes are imported, not written — the fork risk lives in the prose
  // that consumes them, which is NOT allowlisted.
  ["src/data/seo/countries.json", "Sweden/Norway/Denmark are valid ORIGIN countries for a Swiss product — people move here from all of them"],
  ["src/data/seo/universities.json", "worldwide origin institutions"],
  ["src/data/seo/hubs.json", "Basel genuinely sits where Switzerland, France and Germany meet"],
]);

// Per-line escape for prose that must NAME an ancestor to warn about it (e.g. the
// comments documenting the DK_UNIS leak). Deliberately verbose so it shows up in
// review: a line carrying this marker is asserting "I mean this on purpose".
const LINE_ESCAPE = "hygiene-allow";

// Ancestor proper nouns. A Swiss product naming any of these is a fork leak.
// ⚠️ THIS LIST IS PRODUCT-SPECIFIC AND MUST BE RE-CUT AT EVERY FORK — IN BOTH
// DIRECTIONS. Inheriting it unchanged is itself a fork bug, and AlmiSwiss proved it
// twice on 2026-07-16:
//
//   ADD the immediate ancestor. Swedish was absent from the list this repo
//   inherited, because in almi-swedish Swedish was the SUBJECT. The moment Sweden
//   became an ancestor, every Swedish noun became a leak — and the gate was blind
//   to precisely the country it had just been forked from. The gate is always
//   weakest against the fork that just happened.
//
//   REMOVE what the new country legitimately owns. The inherited list banned
//   "Schreiben", "Sprechen" and "Goethe-Institut" — correct for a Nordic product,
//   WRONG here: German is one of Switzerland's national languages, and Goethe is an
//   SEM-RECOGNISED certificate this product legitimately offers (see the CERTIFICATE
//   track). Left in place, the gate would have banned this product's own subject
//   matter and pushed us to delete true content to get a green build. A gate that
//   fails on correct content is worse than no gate: it trains you to ignore it.
//
// Rule of thumb: BANNED = the ancestors' facts. NOT this product's facts, and NOT
// the whole language just because an ancestor spoke it.
const BANNED = [
  // — Swedish (the IMMEDIATE ancestor — every noun below shipped as fact here) —
  "Tisus", "SFI", "Svenska för invandrare", "Swedex",
  "Medborgarskapsprovet", "Medborgarskapsprov",
  "Universitets- och högskolerådet", "Migrationsverket", "Skolverket",
  "Sverige i fokus", "Stockholms universitet", "Stockholmsmässan",
  "Läsförståelse", "Hörförståelse", "Skriftlig framställning", "Muntlig framställning",
  "Samhällskunskap", "utprövningsprov",
  "Sverige", "Swedish", "Sweden",
  "sv-SE",
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
  // — Earlier ancestors (Portuguese / Dutch / CELPIP) —
  // NOTE what is deliberately NOT banned here any more: "Schreiben", "Sprechen",
  // "Goethe-Institut". See the note above — those are Swiss subject matter now.
  // Sibling PRODUCT names stay banned: naming AlmiGoethe in copy is still a leak.
  "CAPLE", "Celpe-Bras",
  // Sibling/ancestor PRODUCT names are appended below — GENERATED, not hand-listed.
];

// ── Ancestor product names, in every form a slug can ship in ─────────────────
// Hand-listing these was itself a fork bug, and the list proved it. It carried
// "almi-swedish" and "almiswedish" but no underscore; "AlmiGoethe" with no bare
// slug; "AlmiPortuguese" and "AlmiCELPIP" with NO slug form at all — so
// `almi-portuguese` and `almi-celpip` were never banned by the gate that exists to
// ban them. Nobody chose that: it is just what a list edited by hand across six
// forks looks like.
//
// It shipped. `src/lib/auth.ts` reads `SESSION_COOKIE_NAME = "almi_norwegian_session"`
// and the gate was GREEN — BANNED held `almi-norwegian` (hyphen), the code used an
// UNDERSCORE. Same blindness as the UHR acronym one commit earlier: the list agreed
// the noun was an ancestor's, and the form that actually shipped was spelled
// differently. A grep does not know that `almi-x` and `almi_x` are the same idea.
//
// So: name the products once, and let the code enumerate the spellings.
const ANCESTOR_PRODUCTS = [
  "celpip", "goethe", "icelandic", "danish", "norwegian", "swedish", "portuguese",
];
/** Every form a product slug ships in: almi-x · almi_x · almix · AlmiX. */
function productNameForms(p) {
  return [`almi-${p}`, `almi_${p}`, `almi${p}`, `Almi${p[0].toUpperCase()}${p.slice(1)}`];
}
for (const p of ANCESTOR_PRODUCTS) BANNED.push(...productNameForms(p));
// Display names that are not simple capitalisations, so the generator cannot derive
// them. Keep this list SHORT — anything here is a spelling the generator missed.
BANNED.push("AlmiCELPIP");

// SELF-CHECK. On 2026-07-16 a blanket find-replace of the ancestor's product name
// across the repo also rewrote THIS list, so the gate began banning "AlmiSwiss" —
// this product's own name — and reported 90 false positives that looked exactly like
// a real leak storm. The irony is the lesson: a careless global replace is the very
// thing this gate exists to catch, and it caught it only because the count moved the
// wrong way. Assert it outright rather than relying on someone noticing.
const SELF_NAMES = ["AlmiSwiss", "almi-swiss", "almiswiss"];
for (const n of SELF_NAMES) {
  if (BANNED.some((b) => b.toLowerCase() === n.toLowerCase())) {
    console.error("");
    console.error(`FORK-HYGIENE GATE IS MISCONFIGURED: BANNED contains "${n}", which is THIS product's own name.`);
    console.error("Every legitimate mention of ourselves would be reported as an ancestor leak.");
    console.error("Almost certainly a global find-replace that rewrote the banned list. Fix BANNED.");
    console.error("");
    process.exit(2);
  }
}

// Acronyms need word boundaries — they collide with ordinary substrings.
//
// ⚠️ `UHR` WAS MISSING, AND THE GATE WAS GREEN WHILE THE LEAK SHIPPED. BANNED lists
// the Swedish authority by its full name ("Universitets- och högskolerådet"), so the
// list AGREED that this body is an ancestor noun — but every user-facing surface said
// the ACRONYM, and nothing checked for it. Four live pages told Swiss users their
// practice score was "not an official UHR result": UHR is Sweden's Council for Higher
// Education, the body behind Tisus and Swedex. It decides nothing about a Swiss
// naturalisation.
//
// The shape is the one this whole file exists to catch, in its purest form. On
// practice/page.tsx the NEXT SENTENCE already named the right bodies — the cantonal
// migration authority, SEM, a recognised test centre. The prose around the noun was
// localized and the noun itself was not. It is also the second time this exact noun
// got through: find-replacing it once produced "Swiss Council for Higher Education",
// a fabricated body (see the registry fact base). That fabrication was caught because
// it read wrong in English; the bare acronym read like a plausible initialism and
// survived.
//
// Lesson for the next fork: ban the ancestor's authorities by ACRONYM AND full name.
// An acronym is not a shorter version of a noun you already banned — to a grep it is
// an unrelated string, and it is the form that actually ships in copy.
//
// `UHR` is a real German word (clock/hour) and a substring of "Uhrzeit"; word
// boundaries are what make banning it safe in a product that teaches German.
const BANNED_WORD = ["UDI", "SIRI", "UHR"];

// ── What gets scanned ────────────────────────────────────────────────────────────
//
// COMMENTS ARE NOT SCANNED. A comment naming an ancestor is documentation, not a
// leak — usually the opposite, since it exists to stop a duplication being mistaken
// for original work. Scanning them made the gate red for two provenance notes and
// invited a third allowlist entry, and this gate's own header calls every allowlist
// entry a hole. Stripping comments closes the class instead of widening the hole.
//
// STRING LITERALS ARE SCANNED. They are the copy that ships. The leaks in the header
// above were all strings: "other Norwegian universities", "the Norwegian Patient
// Safety Authority", a fabricated "University of Southern Norway". Dropping them to
// scan only item JSON would blind the gate to exactly what it was built for.
//
// The stripper tracks string state so a `//` inside "https://…" is not mistaken for
// a comment — the common way a naive stripper eats real copy.
function stripComments(text) {
  let out = "";
  let i = 0;
  let quote = null;      // ' " ` when inside a string
  let inLine = false;    // //
  let inBlock = false;   // /* */
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (inLine) {
      if (c === "\n") { inLine = false; out += c; }
      else out += " ";           // keep length so line numbers survive
      i++; continue;
    }
    if (inBlock) {
      if (c === "*" && n === "/") { inBlock = false; out += "  "; i += 2; continue; }
      out += c === "\n" ? c : " ";
      i++; continue;
    }
    if (quote) {
      if (c === "\\") { out += text.slice(i, i + 2); i += 2; continue; }
      if (c === quote) quote = null;
      out += c; i++; continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; out += c; i++; continue; }
    if (c === "/" && n === "/") { inLine = true; out += "  "; i += 2; continue; }
    if (c === "/" && n === "*") { inBlock = true; out += "  "; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

// Prisma and CSS use their own comment syntax; # is prisma's.
function stripHashComments(text) {
  return text.split(/\r?\n/).map((l) => l.replace(/#.*$/, "")).join("\n");
}

// JSON is scanned as PARSED STRING VALUES, the real-entity-gate design: scanning raw
// JSON text matches escape sequences rather than content, and a gate that scans the
// wrong thing is a gate that has never truly been red.
function jsonStrings(node, out = []) {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) for (const v of node) jsonStrings(v, out);
  else if (node && typeof node === "object") for (const v of Object.values(node)) jsonStrings(v, out);
  return out;
}

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
    const raw = readFileSync(file, "utf8");
    let text;
    if (rel.endsWith(".json")) {
      // parsed values only — never the raw JSON text
      try { text = jsonStrings(JSON.parse(raw)).join("\n"); }
      catch { text = raw; }   // malformed JSON: fall back rather than skip silently
    } else if (rel.endsWith(".prisma")) {
      text = stripHashComments(raw);
    } else {
      text = stripComments(raw);
    }
    const lines = text.split(/\r?\n/);
    // The per-line escape lives in a TRAILING COMMENT, so it must be read from the
    // RAW line, not the stripped one. Stripping comments removed the marker along
    // with them, which silently disarmed every escaped CODE line.
    const rawLines = raw.split(/\r?\n/);

    lines.forEach((line, i) => {
      if ((rawLines[i] ?? "").includes(LINE_ESCAPE)) return;
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

// ── Structural audit of countries.json ────────────────────────────────────────
// The noun-ban above allowlists this file, because Sweden/Norway/Denmark ARE valid
// origins for a Swiss product. That allowlist was a hole: on 2026-07-15 the file was
// found corrupted by a blind Denmark→Norway find-replace inherited from almi-norwegian —
// the Denmark row renamed to slug "norway"/name "Norway" (its 🇩🇰 flag the only tell),
// Iceland's name overwritten with "Norway", and two rows slugged "norway". Denmark had
// silently vanished as an origin. A noun grep can never catch that: the label said
// Norway and the fact was a flag.
//
// So audit the DATA, not the prose: flag emoji encode ISO-3166 alpha-2 (regional
// indicators U+1F1E6–U+1F1FF → A–Z), which makes every row self-checking.
const SELF_ISO = "CH"; // this product's own country — never a valid origin of itself
// ⚠️ Was "SE" when this repo was forked: the gate believed it still WAS Sweden, and
// so flagged Sweden — a perfectly valid origin for a Swiss product — as an illegal
// self-origin. The tool built to catch fork leaks was itself an un-forked leak.
// Whatever else changes at a fork, THIS line changes first.
function isoFromFlag(flag) {
  const cp = [...flag];
  if (cp.length < 2) return "??";
  const a = cp[0].codePointAt(0) - 0x1f1e6;
  const b = cp[1].codePointAt(0) - 0x1f1e6;
  if (a < 0 || a > 25 || b < 0 || b > 25) return "??";
  return String.fromCharCode(65 + a) + String.fromCharCode(65 + b);
}
try {
  const countries = JSON.parse(readFileSync(join(ROOT, "src/data/seo/countries.json"), "utf8"));
  const seenSlug = new Map();
  const seenIso = new Map();
  for (const row of countries) {
    const iso = isoFromFlag(row.flag ?? "");
    if (iso === "??") violations.push(`countries.json: ${row.slug} has an unreadable flag`);
    if (iso === SELF_ISO)
      violations.push(`countries.json: ${row.slug} (${iso}) is THIS product's own country — you cannot come from where you already are`);
    if (seenSlug.has(row.slug))
      violations.push(`countries.json: duplicate slug "${row.slug}" (${seenSlug.get(row.slug)} and ${iso}) — bySlug is last-wins, so one row silently shadows the other while still emitting URLs`);
    if (seenIso.has(iso))
      violations.push(`countries.json: duplicate flag ${iso} on "${seenIso.get(iso)}" and "${row.slug}" — one of them was renamed`);
    seenSlug.set(row.slug, iso);
    seenIso.set(iso, row.slug);
  }
} catch (e) {
  violations.push(`countries.json: could not audit — ${e.message}`);
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
