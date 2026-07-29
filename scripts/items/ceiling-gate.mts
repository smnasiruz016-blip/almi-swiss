// CEILING GATE — no served item may be pitched ABOVE its surface's goal level.
//
//   npm run gate:ceiling
//
// THE CLASS THIS CATCHES. FIDE::CITIZENSHIP::DE held 20 items declaring cefr B2 on a
// surface whose goal is B1 — fide certifies A1, A2 and B1 only, so a B2 task is a level
// the exam cannot award. Every gate in the build passed the whole time. verify-items
// requires that a level EXISTS on a surface with a goal, and it never compared that
// level TO the goal, so "above the exam's ceiling" was unrepresentable: no check could
// hold the thought. The items were found by reading, not by tooling, and only after
// they had been live for months.
//
// WHAT IT DOES NOT DO, ON PURPOSE. It does not check for a MISSING level on a surface
// with a goal — verify-items.mts already enforces exactly that (line ~148: `if (goal &&
// !isCefrLevel(it.cefr)) note(...)`, and note() feeds `problems`, which exits 1). Two
// implementations of one rule drift apart and then disagree, and the disagreement is
// silent. One rule, one owner: verify-items owns "goal ⇒ a level exists", this gate owns
// "that level is not above the goal".
//
// THE EXEMPTION DEFENDS ITSELF. Surfaces with no declared goal are skipped — but the
// skip comes from goalCefrFor() returning undefined, never from a list kept here. That
// matters more than it looks: a hand-maintained skip-list is a place to put an
// inconvenient surface, and the entry outlives the reason. Reading the exemption out of
// the registry means the ONLY way to exempt a surface is to declare that it measures
// nobody against a level — which is a decision with consequences elsewhere, made in the
// registry where it is visible, not a line quietly added to a gate to make it green.
// (Constitution §5: a guard must defend its own decisions; do not fit the gate to the
// data. §4 in this repo's registry says the same thing from the other side: "Adding a
// track here is a decision to measure people against it.")
//
// SERVED ITEMS ONLY. It reads through itemsForSurface(), so withheld items
// (`active:false`) are out of scope by construction. That is deliberate: the two
// genuinely-B2 fide tasks are withheld precisely BECAUSE they are above the ceiling, and
// a gate that failed on them would punish the correct disposal of them. What the learner
// can be served is what must obey the ceiling.
//
// SEEN RED: re-level any served CITIZENSHIP item to a level above its goal (e.g. a
// SPEAKING item to B2, or any written item to B1) → this gate names it and exits 1.

import { ALL_EXAMS, goalCefrFor } from "../../src/lib/ch/registry";
import type { ExamMeta } from "../../src/lib/ch/registry";
import { itemsForSurface } from "../../src/lib/ch/items";
import { compareCefr, isCefrLevel, type CefrLevel } from "../../src/lib/ch/types";

/** THE CEILING IS WHAT THE EXAM CERTIFIES — NOT THE NATURALISATION MINIMUM.
 *
 *  This distinction is the whole gate, and getting it wrong produces a confident,
 *  well-formatted wrong answer. goalCefrFor() derives from NATURALISATION_MIN
 *  (spoken B1, written A2): the level a candidate must REACH. It is a floor. Reading
 *  it as a ceiling flags every stretch task in the bank — 103 of them here, all
 *  READING items at B1 against a written minimum of A2, every one of them legitimate
 *  practice that fide can and does certify. This repo already says so in
 *  src/lib/ch/types.ts: "every listening STRETCH sits at B1 — the goal itself".
 *
 *  What fide cannot do is award B2. That is the registry's declared range
 *  (`cefr: "A1–B1"`), and its top is the real ceiling — the fact the 20 B2 items
 *  violated.
 *
 *  ⚠️ This parses a DISPLAY string, which is the weakest part of this gate. `cefr` on
 *  a registry entry exists to be rendered, not to be enforced against, and a label
 *  edit ("A1–B1" → "A1 to B1") would silently exempt a surface. A first-class
 *  `certifiesUpTo` field on ExamMeta would remove the parse entirely; until then the
 *  parse FAILS LOUD rather than skipping quietly — an unparseable range is reported,
 *  not treated as "no ceiling". */
// Dash characters as explicit \u escapes, never literal glyphs. The first version
// of this line was written through a shell heredoc and shipped a literal BACKSPACE
// (U+0008) where \b was intended: the pattern matched nothing, every surface
// reported "unparseable", and the gate printed a GREEN tick having checked ZERO of
// 1,388 items. A gate that cannot fail is worse than none, because it answers.
const RANGE = /([A-C][12])\s*(?:[‐-―−-]|to)\s*([A-C][12])/;

function examCeiling(e: ExamMeta): { ceiling?: CefrLevel; label: string } {
  const label = String((e as { cefr?: unknown }).cefr ?? "");
  const m = RANGE.exec(label);
  if (m && isCefrLevel(m[2])) return { ceiling: m[2] as CefrLevel, label };
  const single = /^\s*([A-C][12])\s*$/.exec(label);
  if (single && isCefrLevel(single[1])) return { ceiling: single[1] as CefrLevel, label };
  return { label };
}

