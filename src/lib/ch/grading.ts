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
import { isObjectiveTask, compareCefr } from "./types";

export type Readiness = "CLEAR" | "BORDERLINE" | "BELOW";

/** Where a task sits relative to the module's goal level.
 *
 *  AT_GOAL       — the only tasks a goal-readiness band may be computed from.
 *  ABOVE_GOAL    — harder than the goal (reading #14 at B1 vs an A2 goal). Getting it
 *                  wrong says nothing about A2 readiness, so it is labelled and left
 *                  OUT of the band. Keeping it in punished people on a bar they never
 *                  had to clear: naturalisation asks A2 written, not B1.
 *  FOUNDATIONAL  — below the goal. Useful practice, but passing it is NOT evidence of
 *                  the goal, so it is also out of the band — reported as its own thing
 *                  rather than quietly inflating the number.
 *  UNDECLARED    — the task states no level. NOT treated as AT_GOAL: an unstated level
 *                  is unknown, and counting it would let a silent omission decide a
 *                  learner's band. Surfaced so it gets fixed, never absorbed. */
export type LevelRole = "AT_GOAL" | "ABOVE_GOAL" | "FOUNDATIONAL" | "UNDECLARED";

export function levelRole(taskCefr: CefrLevel | undefined, goal: CefrLevel | undefined): LevelRole {
  if (!goal || !taskCefr) return "UNDECLARED";
  const d = compareCefr(taskCefr, goal);
  if (d === 0) return "AT_GOAL";
  return d > 0 ? "ABOVE_GOAL" : "FOUNDATIONAL";
}

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
  const bucket = { count: 0, points: 0, maxPoints: 0 };
  const at = { ...bucket };
  const above = { ...bucket };
  const found = { ...bucket };
  let undeclared = 0;

  for (const s of scored) {
    switch (levelRole(s.cefr, goal)) {
      case "AT_GOAL":
        at.count++; at.points += s.points; at.maxPoints += s.maxPoints; break;
      case "ABOVE_GOAL":
        above.count++; above.points += s.points; above.maxPoints += s.maxPoints; break;
      case "FOUNDATIONAL":
        found.count++; found.points += s.points; found.maxPoints += s.maxPoints; break;
      default:
        undeclared++;
    }
  }

  return {
    goal,
    atGoal: at.count > 0 ? skillReadout(skill, at.points, at.maxPoints) : null,
    above: { count: above.count, points: above.points, maxPoints: above.maxPoints },
    foundational: { count: found.count, points: found.points, maxPoints: found.maxPoints },
    undeclared,
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
