// RED-FIRST harness for the productive scoring layer.
//
//   npx tsx scripts/items/productive-harness.mts          (offline half — no metered call)
//   npx tsx scripts/items/productive-harness.mts --model  (NASIR'S GREEN ONLY — meters)
//
// Fixtures are authored by beta-g, not by the grader. A grader checked against its own
// text proves nothing: it would agree with itself.
//
// WHAT THE OFFLINE HALF CAN AND CANNOT PROVE. The deterministic layer measures length and
// duration. So it can prove that a short answer CANNOT be CLEAR — and it cannot say
// anything at all about a fluent, correctly-sized answer that ignores the question. Those
// fixtures (`fluent-off-task`, and the mis-scored guard, which is one of them) are marked
// PENDING-MODEL rather than counted as passes. Reporting them as green would be the exact
// blind-gate failure this harness exists to prevent.
//
// The harness's OWN ability to fail is proven offline, without any model: a stub grader
// that returns a constant CLEAR is run against every fixture, and the harness must flag
// every fixture whose expected band is not CLEAR. If that self-test reports no mismatch,
// the comparison logic is broken and nothing else in this file means anything.

import fs from "node:fs";
import path from "node:path";
import { getItemById } from "../../src/lib/ch/items";
import { evaluateDeterministic, capBand, viewOf, type Band } from "../../src/lib/ch/productive";

const USE_MODEL = process.argv.includes("--model");
const FIXTURES = path.join(process.cwd(), "scripts", "items", "fixtures", "productive-fixtures.json");

interface Fixture {
  itemId: string; title: string; lang: string; skill: string; cefr: string;
  kind: string; expectedBand: Band; response: string;
  spokenSeconds: number | null; trips: string[]; guard?: boolean; note?: string;
}
const doc = JSON.parse(fs.readFileSync(FIXTURES, "utf8")) as { authored_by: string; date: string; fixtures: Fixture[] };
const fixtures = doc.fixtures;

let pass = 0, fail = 0, pending = 0;
const failures: string[] = [];

