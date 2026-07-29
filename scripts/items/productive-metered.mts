// THE METERED HALF of the productive-scoring proof.
//
//   npx tsx scripts/items/productive-metered.mts                 (refuses — no GREEN)
//   npx tsx scripts/items/productive-metered.mts --green         (spends money)
//   npx tsx scripts/items/productive-metered.mts --green --max-usd 1.00
//
// WHAT THE OFFLINE HALF CANNOT DO. productive-harness.mts measures length and duration,
// so it can prove a short answer is not CLEAR and it can say nothing at all about a
// fluent, correctly-sized answer that ignores the question. Those fixtures sit at
// PENDING-MODEL rather than being counted as passes, because reporting them green is the
// blind-gate failure the harness exists to prevent. This file is the only thing that can
// move them, and it costs money to run — which is why it will not start without an
// explicit flag.
//
// TWO ASSERTIONS, BOTH OF WHICH CAN FAIL:
//   1. every fluent-off-task fixture must come back BELOW. If one returns CLEAR the
//      grader is content-blind — it is agreeing with fluency instead of reading the task.
//      That is a REAL FINDING and this script reports it as a FAIL. It does not get
//      "fixed" by editing the prompt until the number goes green; a grader tuned until
//      its own test passes has proven nothing except that it can be tuned.
//   2. the MIS-SCORED GUARD must FAIL. It is a fixture deliberately labelled with the
//      wrong expected band (CLEAR on an answer that is not). If the run reports it as a
//      pass, the comparison logic is broken and every other verdict in this file is
//      worthless. A harness that cannot fail is not evidence.
//
// IT GRADES THROUGH THE SHIPPING PROMPT. buildGradePrompt() is the same function
// /api/ch/grade calls; nothing here re-creates it. And it feeds the SERVER-AUTHORITATIVE
// path: a fixture supplies an itemId and a response, and the level, criteria and task
// text are loaded from the bank by id — exactly what the route does. Testing the old
// client-supplied shape would prove nothing about what ships.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { getItemById } from "../../src/lib/ch/items";
import { buildGradePrompt, parseFeedback, type Band } from "../../src/lib/ch/productive-prompt";
import { MODELS } from "../../src/lib/ai/models";

const GREEN = process.argv.includes("--green");
const SELFTEST = process.argv.includes("--selftest");
const maxIdx = process.argv.indexOf("--max-usd");
const MAX_USD = maxIdx >= 0 ? Number(process.argv[maxIdx + 1]) : 1.0;

// claude-sonnet-4-6 list price, USD per million tokens. Used ONLY to project a cost
// before spending and to price the actual usage after; the token counts themselves are
// the API's own numbers, never an estimate.
const USD_PER_M_IN = 3;
const USD_PER_M_OUT = 15;
const MAX_TOKENS = 700;

interface Fixture {
  itemId: string; title: string; lang: string; skill: string; cefr: string;
  kind: string; expectedBand: Band; response: string;
  spokenSeconds: number | null; trips: string[]; guard?: boolean; note?: string;
}

const FIXTURES = path.join(process.cwd(), "scripts", "items", "fixtures", "productive-fixtures.json");
const doc = JSON.parse(fs.readFileSync(FIXTURES, "utf8")) as { authored_by: string; date: string; fixtures: Fixture[] };

// The metered set: every fluent-off-task response, plus the mis-scored guard. These are
// exactly the fixtures the offline half marks PENDING-MODEL.
const metered = doc.fixtures.filter((f) => f.kind === "fluent-off-task" || f.guard);

if (metered.length === 0) {
  console.error("\n✗ REFUSING: 0 metered fixtures selected. A run that grades nothing cannot prove anything.");
  process.exit(1);
}

/** The verdict rule, isolated so it can be proven WITHOUT spending.
 *
 *  A normal fixture passes by MATCHING its expected band. The guard passes by
 *  MISMATCHING — it is deliberately mislabelled, so agreement means the comparison is
 *  broken. Both directions are exercised by --selftest below. */
