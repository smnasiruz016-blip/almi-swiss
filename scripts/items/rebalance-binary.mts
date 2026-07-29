// APPLY beta-g's re-authoring of the FIDE citizenship German listening binary pool.
//
//   npx tsx scripts/items/rebalance-binary.mts            (dry run + proof)
//   npx tsx scripts/items/rebalance-binary.mts --write    (part of the staged batch)
//
// The pool was 8 true / 17 false: answering "Falsch" on every item and never listening
// scored 68%. Four statements are re-written so their key becomes Richtig, taking the
// pool to 12/13.
//
// BALANCING THE RATIO IS ONLY HALF OF IT. Separately from the skew, every statement in
// the pool containing an absolute — alle, nur, ganz, ohne Ende — was keyed FALSE, 6 for
// 6. That is a second way to score without listening, and it SURVIVES an even split: a
// pool can be exactly 50/50 and still be answerable from the shape of the sentence. So
// the four rewrites are chosen to put absolutes on the true side too — [17] keys Richtig
// on "gilt nur heute", and [21] deliberately keeps "den ganzen Dienstag" on Falsch, so
// neither answer follows from the word.
//
// Each rewrite is a claim the transcript makes almost verbatim. That is the point: a
// binary item is only a comprehension item if the key is settleable from the source, so
// flipping a key means re-writing the statement until the source says the new thing —
// never just moving the answer to the other option.
//
// Every edit carries a from-text guard. If a statement has changed since beta-g read it,
// this refuses rather than overwriting an unreviewed edit with a stale one.

import fs from "node:fs";
import path from "node:path";

// --file exists so the from-text guard can be pointed at a deliberately-broken copy and
// SEEN to refuse. A guard that has only ever run against good input is an assumption.
const FILE = process.argv.find((a) => a.startsWith("--file="))?.slice(7)
  ?? path.join(process.cwd(), "src", "data", "items", "fide-german-listening.json");
const WRITE = process.argv.includes("--write");

type Edit = {
  file: string;
  title: string;
  /** The statement as beta-g reviewed it. Mismatch = refuse. */
  from: string;
  to: string;
  key: string;
  /** The phrase in the source the new key rests on — checked, not decorative. */
  evidence: string;
};

const EDITS: Edit[] = [
  {
    file: "fide-german-listening.json",
    title: "Gespräch über den Gebührensack",
    from: "Aussage: Laut Frau Lehmann tauschen alle Gemeinden alte Säcke um.",
    to: "Aussage: Manche Gemeinden tauschen alte Säcke um, andere nicht.",
    key: "Richtig",
    evidence: "Manche Gemeinden tauschen sie um, andere nicht",
  },
  {
    file: "fide-german-listening.json",
    title: "Erinnerung der Bibliothek: Buch abgeben",
    from: "Aussage: Laut der Nachricht kann Herr Demir das Buch nur während der Öffnungszeiten zurückgeben.",
    to: "Aussage: Herr Demir kann das Buch auch ausserhalb der Öffnungszeiten zurückgeben.",
    key: "Richtig",
    evidence: "auch ausserhalb der Öffnungszeiten",
  },
  {
    file: "fide-german-listening.json",
    title: "Ansage auf dem Wochenmarkt",
    from: "Aussage: Laut der Ansage gilt das Angebot für die Erdbeeren die ganze Woche.",
    to: "Aussage: Das Angebot für die Erdbeeren gilt nur heute.",
    key: "Richtig",
    evidence: "Das Angebot gilt nur heute",
  },
  {
    file: "fide-german-listening.json",
    title: "Nachricht von der Nachbarin: Fest am Wochenende",
    from: "Aussage: Laut der Nachricht feiert Sara bis spät in die Nacht ohne Ende.",
    to: "Aussage: Sara und ihre Freunde hören um elf Uhr auf.",
    key: "Richtig",
    evidence: "wir hören um elf Uhr auf",
  },
  // ── beta-g's balancing of the two telc/Goethe 6-item pools ──────────────────
  // Both sat at 67% with one item needing to change side. The reading pool also had both
  // its absolutes on FALSE, so [3] is restated on "höchstens" to put an absolute on the
  // true side and [4] drops "Alle" rather than keeping a word that gives the answer away.
  {
    file: "telc-goethe-german-listening.json",
    title: "Nachricht der Kita",
    from: "Aussage: Die Eltern sollen an passende Kleidung denken.",
    to: "Aussage: Der Ausflug findet am Montag statt.",
    key: "Falsch",
    evidence: "Am Freitag machen wir den Ausflug",
  },
  {
    file: "telc-goethe-german-reading.json",
    title: "Information der Gemeinde: Grünabfuhr",
    from: "Aussage: Die Behälter müssen bis 7 Uhr bereitstehen.",
    to: "Aussage: Die Äste dürfen höchstens einen Meter lang sein.",
    key: "Richtig",
    evidence: "höchstens einen Meter lang",
  },
  {
    file: "telc-goethe-german-reading.json",
    title: "Aushang im Waschraum",
    from: "Aussage: Alle Maschinen sind defekt.",
    to: "Aussage: Die Maschinen 1 und 3 können benutzt werden.",
    key: "Richtig",
    evidence: "benutzen Sie bis dahin die Maschinen 1 und 3",
  },
];

