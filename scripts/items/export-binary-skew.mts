// EXPORT the True/False pools that a candidate can beat by guessing.
//
//   npx tsx scripts/items/export-binary-skew.mts
//
// Writes reports/binary-skew.txt — every binary pool with its split, and for the flagged
// ones the full authoring material: stem, statement, current key, and the passage or
// transcript the statement is supposed to be decidable from.
//
// TWO SEPARATE DEFECTS, and they need different fixes:
//
//   SKEW      the keys are lopsided, so answering the majority label every time scores
//             well above chance. Fixable by re-authoring statements so the split evens
//             out — beta-g's job, and the reason this export exists.
//
//   AT FLOOR  an ODD, small pool cannot be balanced at all. Three items are 2/1 however
//             they are keyed, which is 67% to a candidate who answers one value
//             throughout. No re-keying fixes that; the pool needs more items. Saying
//             "re-balance it" would be advice that cannot be followed.
//
// The verdict is computed from the ACHIEVABLE floor, not from a size threshold. An
// earlier version used "fewer than 7 items" and so called the 6-item telc pools
// unfixable — wrong, since 6 reaches 3/3 by flipping one item. It would have sent an
// author away from work that was entirely doable.
//
// The key is resolved by LABEL, never by index. Reading correctIndex as "0 means true"
// assumes every item lists the options in the same order, and an item that happens to
// list Falsch first would then be counted as its own opposite — a silent miscount in the
// exact number this report exists to produce.

import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "src", "data", "items");
const OUT = path.join(process.cwd(), "reports", "binary-skew.txt");

/** Majority share below which a pool is considered honest. 0.60 leaves room for the
 *  natural unevenness of an odd-sized pool without waving through a real lean. */
const GUESSABLE = 0.6;

const TRUEISH = /^(richtig|vrai|wahr|true|ja|oui|corretto|vero)$/i;
const FALSEISH = /^(falsch|faux|false|nein|non|falso|scorretto)$/i;

type Item = {
  file: string;
  language: string;
  exam: string;
  track: string;
  skill: string;
  title: string;
  prompt: string;
  statement: string;
  options: string[];
  key: string;
  keyClass: "TRUE" | "FALSE" | "?";
  source: string;
  sourceKind: string;
};

const items: Item[] = [];
const unresolved: string[] = [];

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".json"))) {
  for (const it of JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as any[]) {
    if (it.taskType !== "TRUE_FALSE") continue;
    const p = it.payload ?? {};
    const options: string[] = p.options ?? [];
    const idx = it.answer?.correctIndex;
    const key = typeof idx === "number" ? options[idx] : undefined;

    let keyClass: Item["keyClass"] = "?";
    if (key && TRUEISH.test(key.trim())) keyClass = "TRUE";
    else if (key && FALSEISH.test(key.trim())) keyClass = "FALSE";
    else unresolved.push(`${f} · ${it.title} — key ${JSON.stringify(key)} matched neither label set`);

    const sourceKind = p.transcript ? "transcript" : p.passage ? "passage" : p.text ? "text" : "none";
    items.push({
      file: f,
      language: it.language,
      exam: it.exam,
      track: it.track,
      skill: it.skill,
      title: it.title ?? "",
      prompt: it.prompt ?? "",
      statement: p.question ?? "",
      options,
      key: key ?? "(unresolved)",
      keyClass,
      source: p.transcript ?? p.passage ?? p.text ?? "",
      sourceKind,
    });
  }
}

// An unresolved key would silently shrink one side of every split below. Refuse rather
// than report a number computed from a partial count.
if (unresolved.length) {
  console.error(`REFUSING: ${unresolved.length} key(s) could not be read as true or false:`);
  for (const u of unresolved.slice(0, 8)) console.error(`  ${u}`);
  process.exit(2);
}

// POOL = the bundle a candidate actually sits, which is exam + TRACK + language + skill.
// Grouping without `track` merged fide-c-permit and getting-started into the main FIDE
// citizenship pools and reported FIDE::DE::LISTENING as n=31 at 68%. Both numbers were
// wrong in the same direction: the citizenship set is 25 items, and the two 3-item pools
// disappeared inside it entirely. Someone sitting getting-started German listening sees
// three statements, not thirty-one, and a pool that is only honest once it is averaged
// with a bigger one is not honest.
type Pool = { name: string; file: string; items: Item[] };
const pools = new Map<string, Pool>();
for (const it of items) {
  const name = `${it.exam}::${it.track}::${it.language}::${it.skill}`;
  if (!pools.has(name)) pools.set(name, { name, file: it.file, items: [] });
  const pool = pools.get(name)!;
  pool.items.push(it);
  if (!pool.file.includes(it.file)) pool.file = `${pool.file}, ${it.file}`;
}