function verdictOk(isGuard: boolean, got: Band | null, expected: Band): boolean {
  return isGuard ? got !== expected : got === expected;
}

// ── SELF-TEST: prove this harness CAN fail, before it is trusted to say it passed ──
// Free, no API call. The offline harness holds itself to the same rule ("a stub grader
// that returns a constant CLEAR must be flagged"), because a comparison that cannot
// report a mismatch would report every run as clean.
if (SELFTEST) {
  const cases: Array<[string, boolean, Band | null, Band, boolean]> = [
    ["off-task graded BELOW  → ok",            false, "BELOW",  "BELOW", true],
    ["off-task graded CLEAR  → FAIL",          false, "CLEAR",  "BELOW", false],
    ["off-task unparseable   → FAIL",          false, null,     "BELOW", false],
    ["guard mismatches label → ok",            true,  "BELOW",  "CLEAR", true],
    ["guard AGREES w/ label  → FAIL",          true,  "CLEAR",  "CLEAR", false],
  ];
  let bad = 0;
  for (const [label, guard, got, exp, want] of cases) {
    const actual = verdictOk(guard, got, exp);
    const good = actual === want;
    if (!good) bad++;
    console.log(`  ${good ? "ok  " : "FAIL"}  ${label}`);
  }
  console.log(`
${cases.length - bad} ok, ${bad} FAILED — comparison logic ${bad ? "IS BROKEN" : "can both pass and fail"}`);
  process.exit(bad ? 1 : 0);
}

// ── PRE-FLIGHT: say what it will do and what it will cost, BEFORE spending ──
const est = metered.map((f) => {
  const item = getItemById(f.itemId);
  if (!item) return { f, item: null, inTok: 0 };
  const { system, user } = buildGradePrompt(item, f.response);
  // ~4 chars/token is the usual English/German rule of thumb. Only used for the
  // projection; the invoice below is computed from the API's reported usage.
  return { f, item, inTok: Math.ceil((system.length + user.length) / 4) };
});

const missing = est.filter((e) => !e.item);
if (missing.length) {
  console.error(`\n✗ REFUSING: ${missing.length} fixture(s) name an itemId the bank does not serve:`);
  for (const m of missing) console.error(`    ${m.f.itemId}  ${m.f.title}`);
  console.error("  A fixture that cannot be loaded is not a passing fixture — fix the id or the bank.\n");
  process.exit(1);
}

const projIn = est.reduce((t, e) => t + e.inTok, 0);
const projOut = metered.length * MAX_TOKENS;
const projUsd = (projIn / 1e6) * USD_PER_M_IN + (projOut / 1e6) * USD_PER_M_OUT;

console.log(`\nMETERED RUN — productive scoring`);
console.log(`  model         ${MODELS.SONNET}`);
console.log(`  fixtures      ${metered.length} (${metered.filter((f) => !f.guard).length} fluent-off-task + ${metered.filter((f) => f.guard).length} mis-scored guard)`);
console.log(`  calls         ${metered.length}, max_tokens ${MAX_TOKENS} each`);
console.log(`  projected     ~${projIn.toLocaleString("en-US")} in / ≤${projOut.toLocaleString("en-US")} out  ≈ $${projUsd.toFixed(4)} (worst case)`);
console.log(`  ceiling       $${MAX_USD.toFixed(2)} (--max-usd)`);

if (projUsd > MAX_USD) {
  console.error(`\n✗ REFUSING: the worst-case projection $${projUsd.toFixed(4)} exceeds the $${MAX_USD.toFixed(2)} ceiling.`);
  console.error(`  Raise --max-usd deliberately, or reduce the fixture set. Nothing spent.\n`);
  process.exit(1);
}

if (!GREEN) {
  console.error(`\n✗ REFUSING: --green not given. This run meters a paid API call and is Nasir's to authorise.`);
  console.error(`  Nothing has been sent. Re-run with --green when authorised.\n`);
  process.exit(2);
}