function ok(label: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok      ${label}${detail}`); }
  else { fail++; failures.push(label); console.log(`  FAIL    ${label}${detail}`); }
}

console.log(`fixtures: ${fixtures.length} authored by ${doc.authored_by} (${doc.date})`);
console.log(`mode: ${USE_MODEL ? "MODEL (metered)" : "OFFLINE — deterministic half only, no metered call"}\n`);

// ── 0. every fixture must bind to a real bank item, and its trips to real criteria ──
console.log("── binding ──");
let unbound = 0, missing = 0;
for (const f of fixtures) {
  const item = getItemById(f.itemId);
  if (!item) { missing++; console.log(`  FAIL    fixture ${f.kind} → unknown itemId ${f.itemId}`); continue; }
  const crits = ((item.payload ?? {}) as { criteria?: string[] }).criteria ?? [];
  for (const t of f.trips) if (!crits.includes(t)) { unbound++; console.log(`  FAIL    ${f.itemId}/${f.kind}: trip not a bank criterion: ${t}`); }
}
ok("every fixture binds to a real bank item", missing === 0, `  (${fixtures.length} fixtures)`);
ok("every trip is an EXACT bank criterion string", unbound === 0);

// ── 1. deterministic expectations, per fixture kind ──
console.log("\n── deterministic half ──");
for (const f of fixtures) {
  const item = getItemById(f.itemId);
  if (!item) continue;
  const v = evaluateDeterministic(viewOf(item), f.response, {
    spokenSeconds: f.spokenSeconds ?? undefined,
  });
  const codes = v.vetoes.map((x) => x.code).join(",") || "none";
  const tag = `${f.itemId}/${f.kind}`.padEnd(30);

  if (f.kind === "known-good") {
    ok(`${tag} no veto → CLEAR reachable`, v.maxBand === "CLEAR", `   vetoes=${codes}`);
  } else if (f.kind === "on-task-thin") {
    ok(`${tag} length/duration veto caps below CLEAR`, v.maxBand !== "CLEAR", `   vetoes=${codes} max=${v.maxBand}`);
  } else if (f.kind === "known-bad") {
    ok(`${tag} veto fires, cannot be CLEAR`, v.maxBand !== "CLEAR", `   vetoes=${codes} max=${v.maxBand}`);
  } else {
    // fluent-off-task and the guard: correctly sized, fluent, wrong content.
    pending++;
    console.log(`  PENDING ${tag} deterministic cannot discriminate — needs the model   vetoes=${codes}`);
  }
}

// ── 2. the harness must be able to FAIL — proven with a stub, no model ──
console.log("\n── harness self-test (stub graders, no metered call) ──");
// TWO stubs, because one direction is not a discrimination test. A constant-CLEAR grader
// is not caught on the `on-task-thin` fixtures — and correctly so: the deterministic cap
// alone already lands those on BORDERLINE, which is their expected band. So each stub is
// asserted only where it SHOULD be caught.
function runStub(constant: Band) {
  const caught: string[] = [];
  for (const f of fixtures) {
    const item = getItemById(f.itemId);
    if (!item) continue;
    const v = evaluateDeterministic(viewOf(item), f.response, { spokenSeconds: f.spokenSeconds ?? undefined });
    if (capBand(constant, v) !== f.expectedBand) caught.push(`${f.itemId}/${f.kind}`);
  }
  return caught;
}
const belowExpected = fixtures.filter((f) => f.expectedBand === "BELOW");
const clearExpected = fixtures.filter((f) => f.expectedBand === "CLEAR");
const caughtByClear = runStub("CLEAR");
const caughtByBelow = runStub("BELOW");

ok("constant-CLEAR grader is caught on every BELOW-expected fixture",
   belowExpected.every((f) => caughtByClear.includes(`${f.itemId}/${f.kind}`)) && belowExpected.length > 0,
   `  (${belowExpected.length} BELOW-expected, ${caughtByClear.length} flagged)`);
ok("constant-BELOW grader is caught on every CLEAR-expected fixture",
   clearExpected.every((f) => caughtByBelow.includes(`${f.itemId}/${f.kind}`)) && clearExpected.length > 0,
   `  (${clearExpected.length} CLEAR-expected, ${caughtByBelow.length} flagged)`);
// The guard's MECHANISM is provable offline even though its verdict is not: if the grader
// returns BELOW for that response — which is what the content veto is for — the harness
// must report the CLEAR label as a mismatch. The constant-BELOW stub simulates exactly
// that, so the guard is shown to be wired, and only the real verdict is outstanding.
const guardKey = `r5whpu/MIS-SCORED-GUARD`;
ok("guard MECHANISM works: a BELOW verdict flags its CLEAR label",
   caughtByBelow.includes(guardKey));
ok("guard is NOT caught by a constant-CLEAR grader (it needs a real content verdict)",
   !caughtByClear.includes(guardKey));

// ── 3. the mis-scored guard ──
console.log("\n── mis-scored guard ──");
const guard = fixtures.find((f) => f.guard);
if (!guard) {
  ok("guard fixture present", false);
} else {
  const item = getItemById(guard.itemId)!;
  const v = evaluateDeterministic(viewOf(item), guard.response, { spokenSeconds: guard.spokenSeconds ?? undefined });
  console.log(`  guard is labelled ${guard.expectedBand}; deterministic ceiling is ${v.maxBand} (vetoes: ${v.vetoes.map((x) => x.code).join(",") || "none"})`);
  if (v.maxBand === "CLEAR") {
    pending++;
    console.log(`  PENDING the guard is fluent and correctly sized, so ONLY the model can catch it.`);
    console.log(`          It is NOT counted as a pass. Its mislabel is caught by the content`);
    console.log(`          verdict in the metered run, which has not been authorised.`);
  } else {
    // Reachable only if a future veto (e.g. OVER_LENGTH) catches the guard without a
    // model. Not the case today, and not something to assume.
    ok("guard is caught offline by a deterministic veto", true, `  (capped to ${v.maxBand})`);
  }
}

if (USE_MODEL) {
  console.error("\nREFUSING: --model meters an AI grading call and requires Nasir's explicit GREEN.");
  console.error("No metered call has been made.");
  process.exit(2);
}

console.log(`\n${pass} ok, ${fail} FAILED, ${pending} PENDING-MODEL`);
if (failures.length) { console.log("failing:"); for (const f of failures) console.log(`  - ${f}`); }
console.log(`\nOFFLINE HALF ONLY. ${pending} fixture(s) — every fluent-but-off-task response and the`);
console.log(`mis-scored guard — remain unproven until a metered run is authorised.`);
process.exit(fail ? 1 : 0);
