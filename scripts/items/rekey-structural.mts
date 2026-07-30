// STRUCTURAL RE-KEY — make MATCHING and ORDERING items require reading.
//
// THE DEFECT THIS EXISTS FOR. A MATCHING key of [[0,0],[1,1],[2,2],[3,3]] pairs row n
// with row n, so "pair them straight down" scores 100% with no German or French at all.
// An ORDERING key of [0,1,2,3] means the steps are already printed in the right order,
// so pressing submit untouched scores full marks. Neither is caught by the position
// rule in answer-distribution-gate.mts, which excludes MATCHING and ORDERING precisely
// because no SINGLE index gives them away — the giveaway is the shape of the whole key.
//
// WHAT ACTUALLY BIT THIS BANK. Not the identity. The hardened deep audit found ONE live
// item — fide C-permit German LISTENING "Vier Anrufe am Arbeitsplatz" — keyed
// [[0,4],[1,2],[2,1],[3,0]]: three of its four pairs run bottom-to-top, so "pair them in
// reverse" scored 75% without listening. Reading the column up the page instead of down
// is not a meaningfully harder task than reading it down, so the anti-diagonal is scored
// on exactly the same footing as the diagonal, and NEAR-degeneracy counts as degeneracy.
//
// CONSTRAIN THE RESULT, NOT THE TRANSFORMATION. Backported from AlmiIceland via AlmiDutch,
// where it actually bit. Deranging the right column is a proxy for "the key is no longer
// trivial" that holds ONLY when the key started AS the identity. Swiss keys are mostly
// already non-identity, so permuting the column can land the RESULT on a degenerate key
// and make a good item gameable. The permutation is therefore redrawn until the resulting
// KEY passes the predicate, which is the property actually wanted.
//
// THREE AXES, NOT TWO. The audit measures the anti-diagonal as r === pairs.length-1-l.
// A Swiss MATCHING item usually prints MORE right options than there are left rows —
// "Vier Anrufe" has 4 rows and 5 options — so there is a second bottom-to-top reading,
// r === right.length-1-l, over the column as the learner actually sees it. Passing the
// audit's definition alone would leave that one open. All three shares are held under
// threshold. Nothing here is scored above 25% on any axis.
//
// ONLY FAILING ITEMS ARE TOUCHED. A key that already passes is left byte-for-byte alone.
// This is a repair, not a reshuffle: 36 of the bank's 37 structural keys are fine and
// must not move, both because churn is not a fix and because every unnecessary line in
// the diff is a line nobody reads.
//
// EDITS ARE SURGICAL. These bundles are hand-formatted — some arrays inline, some one
// element per line, CRLF throughout. JSON.parse → JSON.stringify would reformat every
// byte of the file and bury the one real change. So the raw text is spliced: the option
// column's element spans are REORDERED (their text is never rebuilt, so content cannot
// drift) and the key's numbers are re-emitted in the style already present.
//
// VERIFIED AFTER THE FACT AGAINST THE UNTOUCHED ORIGINAL. Every left-text→right-text
// pairing and every reconstructed ORDERING text sequence must be identical to what was
// there before, and every touched key must pass the predicate. If one differs the run
// writes nothing.
//
// Deterministic, seeded per item, so re-running reproduces the same bank exactly.
//
// Run: npx tsx scripts/items/rekey-structural.mts [--dry]

import fs from "node:fs";
import path from "node:path";
// The predicate is SHARED with answer-distribution-gate.mts. Redrawing until a key
// satisfies a rule the build gate does not enforce — or vice versa — is how the two
// drift apart, so neither owns the definition.
import { NEAR_DEGENERATE, matchingReadings, orderingReadings, worstReading } from "./structural-degeneracy.mjs";

const DRY = process.argv.includes("--dry");
const ITEMS_DIR = path.join(process.cwd(), "src", "data", "items");

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(n: number, rng: () => number): number[] {
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

// ── THE PREDICATE, thin wrappers over the shared module ─────────────────────
// The worst share across every no-language reading of the key. Under NEAR_DEGENERATE
// the item requires reading; at or above it, it does not.
const matchingWorstShare = (pairs: number[][], nRight: number) =>
  worstReading(matchingReadings(pairs, nRight), pairs.length)?.share ?? 0;
const orderingWorstShare = (order: number[]) =>
  worstReading(orderingReadings(order), order.length)?.share ?? 0;

// ── RAW-TEXT SURGERY ────────────────────────────────────────────────────────

/** Index just past the `]` that closes the `[` at `open`. String-aware. */
function matchBracket(text: string, open: number): number {
  let depth = 0, inStr = false, esc = false;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) return i + 1; }
  }
  throw new Error("unterminated array");
}

