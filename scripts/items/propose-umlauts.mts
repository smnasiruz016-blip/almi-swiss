// PROPOSE a correction for every transliterated token in the telc/Goethe German bundles.
//
//   npx tsx scripts/items/propose-umlauts.mts
//
// All four telc/Goethe German bundles were authored without umlauts — Gespraech,
// Praesentation, Buero, Schluessel. Every other German bundle in the bank uses ä/ö/ü, so
// this is not an encoding limit; it is one track written differently. It teaches wrong
// orthography, and telc and Goethe do not spell that way.
//
// WHY THIS IS A TWO-STEP AND NOT A REPLACE. `ae → ä` is not a safe transform. It would
// turn dauert into däurt, neue into näue, Steueramt into Stäueramt, einbauen into
// einbäuen — all genuine German where those letters simply meet. The sequence carries no
// information about whether it stands for an umlaut, so the decision has to be made per
// token by someone who reads German.
//
// What this script does is narrow the decision, not make it. For each token it generates
// every possible restoration and then asks the REST OF THE BANK whether that word exists:
// the other German bundles are ~880 items of correctly-spelled German, so if "Gespräch"
// appears there and "Gespraech" does not, that is evidence from inside the repo rather
// than a guess. Where the corpus cannot settle it, the token is marked "?" and left for
// beta-g. Nothing is written to the bank here.

import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "src", "data", "items");
const TARGET = (f: string) => f.startsWith("telc-goethe-german");
const OUT_TXT = path.join(process.cwd(), "reports", "umlaut-proposal.txt");
const OUT_JSON = path.join(process.cwd(), "reports", "umlaut-decided.json");

const read = (f: string) => fs.readFileSync(path.join(DIR, f), "utf8");
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));

// The reference corpus: every German bundle that is NOT one of the four, lower-cased.
// This is what "is that a real word" is answered against.
const reference = files
  .filter((f) => !TARGET(f) && f.includes("german"))
  .map(read)
  .join("\n")
  .toLowerCase();

const referenceWords = new Set(reference.match(/[a-zäöüß]+/g) ?? []);

/** Every way the ae/oe/ue sequences in a token could be umlauts — including none.
 *
 *  A sequence PRECEDED BY a or e is a genuine diphthong, not a transliteration: the u in
 *  Betreuerin, einbauen, dauert, neue and Steueramt belongs to an au/eu that happens to
 *  be followed by e. Restoring those gives Betreürin, einbaün, däurt — the exact class of
 *  corruption a blind replace produces. A real umlaut never sits behind a vowel here,
 *  because the transliteration only ever stands in for ä/ö/ü, and Gebaeude/Haeuser still
 *  work: their a is behind a consonant. */
function candidates(tok: string): string[] {
  const positions: number[] = [];
  const lower = tok.toLowerCase();
  for (let i = 0; i < lower.length - 1; i++) {
    if (lower[i + 1] !== "e" || !"aou".includes(lower[i])) continue;
    // …except after the ge- prefix, where the e belongs to the prefix and not to a
    // diphthong: geoeffnet is geöffnet, not a genuine "eo".
    const gePrefix = i === 2 && lower.startsWith("ge");
    if (i > 0 && "ae".includes(lower[i - 1]) && !gePrefix) continue;
    positions.push(i);
  }
  const out: string[] = [];
  for (let mask = 0; mask < 1 << positions.length; mask++) {
    let s = "";
    let i = 0;
    let k = 0;
    while (i < tok.length) {
      if (k < positions.length && positions[k] === i) {
        if (mask & (1 << k)) {
          const up = tok[i] === tok[i].toUpperCase();
          s += ({ a: "ä", o: "ö", u: "ü" } as Record<string, string>)[tok[i].toLowerCase()]!.replace(/./, (c) => (up ? c.toUpperCase() : c));
          i += 2;
        } else {
          s += tok.slice(i, i + 2);
          i += 2;
        }
        k++;
      } else {
        s += tok[i];
        i++;
      }
    }
    out.push(s);
  }
  return out;
}

type Row = { token: string; proposal: string; basis: string; count: number; example: string };
const seen = new Map<string, Row>();