type Row = {
  key: string;
  goal: CefrLevel | "—";
  ceiling: string;
  above: number;        // above the CERTIFIED ceiling — the failure
  aboveGoal: number;    // above the naturalisation minimum — informational
  unlevelled: number;
  exempt: number;
  unparseable: number;
  total: number;
};

const rows = new Map<string, Row>();
const violations: string[] = [];

function row(key: string, goal: CefrLevel | "—", ceiling: string): Row {
  let r = rows.get(key);
  if (!r) {
    r = { key, goal, ceiling, above: 0, aboveGoal: 0, unlevelled: 0, exempt: 0, unparseable: 0, total: 0 };
    rows.set(key, r);
  }
  // A surface declares different goals per skill (spoken B1, written A2). Show the
  // pair rather than whichever skill happened to be iterated first, which is how the
  // first run of this gate printed "goal A2" for a bank that is half B1.
  if (goal !== "—" && !String(r.goal).split("/").includes(String(goal)))
    r.goal = (r.goal === "—" ? String(goal) : `${r.goal}/${goal}`) as CefrLevel;
  return r;
}

for (const e of ALL_EXAMS) {
  const { ceiling, label } = examCeiling(e);
  for (const skill of e.skills) {
    const goal = goalCefrFor(e, skill);
    const items = itemsForSurface(e, skill);
    const key = `${e.track}|${e.exam}`;
    const r = row(key, goal ?? "—", ceiling ?? (label || "—"));
    r.total += items.length;

    // No parseable certified range -> nothing to enforce, but SAY SO. A surface that
    // silently escapes the check is how a gate becomes decorative.
    if (!ceiling) {
      r.unparseable += items.length;
      continue;
    }

    for (const it of items) {
      if (!isCefrLevel(it.cefr)) {
        if (goal !== undefined) r.unlevelled++;  // verify-items owns failing on this
        else r.exempt++;
        continue;
      }
      if (compareCefr(it.cefr, ceiling) > 0) {
        r.above++;
        violations.push(
          `${e.slug}/${skill}  certifies up to ${ceiling}  item declares ${it.cefr}
      ${it.title}`,
        );
      } else if (goal !== undefined && compareCefr(it.cefr, goal) > 0) {
        r.aboveGoal++;  // stretch above the naturalisation MINIMUM - legitimate
      }
      if (goal === undefined) r.exempt++;
    }
  }
}

const sorted = [...rows.values()].sort((a, b) => a.key.localeCompare(b.key));
const w = Math.max(...sorted.map((r) => r.key.length));

console.log(`
CEILING MAP - served items only (withheld are out of scope by design)
`);
console.log(
  `${"track|exam".padEnd(w)} | goal(min) | certifies | above-ceiling | above-goal | unlevelled | exempt | total`,
);
console.log("-".repeat(w + 76));
for (const r of sorted) {
  console.log(
    `${r.key.padEnd(w)} | ${String(r.goal).padEnd(9)} | ${String(r.ceiling).padEnd(9)} | ` +
      `${String(r.above).padStart(13)} | ${String(r.aboveGoal).padStart(10)} | ` +
      `${String(r.unlevelled).padStart(10)} | ${String(r.exempt).padStart(6)} | ${String(r.total).padStart(5)}`,
  );
}

const unparseable = sorted.reduce((t, r) => t + r.unparseable, 0);
if (unparseable > 0) {
  console.log(
    `
  ${unparseable} item(s) sit on a surface whose declared range could not be parsed` +
      ` - NOT checked. Surfaces: ` +
      sorted.filter((r) => r.unparseable > 0).map((r) => `${r.key} ("${r.ceiling}")`).join(", "),
  );
}
const totalUnlevelled = sorted.reduce((t, r) => t + r.unlevelled, 0);
if (totalUnlevelled > 0) {
  console.log(
    `
  ${totalUnlevelled} item(s) on a goal-bearing surface carry no level. That is` +
      ` verify-items' failure to raise, not this gate's.`,
  );
}
const totalAboveGoal = sorted.reduce((t, r) => t + r.aboveGoal, 0);
if (totalAboveGoal > 0) {
  console.log(
    `
  ${totalAboveGoal} item(s) sit ABOVE the naturalisation minimum but within what the` +
      ` exam certifies.
  That is STRETCH practice, not a defect - a minimum is a floor,` +
      ` not a ceiling.`,
  );
}

if (violations.length) {
  console.error(`
✗ CEILING GATE FAILED - ${violations.length} served item(s) above what their exam certifies
`);
  for (const v of violations.slice(0, 20)) console.error(`    ${v}
`);
  if (violations.length > 20) console.error(`    ... and ${violations.length - 20} more
`);
  console.error(
    `  An exam cannot award a level it does not certify. Re-level the item, or withhold
` +
      `  it (active:false) if it is genuinely above and has no home here.
`,
  );
  process.exit(1);
}

console.log(`
✓ CEILING GATE: no served item sits above what its exam certifies.`);