const DIR = path.dirname(FILE);
const loaded = new Map<string, any[]>();
const load = (f: string) => {
  if (!loaded.has(f)) loaded.set(f, JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));
  return loaded.get(f)!;
};

const refusals: string[] = [];
const applied: string[] = [];

for (const e of EDITS) {
  const bundle = load(e.file);
  const matches = bundle.filter((it) => it.title === e.title && it.taskType === "TRUE_FALSE");
  if (matches.length !== 1) {
    refusals.push(`${e.file} · ${e.title} — matched ${matches.length} item(s), expected exactly 1`);
    continue;
  }
  const it = matches[0];
  if (it.payload.question !== e.from) {
    refusals.push(`${e.file} · ${e.title} — statement is not what was reviewed\n      reviewed: ${e.from}\n      on disk : ${it.payload.question}`);
    continue;
  }
  const idx = (it.payload.options as string[]).indexOf(e.key);
  if (idx < 0) {
    refusals.push(`${e.file} · ${e.title} — no option "${e.key}" among ${JSON.stringify(it.payload.options)}`);
    continue;
  }
  // The evidence must actually be in the source. A rewrite justified by a phrase the
  // passage never contains is exactly the defect this is meant to remove, just pointed
  // the other way — so it is checked here rather than trusted. Reading items carry a
  // passage where listening items carry a transcript; both count.
  const source: string = it.payload.transcript ?? it.payload.passage ?? it.payload.text ?? "";
  if (!source.includes(e.evidence)) {
    refusals.push(`${e.file} · ${e.title} — source does not contain the cited evidence: "${e.evidence}"`);
    continue;
  }
  it.payload.question = e.to;
  it.answer.correctIndex = idx;
  applied.push(`${e.file}\n      ${e.title}\n      → ${e.to}\n      KEY ${e.key}   (source: "…${e.evidence}…")`);
}

if (refusals.length) {
  console.error(`REFUSING: ${refusals.length} edit(s) do not match the bank as reviewed:`);
  for (const r of refusals) console.error(`  ${r}`);
  process.exit(2);
}

// ── proof, computed on the edited items in memory ─────────────────────────────
// Grouped at exam::track::language::skill — the bundle a candidate actually sits. A split
// that is only even once two bundles are added together is not an even split.
const keyOf = (it: any) => it.payload.options[it.answer.correctIndex] as string;
const isTrue = (it: any) => /^richtig$/i.test(keyOf(it).trim());
const ABSOLUTE = /\b(alle[srnm]?|alles|nur|ganz|ganze[nrs]?|immer|jede[rns]?|ohne ende|höchstens)\b/i;

const pools = new Map<string, any[]>();
for (const [, bundle] of loaded) {
  for (const it of bundle) {
    if (it.taskType !== "TRUE_FALSE") continue;
    const k = `${it.exam}::${it.track}::${it.language}::${it.skill}`;
    if (!pools.has(k)) pools.set(k, []);
    pools.get(k)!.push(it);
  }
}