// A slot's surrounding whitespace belongs to the SLOT, not to the element sitting in it.
// Carrying the trailing run along with the element drags the newline before the closing
// bracket into whatever position that element lands in, which reflows the array. Only
// `core` ever moves.
type Span = { lead: string; core: string; trail: string };

/** Split an array's inner text into per-element spans, keeping each element's own text
 *  and the whitespace that precedes it separate — so a REORDER moves cores between
 *  fixed slots and the file's layout (inline or one-per-line) is untouched. */
function splitElements(inner: string): Span[] {
  const parts: string[] = [];
  let depth = 0, inStr = false, esc = false, start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) { parts.push(inner.slice(start, i)); start = i + 1; }
  }
  parts.push(inner.slice(start));
  return parts.map((p) => {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(p)!;
    return { lead: m[1], core: m[2], trail: m[3] };
  });
}
function joinElements(spans: Span[]): string {
  return spans.map((s, i) => (i ? "," : "") + s.lead + s.core + s.trail).join("");
}

/** Locate `"<key>": [` after `from`, bounded by `until`, and return its span. */
function findArray(raw: string, key: string, from: number, until: number) {
  const needle = `"${key}":`;
  const at = raw.indexOf(needle, from);
  if (at < 0 || at >= until) throw new Error(`"${key}" not found in item span`);
  const open = raw.indexOf("[", at);
  if (open < 0 || open >= until) throw new Error(`"${key}" is not an array`);
  const close = matchBracket(raw, open);
  return { open, close, inner: raw.slice(open + 1, close - 1) };
}

/** The character range of the item whose title is `title` — from its title to the start
 *  of the next item's title (or EOF). Fails unless the title occurs exactly once. */
function itemSpan(raw: string, title: string) {
  const needle = `"title": ${JSON.stringify(title)}`;
  const first = raw.indexOf(needle);
  if (first < 0) throw new Error(`title not found verbatim: ${title}`);
  if (raw.indexOf(needle, first + 1) >= 0) throw new Error(`title is not unique in file: ${title}`);
  const next = raw.indexOf(`"title":`, first + needle.length);
  return { from: first, until: next < 0 ? raw.length : next };
}

// ── RUN ─────────────────────────────────────────────────────────────────────

const files = fs.readdirSync(ITEMS_DIR).filter((f) => f.endsWith(".json")).sort();
const before = new Map<string, any[]>();
const rawNow = new Map<string, string>();
for (const f of files) {
  const raw = fs.readFileSync(path.join(ITEMS_DIR, f), "utf8");
  rawNow.set(f, raw);
  before.set(f, JSON.parse(raw));
}

const pc = (v: number) => `${Math.round(v * 100)}%`;
const touched: string[] = [];
const untouched: string[] = [];
const failures: string[] = [];

