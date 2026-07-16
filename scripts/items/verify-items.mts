// Item-bank integrity gate. Run: npx tsx scripts/items/verify-items.mts
//
// "It loads" is not "it is correct". A JSON bundle can parse perfectly and still
// teach the wrong answer — a correctIndex pointing past the options, a CLOZE key
// for a gap that isn't in the passage, a MATCHING pair indexing a row that doesn't
// exist. None of that throws at runtime; the learner just gets marked wrong for
// being right. So every key is graded against its own payload with the real
// engine: if the correct answer doesn't score full marks, the key is wrong.
//
// Also enforces Rule #7 (>=15 tasks per module per language track) so a module
// cannot quietly ship half-built.

import { itemsForSurface, BUNDLE_FILES } from "../../src/lib/ch/items";
import { gradeObjective } from "../../src/lib/ch/grading";
import { ALL_EXAMS, MIN_TASKS_PER_MODULE } from "../../src/lib/ch/registry";
import { isObjectiveTask } from "../../src/lib/ch/types";
import type { SwissItemSeed } from "../../src/lib/ch/items";

const problems: string[] = [];
const note = (it: SwissItemSeed, m: string) => problems.push(`${it.language}/${it.exam}/${it.skill} "${it.title}": ${m}`);

function checkItem(it: SwissItemSeed) {
  const p = it.payload as Record<string, unknown>;
  const a = it.answer as Record<string, unknown> | null;

  if (isObjectiveTask(it.taskType)) {
    if (!a) return note(it, "objective task has no answer key");
    if (a.type !== it.taskType) note(it, `answer.type "${a.type}" != taskType "${it.taskType}"`);
  } else if (a) {
    note(it, "productive task must not carry an answer key");
  }
  if (!a) return;

  switch (a.type) {
    case "MCQ_SINGLE":
    case "TRUE_FALSE": {
      const opts = p.options as unknown[] | undefined;
      if (!Array.isArray(opts)) return note(it, "no options array");
      const idx = a.correctIndex as number;
      if (typeof idx !== "number" || idx < 0 || idx >= opts.length) return note(it, `correctIndex ${idx} out of range (${opts.length} options)`);
      if (new Set(opts.map(String)).size !== opts.length) note(it, "duplicate options — more than one answer could be 'correct'");
      if (gradeObjective(a as never, { index: idx }).points !== 1) note(it, "key does not self-grade");
      break;
    }
    case "MATCHING": {
      const left = p.left as unknown[], right = p.right as unknown[];
      const pairs = a.pairs as [number, number][];
      for (const [l, r] of pairs) {
        if (l < 0 || l >= left.length) note(it, `pair left index ${l} out of range`);
        if (r < 0 || r >= right.length) note(it, `pair right index ${r} out of range`);
      }
      if (new Set(pairs.map(([l]) => l)).size !== pairs.length) note(it, "a left row is matched twice");
      const g = gradeObjective(a as never, { pairs });
      if (g.points !== pairs.length) note(it, "key does not self-grade");
      if (g.maxPoints !== it.maxPoints) note(it, `maxPoints ${it.maxPoints} != key's ${g.maxPoints}`);
      break;
    }
    case "CLOZE": {
      const gaps = p.gaps as { id: number; options: string[] }[];
      const correct = a.correct as { id: number; index: number }[];
      const markers = ((p.passage as string).match(/\{\{\d+\}\}/g) ?? []).length;
      if (markers !== gaps.length) note(it, `passage has ${markers} {{n}} markers but ${gaps.length} gaps`);
      if (correct.length !== gaps.length) note(it, `${gaps.length} gaps but ${correct.length} answers`);
      for (const c of correct) {
        const gap = gaps.find((g) => g.id === c.id);
        if (!gap) { note(it, `answer for gap id ${c.id}, which does not exist`); continue; }
        if (c.index < 0 || c.index >= gap.options.length) note(it, `gap ${c.id} index ${c.index} out of range`);
      }
      const g = gradeObjective(a as never, { gaps: correct });
      if (g.points !== correct.length) note(it, "key does not self-grade");
      if (g.maxPoints !== it.maxPoints) note(it, `maxPoints ${it.maxPoints} != key's ${g.maxPoints}`);
      break;
    }
    case "ORDERING": {
      const items = p.items as unknown[];
      const order = a.order as number[];
      if (order.length !== items.length) note(it, `order has ${order.length} entries for ${items.length} items`);
      if (new Set(order).size !== order.length) note(it, "order repeats an index");
      if (gradeObjective(a as never, { order }).points !== 1) note(it, "key does not self-grade");
      break;
    }
    default:
      note(it, `unknown answer type "${a.type}"`);
  }
}

// ---- per-item integrity ----
const allSeen: SwissItemSeed[] = [];
for (const e of ALL_EXAMS) {
  for (const skill of e.skills) {
    const items = itemsForSurface(e, skill);
    for (const it of items) {
      // An item must agree with the bundle it was filed under, or the tree and the
      // content disagree about what the learner is practising.
      if (it.track !== e.track) note(it, `filed under ${e.slug} (track ${e.track}) but declares track ${it.track}`);
      checkItem(it);
      allSeen.push(it);
    }
  }
}

// ---- duplicate detection: same question twice is padding, not coverage ----
const byTitle = new Map<string, number>();
for (const it of allSeen) {
  const k = `${it.language}|${it.exam}|${it.skill}|${it.title}`;
  byTitle.set(k, (byTitle.get(k) ?? 0) + 1);
}
for (const [k, n] of byTitle) if (n > 1) problems.push(`duplicate title x${n}: ${k}`);

// ---- Rule #7 readiness, per module per language track ----
console.log("Module readiness (Rule #7: >=" + MIN_TASKS_PER_MODULE + " per module per language track)\n");
const shortfalls: string[] = [];
for (const e of ALL_EXAMS) {
  const counts = e.skills.map((s) => {
    const n = itemsForSurface(e, s).length;
    if (n > 0 && n < MIN_TASKS_PER_MODULE) shortfalls.push(`${e.slug}/${s}: ${n}/${MIN_TASKS_PER_MODULE}`);
    return `${s.slice(0, 4).toLowerCase()} ${String(n).padStart(2)}`;
  });
  const total = e.skills.reduce((t, s) => t + itemsForSurface(e, s).length, 0);
  console.log(`  ${total > 0 ? "•" : " "} ${e.slug.padEnd(24)} ${counts.join("  ")}`);
}

// A module that is STARTED but under the bar is the dangerous state: it looks
// shippable in the tree. Empty is honest; half-full is not.
if (shortfalls.length) {
  console.log("\nSTARTED BUT UNDER RULE #7 — do not ship these:");
  for (const s of shortfalls) console.log("  ✗ " + s);
}

console.log(`\nBundles expected by the registry: ${BUNDLE_FILES.length}`);
console.log(`Items found: ${allSeen.length}`);

if (problems.length) {
  console.error(`\n${problems.length} INTEGRITY PROBLEM(S):`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log("\n✓ every answer key self-grades and agrees with its payload");
if (shortfalls.length) process.exit(1);
