// AlmiSwiss scoring engine — per-skill READINESS estimate.
//
// Nothing here may produce an official result, and for Switzerland that matters in
// two distinct ways:
//   • fide and the recognised certificates are assessed against official criteria by
//     a test centre. We are not one.
//   • Canton civic content has NO published pass mark anywhere, because there is no
//     national test to publish one — cantons and communes each decide. Inventing a
//     threshold there would fabricate the very test we say does not exist.
// So we grade objective items deterministically to a percentage, map that to an
// honest readiness band, and label productive skills (Writing/Speaking) as AI
// estimates. Every readout is an orientation estimate, never a result.

import { READY_PCT, BORDERLINE_PCT } from "./registry";
import type { ObjectiveAnswer, SwissTaskType, SwissSkill, CefrLevel } from "./types";
import { isObjectiveTask, splitByLevel } from "./types";

export type Readiness = "CLEAR" | "BORDERLINE" | "BELOW";

// The level-crossing rule (levelRole / splitByLevel) is SHARED — see @/lib/ch/types,
// which re-exports it from @smnasiruz016-blip/almi-data. It is deliberately not
// reimplemented here: all seven language forks carried the same bug precisely because
// each held its own copy, and the next fork would inherit whichever copy it cloned.
//
// What stays local is what is genuinely ours: the BANDS (READY_PCT / BORDERLINE_PCT)
// and what we say to the learner. The shared module decides what may COUNT toward the
// goal; this file decides what "on track" MEANS.

export interface ObjectiveResult {
  points: number;
  maxPoints: number;
}

/** Deterministically grade one objective item's response against its key. */
export function gradeObjective(
  answer: ObjectiveAnswer,
  response: unknown,
): ObjectiveResult {
  switch (answer.type) {
    case "MCQ_SINGLE":
    case "TRUE_FALSE": {
      const picked = (response as { index?: number } | null)?.index;
      return { points: picked === answer.correctIndex ? 1 : 0, maxPoints: 1 };
    }
    case "MATCHING": {
      const picks = (response as { pairs?: [number, number][] } | null)?.pairs ?? [];
      const key = new Map(answer.pairs.map(([l, r]) => [l, r]));
      let pts = 0;
      for (const [l, r] of picks) if (key.get(l) === r) pts++;
      return { points: pts, maxPoints: answer.pairs.length };
    }
    case "CLOZE": {
      const picks = (response as { gaps?: { id: number; index: number }[] } | null)?.gaps ?? [];
      const key = new Map(answer.correct.map((c) => [c.id, c.index]));
      let pts = 0;
      for (const g of picks) if (key.get(g.id) === g.index) pts++;
      return { points: pts, maxPoints: answer.correct.length };
    }
    case "ORDERING": {
      const order = (response as { order?: number[] } | null)?.order ?? [];
      const correct =
        order.length === answer.order.length &&
        order.every((v, i) => v === answer.order[i]);
      return { points: correct ? 1 : 0, maxPoints: 1 };
    }
  }
}

/** Percentage → honest readiness band vs the level's real criteria. */
export function readinessFromPct(pct: number): Readiness {
  if (pct >= READY_PCT) return "CLEAR";
  if (pct >= BORDERLINE_PCT) return "BORDERLINE";
  return "BELOW";
}

export interface SkillReadout {
  skill: SwissSkill;
  points: number;
  maxPoints: number;
  pct: number;
  readiness: Readiness; // objective skills only; productive → estimate label
  isEstimate: boolean; // productive (Writing/Speaking) = AI estimate
}

export function skillReadout(
  skill: SwissSkill,
  points: number,
  maxPoints: number,
): SkillReadout {
  const pct = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;
  const isEstimate = skill === "WRITING" || skill === "SPEAKING";
  return { skill, points, maxPoints, pct, readiness: readinessFromPct(pct), isEstimate };
}

export interface GoalScored {
  cefr?: CefrLevel;
  points: number;
  maxPoints: number;
}

export interface GoalReadout {
  goal: CefrLevel | undefined;
  /** The band — computed from AT_GOAL tasks ONLY. Null when the session contained
   *  none: with nothing at the goal there is no honest thing to say about the goal,
   *  and "0%" would be a lie about the learner rather than about the session. */
  atGoal: SkillReadout | null;
  above: { count: number; points: number; maxPoints: number };
  foundational: { count: number; points: number; maxPoints: number };
  undeclared: number;
}

/**
 * Split a session's results by level role and band ONLY what sits at the goal.
 *
 * This is the level-crossing rule. It keys on each task's declared `cefr` against the
 * module's goal — NOT on `difficulty`. Difficulty is a ladder inside a module and
 * crosses levels freely: reading #13 is STRETCH at A2 (the goal — it counts), while
 * every listening STRETCH is B1 (also the goal). Excluding "STRETCH" would have thrown
 * away tasks that ARE the goal and kept nothing that isn't.
 */
export function goalReadout(
  skill: SwissSkill,
  goal: CefrLevel | undefined,
  scored: GoalScored[],
): GoalReadout {
  const s = splitByLevel(scored, goal);
  return {
    goal,
    // No at-goal tasks → NO band. Not 0%: with nothing at the goal there is nothing
    // honest to say about the goal, and 0% would be a lie about the learner rather
    // than a fact about the session.
    atGoal: s.atGoal.count > 0 ? skillReadout(skill, s.atGoal.points, s.atGoal.maxPoints) : null,
    above: { count: s.above.count, points: s.above.points, maxPoints: s.above.maxPoints },
    foundational: {
      count: s.foundational.count,
      points: s.foundational.points,
      maxPoints: s.foundational.maxPoints,
    },
    undeclared: s.undeclared,
  };
}

/** Overall readiness LABEL for a percentage (honest, non-official framing). */
export function classificationLabel(pct: number): string {
  if (pct >= 85) return "Strong (practice estimate)";
  if (pct >= READY_PCT) return "On track (practice estimate)";
  if (pct >= BORDERLINE_PCT) return "Borderline (practice estimate)";
  return "Below level (practice estimate)";
}

/**
 * Aggregate a full mock's per-skill readouts into an overall readiness estimate.
 * Honest model: the official result is pass/fail per part against criteria, so we
 * take the mean objective percentage as an ORIENTATION estimate and flag the
 * weakest skill — never claim an official classification. We also surface whether
 * every graded skill reads CLEAR (the "ready across all four skills" shape).
 */
export function aggregateReadout(readouts: SkillReadout[]): {
  meanPct: number;
  overall: Readiness;
  label: string;
  weakest: SwissSkill | null;
  allClear: boolean;
} {
  const graded = readouts.filter((r) => r.maxPoints > 0);
  const meanPct = graded.length
    ? Math.round(graded.reduce((s, r) => s + r.pct, 0) / graded.length)
    : 0;
  let weakest: SwissSkill | null = null;
  let low = Infinity;
  for (const r of graded) if (r.pct < low) { low = r.pct; weakest = r.skill; }
  return {
    meanPct,
    overall: readinessFromPct(meanPct),
    label: classificationLabel(meanPct),
    weakest,
    allClear: graded.length > 0 && graded.every((r) => r.readiness === "CLEAR"),
  };
}

/** True when this task type is auto-gradable (objective). */
export function isObjectiveTaskType(t: SwissTaskType): boolean {
  return isObjectiveTask(t);
}