for (const file of files) {
  for (const it of before.get(file)!) {
    const a = it.answer;
    if (!a) continue;
    const seed = hashSeed(`${it.track}|${it.exam}|${it.skill}|${it.title}`);
    const label = `${file} · ${it.title}`;

    if (a.type === "MATCHING") {
      const right: string[] = it.payload?.right ?? [];
      const pairs: number[][] = a.pairs ?? [];
      const was = matchingWorstShare(pairs, right.length);
      if (was < NEAR_DEGENERATE) { untouched.push(`${label} — worst ${pc(was)}`); continue; }

      // Redraw the COLUMN until the resulting KEY passes; keep the best draw seen.
      let best: { perm: number[]; pairs: number[][]; share: number } | null = null;
      for (let attempt = 0; attempt < 512; attempt++) {
        const perm = shuffle(right.length, mulberry32(seed + attempt));   // newRight[k] = right[perm[k]]
        const posOf = new Map<number, number>();
        perm.forEach((src, k) => posOf.set(src, k));
        const cand = pairs.map(([l, r]) => [l, posOf.get(r)!]);
        const share = matchingWorstShare(cand, right.length);
        if (share < NEAR_DEGENERATE && (!best || share < best.share)) best = { perm, pairs: cand, share };
        if (best && best.share === 0) break;
      }
      if (!best) { failures.push(`${label}: no acceptable MATCHING key found in 512 draws`); continue; }

      let raw = rawNow.get(file)!;
      const { from, until } = itemSpan(raw, it.title);
      const rArr = findArray(raw, "right", from, until);
      const spans = splitElements(rArr.inner);
      if (spans.length !== right.length) { failures.push(`${label}: right column split to ${spans.length}, expected ${right.length}`); continue; }
      const reordered = spans.map((s, k) => ({ ...s, core: spans[best!.perm[k]].core }));
      raw = raw.slice(0, rArr.open + 1) + joinElements(reordered) + raw.slice(rArr.close - 1);

      // The key sits AFTER the column, so re-locate on the already-spliced text.
      const span2 = itemSpan(raw, it.title);
      const pArr = findArray(raw, "pairs", span2.from, span2.until);
      const pSpans = splitElements(pArr.inner);
      if (pSpans.length !== pairs.length) { failures.push(`${label}: pairs split to ${pSpans.length}, expected ${pairs.length}`); continue; }
      const gap = /,\s/.test(pSpans[0].core) ? ", " : ",";   // keep the file's own spacing
      const keyed = pSpans.map((s, k) => ({ ...s, core: `[${best!.pairs[k][0]}${gap}${best!.pairs[k][1]}]` }));
      raw = raw.slice(0, pArr.open + 1) + joinElements(keyed) + raw.slice(pArr.close - 1);

      rawNow.set(file, raw);
      touched.push(`${label}\n      MATCHING  ${pc(was)} → ${pc(best.share)}   key ${JSON.stringify(pairs)} → ${JSON.stringify(best.pairs)}`);
    }

    if (a.type === "ORDERING") {
      const items: string[] = it.payload?.items ?? [];
      const order: number[] = a.order ?? [];
      const was = orderingWorstShare(order);
      if (was < NEAR_DEGENERATE) { untouched.push(`${label} — worst ${pc(was)}`); continue; }

      const correctTexts = order.map((idx) => items[idx]);
      let best: { perm: number[]; order: number[]; share: number } | null = null;
      for (let attempt = 0; attempt < 512; attempt++) {
        const perm = shuffle(items.length, mulberry32(seed + attempt));   // newItems[k] = items[perm[k]]
        const cand = perm.map((src) => items[src]);
        const used = new Set<number>();
        const ord = correctTexts.map((t) => {
          const k = cand.findIndex((x, idx) => x === t && !used.has(idx));
          used.add(k);
          return k;
        });
        if (ord.some((k) => k < 0)) continue;
        const share = orderingWorstShare(ord);
        if (share < NEAR_DEGENERATE && (!best || share < best.share)) best = { perm, order: ord, share };
        if (best && best.share === 0) break;
      }
      if (!best) { failures.push(`${label}: no acceptable ORDERING key found in 512 draws`); continue; }

      let raw = rawNow.get(file)!;
      const { from, until } = itemSpan(raw, it.title);
      const iArr = findArray(raw, "items", from, until);
      const spans = splitElements(iArr.inner);
      if (spans.length !== items.length) { failures.push(`${label}: items split to ${spans.length}, expected ${items.length}`); continue; }
      const reordered = spans.map((s, k) => ({ ...s, core: spans[best!.perm[k]].core }));
      raw = raw.slice(0, iArr.open + 1) + joinElements(reordered) + raw.slice(iArr.close - 1);

      const span2 = itemSpan(raw, it.title);
      const oArr = findArray(raw, "order", span2.from, span2.until);
      const oSpans = splitElements(oArr.inner);
      if (oSpans.length !== order.length) { failures.push(`${label}: order split to ${oSpans.length}, expected ${order.length}`); continue; }
      const keyed = oSpans.map((s, k) => ({ ...s, core: String(best!.order[k]) }));
      raw = raw.slice(0, oArr.open + 1) + joinElements(keyed) + raw.slice(oArr.close - 1);

      rawNow.set(file, raw);
      touched.push(`${label}\n      ORDERING  ${pc(was)} → ${pc(best.share)}   key ${JSON.stringify(order)} → ${JSON.stringify(best.order)}`);
    }
  }
}