type Verdict = "OK" | "SKEWED" | "AT FLOOR";
const scored = [...pools.values()].map((p) => {
  const n = p.items.length;
  const t = p.items.filter((i) => i.keyClass === "TRUE").length;
  const f = n - t;
  const guess = Math.max(t, f) / n;
  // The best any re-authoring can reach. An EVEN pool reaches 50%; an odd one cannot —
  // three items are 2/1 however they are keyed. The earlier version of this used a size
  // threshold instead and called every pool under 7 "too small, cannot be evened", which
  // was wrong for the 6-item telc pools: those reach 3/3 by flipping one item, and the
  // report was about to send an author away from work that is entirely doable.
  const floor = Math.ceil(n / 2) / n;
  const verdict: Verdict = floor >= GUESSABLE ? "AT FLOOR" : guess >= GUESSABLE ? "SKEWED" : "OK";
  return { ...p, n, t, f, guess, floor, verdict };
}).sort((a, b) => b.guess - a.guess || b.items.length - a.items.length);

// ── the report ────────────────────────────────────────────────────────────────
const L: string[] = [
  "ALMISWISS — BINARY POOLS: WHAT A CANDIDATE SCORES BY GUESSING",
  "",
  `${items.length} TRUE_FALSE item(s) across ${scored.length} pool(s).`,
  "",
  "'guess' = what someone who answers the SAME value on every item in the pool scores.",
  "50% is the floor for a fair binary set; anything above it is marks for no knowledge.",
  "",
  "  verdict     what it means and what fixes it",
  "  OK          split is even enough; nothing to author",
  `  SKEWED      one label pays ≥ ${Math.round(GUESSABLE * 100)}% AND the pool can be evened — re-author until it is`,
  `  AT FLOOR    the best split this pool can reach is itself ≥ ${Math.round(GUESSABLE * 100)}%, because the item count is`,
  "              odd and small: three items are 2/1 (67%) however they are keyed. Re-keying",
  "              cannot fix this one — it needs MORE ITEMS.",
  "",
  "  guess   n    true/false   verdict     pool",
  "  " + "-".repeat(74),
];
for (const p of scored) {
  L.push(
    `  ${(p.guess * 100).toFixed(0).padStart(4)}%  ${String(p.items.length).padStart(3)}` +
      `   ${String(p.t).padStart(4)}/${String(p.f).padEnd(4)}  ${p.verdict.padEnd(10)}  ${p.name}`,
  );
}

const flagged = scored.filter((p) => p.verdict !== "OK");
L.push(
  "",
  "",
  "=".repeat(78),
  `AUTHORING MATERIAL — ${flagged.length} pool(s) to fix, ${flagged.reduce((n, p) => n + p.items.length, 0)} item(s)`,
  "=".repeat(78),
  "",
  "Each item below carries the stem, the statement, the current key and the source it is",
  "meant to be decidable from. Two things to check per item, not one:",
  "",
  "  1. the SPLIT — flipping a key means re-writing the statement so the new key is the",
  "     true one, not just moving the answer",
  "  2. DECIDABILITY — the statement must be settleable from the source alone. A statement",
  "     needing outside knowledge, or one that only restates the source verbatim, is not a",
  "     comprehension item even when its key is correct.",
);

for (const p of flagged) {
  L.push(
    "",
    "",
    "─".repeat(78),
    `${p.name}   ${p.file}`,
    `${p.items.length} item(s) · ${p.t} true / ${p.f} false · guessing one value scores ${(p.guess * 100).toFixed(0)}%`,
    p.verdict === "TOO SMALL"
      ? `VERDICT: TOO SMALL — cannot be evened by re-authoring. Best possible here is ${(Math.ceil(p.items.length / 2) / p.items.length * 100).toFixed(0)}%.`
      : `VERDICT: SKEWED — to reach an even split, ${Math.abs(p.t - p.f) >> 1} item(s) need to change side.`,
    "─".repeat(78),
  );

  // Group by source so a re-author can see every statement resting on the same text —
  // flipping one key can make two statements about the same passage contradict.
  const bySource = new Map<string, Item[]>();
  for (const it of p.items) {
    const k = it.source || `(no source) ${it.title}`;
    if (!bySource.has(k)) bySource.set(k, []);
    bySource.get(k)!.push(it);
  }

  let n = 0;
  for (const [src, group] of bySource) {
    const kind = group[0].sourceKind;
    L.push("", `  ${kind.toUpperCase()} — ${group.length} statement(s) rest on this:`);
    if (kind === "none") L.push(`    (none — this item is answered from knowledge, not from a text)`);
    else for (const line of src.split("\n")) L.push(`    | ${line}`);
    for (const it of group) {
      n++;
      L.push(
        "",
        `    [${String(n).padStart(2)}] ${it.title}`,
        `         stem      : ${it.prompt}`,
        `         statement : ${it.statement}`,
        `         options   : ${it.options.join(" / ")}`,
        `         KEY       : ${it.key}   (${it.keyClass})`,
      );
    }
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, L.join("\n"), "utf8");

console.log(`${items.length} TRUE_FALSE item(s), ${scored.length} pool(s)`);
for (const p of scored) {
  console.log(`  ${(p.guess * 100).toFixed(0).padStart(4)}%  n=${String(p.items.length).padStart(3)}  ${p.t}/${p.f}  ${p.verdict.padEnd(10)}  ${p.name}`);
}
console.log(`\n${flagged.length} pool(s) need authoring → ${path.relative(process.cwd(), OUT)}`);