// DECIDABILITY — and a deliberately narrow claim about it.
//
// The first version of this check required every content word of the statement to appear
// in the transcript. It flagged 22 of 25 items in a pool that is fine, because that is
// not what decidable means:
//
//   "später als sonst"  vs  "erst um 9 Uhr 45 statt um 8 Uhr"   ← the comprehension
//   "mitbringen"        vs  "bringen Sie das Rezept mit"        ← a separable verb
//   "geöffnet"          vs  "bleibt die Apotheke geschlossen"   ← the negation
//
// Every one of those is the item working as intended. A check that condemns them is
// noise, and a noisy check gets ignored, which is worse than not having one. Whether a
// statement is genuinely settleable from the audio is an authoring judgement, and this
// script does not make it — beta-g does.
//
// What IS mechanically decidable: a statement that names a person the audio never
// mentions cannot be answered from the audio at all. No inference bridges that. So the
// check is narrowed to exactly that claim, and reported as exactly that claim.
const NAMED = /\b(?:Herr|Frau)\s+([A-ZÄÖÜ][\wäöüßćč]+)|\b(Sara|Tom|Marco)\b/g;
function unnamedInSource(statement: string, transcript: string): string[] {
  const out: string[] = [];
  for (const m of statement.matchAll(NAMED)) {
    const name = m[1] ?? m[2];
    if (name && !transcript.includes(name)) out.push(name);
  }
  return out;
}

// RED FIRST. A check that has only ever been seen green proves nothing about itself.
const redCaught = unnamedInSource("Aussage: Herr Kaufmann soll die Karte mitbringen.", "Guten Tag Herr Yusuf, bringen Sie Ihre Karte mit.");
const greenQuiet = unnamedInSource("Aussage: Herr Yusuf soll die Karte mitbringen.", "Guten Tag Herr Yusuf, bringen Sie Ihre Karte mit.");
if (redCaught.length !== 1 || greenQuiet.length !== 0) {
  console.error(`REFUSING: the decidability check does not work. red=${JSON.stringify(redCaught)} green=${JSON.stringify(greenQuiet)}`);
  process.exit(3);
}

console.log(`${applied.length} statement(s) re-authored across ${loaded.size} bundle(s):`);
for (const a of applied) console.log(`  · ${a}`);

const WAS: Record<string, string> = {
  "FIDE::CITIZENSHIP::DE::LISTENING": "8/17, 68%",
  "TELC_GOETHE::CERTIFICATE::DE::LISTENING": "4/2, 67%",
  "TELC_GOETHE::CERTIFICATE::DE::READING": "2/4, 67%",
};

let failures = 0;
for (const [name, pool] of [...pools].sort()) {
  const t = pool.filter(isTrue).length;
  const f = pool.length - t;
  const guess = Math.max(t, f) / pool.length;
  const abs = pool.filter((it) => ABSOLUTE.test(it.payload.question));
  const absTrue = abs.filter(isTrue).length;
  const stray: string[] = [];
  let named = 0;
  for (const it of pool) {
    const src: string = it.payload.transcript ?? it.payload.passage ?? it.payload.text ?? "";
    const s = unnamedInSource(it.payload.question, src);
    if (NAMED.test(it.payload.question)) named++;
    NAMED.lastIndex = 0;
    if (s.length) stray.push(`${it.title}: names ${s.join(", ")}, not in the source`);
  }

  const evenOk = guess < 0.6;
  // An absolute is only a leak if it appears at all AND always lands on the same side.
  const cueOk = abs.length === 0 || (absTrue > 0 && absTrue < abs.length);
  if (!evenOk || !cueOk || stray.length) failures++;

  console.log(`\n${name} — ${pool.length} item(s)${WAS[name] ? `   (was ${WAS[name]})` : ""}`);
  console.log(`  SPLIT        ${t} true / ${f} false — guessing one value scores ${(guess * 100).toFixed(0)}%   ${evenOk ? "OK" : "STILL SKEWED"}`);
  console.log(
    `  ABSOLUTES    ${abs.length} statement(s) contain one` +
      (abs.length ? `: ${absTrue} true, ${abs.length - absTrue} false — ${cueOk ? "the word no longer predicts the key" : "STILL PREDICTIVE"}` : " — no cue to break"),
  );
  console.log(`  DECIDABILITY ${named} name a person; ${stray.length} name someone the source never mentions`);
  for (const s of stray) console.log(`    ! ${s}`);
}

console.log(`\nRED-first proof passed — a swapped surname is caught, the real one is not.`);
console.log(`NARROW BY DESIGN: whether a statement is genuinely settleable from its source is an`);
console.log(`authoring judgement, and this does not claim to make it.`);

if (failures) {
  console.error(`\nREFUSING: ${failures} pool(s) did not come out clean.`);
  process.exit(1);
}

if (WRITE) {
  for (const [f, bundle] of loaded) fs.writeFileSync(path.join(DIR, f), `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.log(`\nWRITTEN to ${[...loaded.keys()].join(", ")}`);
} else {
  console.log(`\nDRY — nothing written. Staged for the batch.`);
}