// ── VERIFY AGAINST THE UNTOUCHED ORIGINALS ──────────────────────────────────
const breaks: string[] = [];
for (const file of files) {
  const was = before.get(file)!;
  let now: any[];
  try { now = JSON.parse(rawNow.get(file)!); }
  catch (e: any) { breaks.push(`${file}: no longer parses as JSON — ${e.message}`); continue; }
  if (now.length !== was.length) { breaks.push(`${file}: item count changed ${was.length} → ${now.length}`); continue; }

  now.forEach((it: any, i: number) => {
    const b = was[i];
    if (JSON.stringify({ ...it, payload: null, answer: null }) !== JSON.stringify({ ...b, payload: null, answer: null })) {
      breaks.push(`${file}[${i}] "${it.title}": a field outside payload/answer changed`);
    }
    const a = it.answer, ba = b.answer;
    if (!a || !ba) return;
    if (a.type !== ba.type) breaks.push(`${file}[${i}] "${it.title}": answer.type changed`);

    if (a.type === "MATCHING") {
      const nowPairs = a.pairs.map(([l, r]: number[]) => `${it.payload.left[l]} => ${it.payload.right[r]}`).sort().join(" | ");
      const wasPairs = ba.pairs.map(([l, r]: number[]) => `${b.payload.left[l]} => ${b.payload.right[r]}`).sort().join(" | ");
      if (nowPairs !== wasPairs) breaks.push(`${file}[${i}] "${it.title}": MATCHING pairing changed\n      was: ${wasPairs}\n      now: ${nowPairs}`);
      if ([...it.payload.right].sort().join(" ") !== [...b.payload.right].sort().join(" ")) {
        breaks.push(`${file}[${i}] "${it.title}": the right column is not a reordering of the original — text changed`);
      }
      const share = matchingWorstShare(a.pairs, it.payload.right.length);
      if (share >= NEAR_DEGENERATE) breaks.push(`${file}[${i}] "${it.title}": MATCHING key is STILL ${pc(share)} answerable with no language`);
    }
    if (a.type === "ORDERING") {
      const nowSeq = a.order.map((k: number) => it.payload.items[k]).join(" | ");
      const wasSeq = ba.order.map((k: number) => b.payload.items[k]).join(" | ");
      if (nowSeq !== wasSeq) breaks.push(`${file}[${i}] "${it.title}": ORDERING sequence changed\n      was: ${wasSeq}\n      now: ${nowSeq}`);
      if ([...it.payload.items].sort().join(" ") !== [...b.payload.items].sort().join(" ")) {
        breaks.push(`${file}[${i}] "${it.title}": the step list is not a reordering of the original — text changed`);
      }
      const share = orderingWorstShare(a.order);
      if (share >= NEAR_DEGENERATE) breaks.push(`${file}[${i}] "${it.title}": ORDERING key is STILL ${pc(share)} answerable with no language`);
    }
  });
}

console.log(`structural items scanned: ${touched.length + untouched.length}   re-keyed: ${touched.length}   already sound: ${untouched.length}`);
if (touched.length) { console.log("\nre-keyed:"); touched.forEach((t) => console.log("  " + t)); }
if (failures.length) {
  console.error(`\n✗ ${failures.length} item(s) could not be re-keyed — writing NOTHING:\n`);
  failures.forEach((f) => console.error("  " + f));
  process.exit(1);
}
if (breaks.length) {
  console.error(`\n✗ CORRECTNESS BROKEN in ${breaks.length} place(s) — writing NOTHING:\n`);
  breaks.slice(0, 10).forEach((b) => console.error("  " + b));
  process.exit(1);
}
console.log("\n✓ correctness preserved: every MATCHING keeps the same left-text→right-text pairings, every ORDERING reconstructs the same text sequence, no option text changed, and no key is answerable without reading.");

if (DRY) {
  console.log("\n--dry: no files written.");
} else {
  let written = 0;
  for (const file of files) {
    const raw = rawNow.get(file)!;
    if (raw === fs.readFileSync(path.join(ITEMS_DIR, file), "utf8")) continue;   // byte-identical → leave alone
    fs.writeFileSync(path.join(ITEMS_DIR, file), raw, "utf8");
    written++;
  }
  console.log(`\nwrote ${written} bundle(s); ${files.length - written} left byte-for-byte alone.`);
}
