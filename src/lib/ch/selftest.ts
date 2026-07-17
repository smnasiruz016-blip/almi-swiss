// Engine selftests — run with `npm run selftest:engine` (tsx).
// Proves the per-skill readiness bands and objective grading are correct.

import { gradeObjective, readinessFromPct, skillReadout, aggregateReadout, goalReadout } from "./grading";
// levelRole is the SHARED rule (almi-data). Re-tested here on purpose: this repo's
// goalReadout is built on it, and the assertions below are what that composition
// promises the learner.
import { levelRole } from "./types";

let pass = 0;
let fail = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.error(`✗ ${label}: got ${a}, want ${e}`); }
}

// ---- objective grading ----
eq(gradeObjective({ type: "MCQ_SINGLE", correctIndex: 2 }, { index: 2 }), { points: 1, maxPoints: 1 }, "mcq correct");
eq(gradeObjective({ type: "MCQ_SINGLE", correctIndex: 2 }, { index: 0 }), { points: 0, maxPoints: 1 }, "mcq wrong");
eq(gradeObjective({ type: "TRUE_FALSE", correctIndex: 1 }, { index: 1 }), { points: 1, maxPoints: 1 }, "tf correct");
eq(
  gradeObjective({ type: "MATCHING", pairs: [[0, 1], [1, 2], [2, 0]] }, { pairs: [[0, 1], [1, 2], [2, 2]] }),
  { points: 2, maxPoints: 3 },
  "matching partial",
);
eq(
  gradeObjective({ type: "CLOZE", correct: [{ id: 1, index: 0 }, { id: 2, index: 3 }] }, { gaps: [{ id: 1, index: 0 }, { id: 2, index: 1 }] }),
  { points: 1, maxPoints: 2 },
  "cloze partial",
);
eq(gradeObjective({ type: "ORDERING", order: [2, 0, 1] }, { order: [2, 0, 1] }), { points: 1, maxPoints: 1 }, "ordering correct");
eq(gradeObjective({ type: "ORDERING", order: [2, 0, 1] }, { order: [0, 1, 2] }), { points: 0, maxPoints: 1 }, "ordering wrong");

// ---- readiness bands (BORDERLINE 55 / CLEAR 70) ----
eq(readinessFromPct(85), "CLEAR", "band 85");
eq(readinessFromPct(70), "CLEAR", "band 70 floor");
eq(readinessFromPct(69), "BORDERLINE", "band 69");
eq(readinessFromPct(55), "BORDERLINE", "band 55 floor");
eq(readinessFromPct(54), "BELOW", "band 54");
eq(readinessFromPct(0), "BELOW", "band 0");

// productive skills flagged as estimate
eq(skillReadout("WRITING", 0, 0).isEstimate, true, "writing is estimate");
eq(skillReadout("READING", 8, 10).isEstimate, false, "reading not estimate");
eq(skillReadout("READING", 8, 10).readiness, "CLEAR", "reading 80% clear");

// aggregate: weakest skill + mean + all-clear
{
  const agg = aggregateReadout([
    skillReadout("READING", 9, 10), // 90
    skillReadout("LISTENING", 5, 10), // 50 (weakest)
  ]);
  eq(agg.meanPct, 70, "agg mean");
  eq(agg.weakest, "LISTENING", "agg weakest");
  eq(agg.overall, "CLEAR", "agg overall 70");
  eq(agg.allClear, false, "agg not all clear (listening below)");
}
{
  const agg = aggregateReadout([
    skillReadout("READING", 9, 10),
    skillReadout("LISTENING", 8, 10),
  ]);
  eq(agg.allClear, true, "agg all clear");
}

// ---- level-crossing rule ----
// The rule keys on the task's CEFR vs the module's goal, NEVER on difficulty.
eq(levelRole("A2", "A2"), "AT_GOAL", "A2 task, A2 goal");
eq(levelRole("B1", "A2"), "ABOVE_GOAL", "B1 task, A2 goal — reading #14");
eq(levelRole("A2", "B1"), "FOUNDATIONAL", "A2 task, B1 goal — listening #1");
eq(levelRole("B2", "B1"), "ABOVE_GOAL", "B2 task, B1 goal — speaking #15");
eq(levelRole(undefined, "A2"), "UNDECLARED", "no level declared is NOT at-goal");
eq(levelRole("A2", undefined), "UNDECLARED", "no goal declared — nothing to be ready for");

{
  // The bug this rule exists to kill: a B1 task wrong must not lower an A2 band.
  // Two A2 right, one B1 wrong → A2 readiness is 100%, not 67%.
  const g = goalReadout("READING", "A2", [
    { cefr: "A2", points: 1, maxPoints: 1 },
    { cefr: "A2", points: 1, maxPoints: 1 },
    { cefr: "B1", points: 0, maxPoints: 1 },
  ]);
  eq(g.atGoal?.pct, 100, "above-goal miss does not lower the goal band");
  eq(g.atGoal?.maxPoints, 2, "goal band counts only at-goal points");
  eq(g.above.count, 1, "above-goal task is reported, not hidden");
}
{
  // And the mirror: acing below-goal work is not evidence of the goal.
  const g = goalReadout("LISTENING", "B1", [
    { cefr: "A2", points: 1, maxPoints: 1 },
    { cefr: "A2", points: 1, maxPoints: 1 },
  ]);
  eq(g.atGoal, null, "no at-goal tasks → no goal band, not a 100%");
  eq(g.foundational.count, 2, "below-goal work reported as groundwork");
}
{
  // A task with no declared level must not be absorbed into the band.
  const g = goalReadout("WRITING", "A2", [
    { cefr: "A2", points: 0, maxPoints: 1 },
    { points: 1, maxPoints: 1 },
  ]);
  eq(g.atGoal?.pct, 0, "undeclared task does not inflate the band");
  eq(g.undeclared, 1, "undeclared task is surfaced");
}

console.log(`\nAlmiSwiss engine selftest: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