const key = process.env.ANTHROPIC_API_KEY;
if (!key || key.length < 20 || key === "TODO_FOUNDER_PROVIDES") {
  console.error(`\n✗ REFUSING: ANTHROPIC_API_KEY is not set in this environment.`);
  console.error(`  The key is Nasir's to supply for the run; this script will not source one.`);
  console.error(`  Nothing has been sent.\n`);
  process.exit(1);
}

// ── THE RUN ─────────────────────────────────────────────────────────────────
const client = new Anthropic({ apiKey: key, maxRetries: 1 });
let inTok = 0, outTok = 0;
const rows: Array<{ f: Fixture; got: Band | null; ok: boolean; note: string }> = [];

for (const [i, e] of est.entries()) {
  const f = e.f;
  const { system, user } = buildGradePrompt(e.item!, f.response);
  process.stdout.write(`  [${i + 1}/${est.length}] ${f.itemId.padEnd(9)} ${f.kind.padEnd(16)} … `);
  let got: Band | null = null;
  try {
    const msg = await client.messages.create({
      model: MODELS.SONNET,
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: user }],
    });
    inTok += msg.usage.input_tokens;
    outTok += msg.usage.output_tokens;
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    got = parseFeedback(text)?.band ?? null;
  } catch (err) {
    console.log(`ERROR ${err instanceof Error ? err.message : String(err)}`);
    rows.push({ f, got: null, ok: false, note: "model call failed — could-not-prove, not a pass" });
    continue;
  }

  // The GUARD is labelled with the WRONG expected band on purpose. It passes this
  // harness only by MISMATCHING — if got === expected here, the comparison is broken.
  const ok = verdictOk(Boolean(f.guard), got, f.expectedBand);
  const note = f.guard
    ? (ok ? `guard mismatched as designed (got ${got}, mislabel said ${f.expectedBand})`
          : `GUARD AGREED WITH ITS OWN MISLABEL — the comparison logic is broken`)
    : (ok ? "" : `grader returned ${got} for an off-task answer — CONTENT-BLIND, a real finding`);
  rows.push({ f, got, ok, note });
  console.log(`${got ?? "unparseable"}  ${ok ? "ok" : "FAIL"}`);
}

// ── THE INVOICE, from the API's own usage numbers ───────────────────────────
const usd = (inTok / 1e6) * USD_PER_M_IN + (outTok / 1e6) * USD_PER_M_OUT;
console.log(`\n── per fixture ─────────────────────────────────────────────────`);
for (const r of rows) {
  const exp = r.f.guard ? `NOT ${r.f.expectedBand} (mislabelled)` : r.f.expectedBand;
  console.log(`  ${r.ok ? "ok  " : "FAIL"}  ${r.f.itemId.padEnd(9)} expected ${String(exp).padEnd(24)} got ${String(r.got ?? "unparseable").padEnd(12)} ${r.note}`);
}

const failed = rows.filter((r) => !r.ok);
console.log(`\n── spend (ACTUAL, from API usage) ──────────────────────────────`);
console.log(`  input   ${inTok.toLocaleString("en-US")} tokens`);
console.log(`  output  ${outTok.toLocaleString("en-US")} tokens`);
console.log(`  cost    $${usd.toFixed(4)}   (ceiling was $${MAX_USD.toFixed(2)})`);
console.log(`\n${rows.length - failed.length} ok, ${failed.length} FAILED`);

if (failed.length) {
  console.log(`\nThese are findings, not tuning targets. A fluent-off-task answer coming back`);
  console.log(`CLEAR means the grader is agreeing with fluency instead of reading the task —`);
  console.log(`report it, do not edit the prompt until the number turns green.`);
  process.exit(1);
}
console.log(`\n✓ METERED PROOF: every fluent-off-task answer was graded BELOW, and the`);
console.log(`  mis-scored guard was caught by mismatching its own label.`);
