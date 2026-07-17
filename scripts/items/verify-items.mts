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

import fs from "node:fs";
import path from "node:path";
import { itemsForSurface, BUNDLE_FILES } from "../../src/lib/ch/items";
import { gradeObjective } from "../../src/lib/ch/grading";
import { ALL_EXAMS, MIN_TASKS_PER_MODULE, goalCefrFor } from "../../src/lib/ch/registry";
import { isObjectiveTask, isCefrLevel } from "../../src/lib/ch/types";
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

// Payload keys the renderers actually read. A key outside this set is almost always a
// typo, and a typo'd key is INVISIBLE: nothing throws, the item loads, every answer key
// still self-grades — the content just never reaches the page.
//
// Caught for real on 2026-07-17: 20 new writing tasks were authored with
// `prompt_context` instead of `stimulus`. ProductiveComposer reads `p.stimulus`, so all
// 20 would have rendered as a bare instruction ("Schreiben Sie eine E-Mail. 60 bis 80
// Wörter.") with the scenario missing — a task that cannot be answered, shipped behind
// a paid gate. verify-items was GREEN throughout, because productive tasks have no key
// to self-grade. Absence again: it does not fail, it just quietly serves less.
const KNOWN_PAYLOAD_KEYS = new Set([
  "passage", "transcript", "stimulus", "question", "options", "instructions",
  "left", "right", "items", "gaps", "criteria", "charBand", "minSeconds",
]);

function checkPayloadKeys(it: SwissItemSeed) {
  const p = it.payload as Record<string, unknown>;
  if (!p || typeof p !== "object") return note(it, "payload is not an object");
  for (const k of Object.keys(p)) {
    if (!KNOWN_PAYLOAD_KEYS.has(k)) {
      note(it, `payload key "${k}" is not read by any renderer — typo? (content would silently not render)`);
    }
  }
  // A productive task with no stimulus is an instruction with nothing to respond to.
  if (it.taskType === "WRITING_PROMPT" && !p.stimulus) {
    note(it, "WRITING_PROMPT has no stimulus — the learner would see only the instruction");
  }
  if (!isObjectiveTask(it.taskType) && !(p.criteria as unknown[])?.length) {
    note(it, "productive task has no criteria — nothing to grade it against");
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

      // A surface that declares a GOAL measures people against it, so every task on
      // it must declare the level it is pitched at. `cefr` is optional in the type —
      // 450 items sit on tracks with no goal, and inventing levels for them is the
      // fabrication this field exists to stop — so the requirement is scoped here
      // instead: goal ⇒ level, enforced, and the two arrive together.
      //
      // Without this the failure is silent and one-directional: an item with no level
      // is never AT_GOAL, so it drops out of the band it should have been counted in,
      // and the number still renders. A learner would see a confident estimate built
      // from fewer tasks than they answered. Same family as the orphan bundle below —
      // an absence that reads as a smaller, plausible number rather than an error.
      const goal = goalCefrFor(e, skill);
      if (goal && !isCefrLevel(it.cefr)) {
        note(it, `on ${e.slug}/${skill}, which has goal ${goal}, but declares no cefr level`);
      }

      checkPayloadKeys(it);

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

// ---- Orphan bundles: files nothing loads ----
// loadBundle() returns [] for a missing file rather than throwing, which is right
// for a module we have not written yet — but it also means a bundle saved under a
// filename the registry does not derive is INVISIBLE. It parses, it self-grades,
// and it ships to nobody. That happened: canton-civic-german.json instead of
// canton-civic-german-knowledge.json (the name is `${slug}-${skill}`). Rule #7 sat
// at 0 for a module that had 15 finished tasks, and the ONLY tell was a counter
// that did not move. Same shape as every other absence bug here: nothing breaks.
const ITEMS_DIR = path.join(process.cwd(), "src", "data", "items");
const expected = new Set(BUNDLE_FILES);
const orphans = fs
  .readdirSync(ITEMS_DIR)
  .filter((f) => f.endsWith(".json") && !expected.has(f));
if (orphans.length) {
  console.error(`\n${orphans.length} ORPHAN BUNDLE(S) — no registry entry loads these:`);
  for (const o of orphans) console.error(`  ✗ ${o}`);
  console.error(
    "  Bundle filenames are derived: `${slug}-${skill.toLowerCase()}.json`.\n" +
      "  Rename to a derived name, or delete it. A file nothing loads is not content."
  );
  process.exit(1);
}

if (problems.length) {
  console.error(`\n${problems.length} INTEGRITY PROBLEM(S):`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log("\n✓ every answer key self-grades and agrees with its payload");
if (shortfalls.length) process.exit(1);