for (const f of files.filter(TARGET)) {
  const text = read(f);
  for (const tok of text.match(/[A-Za-zÄÖÜäöüß]*(?:ae|oe|ue|Ae|Oe|Ue)[A-Za-zÄÖÜäöüß]*/g) ?? []) {
    if (tok.toLowerCase() === "question") continue; // a JSON key, not prose
    const row = seen.get(tok);
    if (row) { row.count++; continue; }

    const opts = candidates(tok).filter((c) => c !== tok);
    const attestedFixes = opts.filter((c) => referenceWords.has(c.toLowerCase()));
    const selfAttested = referenceWords.has(tok.toLowerCase());

    let proposal: string;
    let basis: string;
    if (selfAttested && attestedFixes.length === 0) {
      proposal = tok;
      basis = "LEAVE — the token as written appears in correctly-spelled German elsewhere in the bank";
    } else if (attestedFixes.length === 1 && !selfAttested) {
      proposal = attestedFixes[0];
      basis = `restore — "${attestedFixes[0]}" is attested elsewhere in the bank, "${tok}" is not`;
    } else if (attestedFixes.length === 1 && selfAttested) {
      proposal = `? ${attestedFixes[0]}`;
      basis = `AMBIGUOUS — both "${tok}" and "${attestedFixes[0]}" appear elsewhere in the bank`;
    } else if (attestedFixes.length > 1) {
      proposal = `? ${attestedFixes.join(" | ")}`;
      basis = `AMBIGUOUS — more than one restoration is attested`;
    } else {
      proposal = `? ${opts[opts.length - 1] ?? tok}`;
      basis = `UNATTESTED — the bank cannot settle this one; ${opts.length} possible restoration(s)`;
    }

    // A line of real context, so the call can be made without opening the bundle.
    const at = text.indexOf(tok);
    const example = text.slice(Math.max(0, at - 60), at + tok.length + 60).replace(/\s+/g, " ").replace(/^\S*\s|\s\S*$/g, "");

    seen.set(tok, { token: tok, proposal, basis, count: 1, example });
  }
}

const rows = [...seen.values()].sort((a, b) => a.token.localeCompare(b.token, "de"));
const decided = rows.filter((r) => !r.proposal.startsWith("?") && r.proposal !== r.token);
const leave = rows.filter((r) => r.proposal === r.token);
const open = rows.filter((r) => r.proposal.startsWith("?"));

const L = [
  "TELC/GOETHE GERMAN — UMLAUT RESTORATION, PROPOSED TOKEN BY TOKEN",
  "",
  `${rows.length} distinct token(s) containing ae / oe / ue across the four bundles.`,
  "",
  "NOT a find-replace. ae→ä would corrupt dauert, neue, einbauen, Steueramt — genuine",
  "German where those letters meet. Each token is proposed separately, and the evidence is",
  `the rest of the bank: ${referenceWords.size} distinct correctly-spelled German words from the`,
  "German bundles that were NOT authored this way.",
  "",
  `  ${String(decided.length).padStart(3)}  proposed restoration, attested elsewhere in the bank`,
  `  ${String(leave.length).padStart(3)}  leave as written — real German, the letters just meet`,
  `  ${String(open.length).padStart(3)}  OPEN — the bank cannot settle it, marked "?" for you`,
  "",
  "Edit the '→' column in reports/umlaut-decided.json. apply-umlauts.mts reads THAT file,",
  "never this classifier, so nothing lands in the bank that you have not looked at.",
  "",
  "=".repeat(78),
  "",
  "OPEN — need your call",
  "",
];
for (const r of open) L.push(`  ${r.token.padEnd(22)} → ${r.proposal}`, `     ${r.basis}`, `     …${r.example}…`, "");
L.push("", "=".repeat(78), "", "PROPOSED RESTORATION", "");
for (const r of decided) L.push(`  ${r.token.padEnd(22)} → ${r.proposal.padEnd(22)} ×${r.count}`);
L.push("", "", "=".repeat(78), "", "LEAVE AS WRITTEN", "");
for (const r of leave) L.push(`  ${r.token.padEnd(22)} (real German)   ×${r.count}`);

fs.mkdirSync(path.dirname(OUT_TXT), { recursive: true });
fs.writeFileSync(OUT_TXT, L.join("\n"), "utf8");
fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(rows.map((r) => ({ token: r.token, to: r.proposal, why: r.basis, occurrences: r.count })), null, 1),
  "utf8",
);

console.log(`${rows.length} distinct token(s) across the four telc/Goethe German bundles`);
console.log(`  ${decided.length} proposed restoration (attested in the rest of the bank)`);
console.log(`  ${leave.length} leave as written (real German)`);
console.log(`  ${open.length} OPEN — need beta-g's call`);
console.log(`\nreview → ${path.relative(process.cwd(), OUT_TXT)}`);
console.log(`decide → ${path.relative(process.cwd(), OUT_JSON)}   (apply-umlauts.mts reads this, not the classifier)`);
