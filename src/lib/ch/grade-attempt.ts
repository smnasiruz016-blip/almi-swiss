// Server-authoritative grading for one practice/mock attempt.
//
// The client posts only an itemId + its response. The item — and its answer key — is
// re-loaded server-side by id (getItemById), so a client-supplied key is never trusted
// and the key never had to ship in the served payload. The item's correct answer is
// returned to the CALLER, which decides whether to disclose it: the practice route
// reveals it post-submit; the mock route withholds it. That practice-vs-mock split is
// decided by WHICH ROUTE runs, not by any client flag.

import { hasPaidAccess } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import { gradeObjective } from "@/lib/ch/grading";
import { getItemById } from "@/lib/ch/items";
import { isObjectiveTask, isFreeSkill } from "@/lib/ch/types";
import type { ObjectiveAnswer } from "@/lib/ch/types";

type PaidUser = Parameters<typeof hasPaidAccess>[0] & { id: string };

export interface AttemptBody {
  itemId?: string;
  response?: unknown;
  selfScore?: number | string | null;
}

export type GradeOutcome =
  | { ok: false; status: number; error: string }
  | {
      ok: true;
      points: number;
      maxPoints: number;
      correct: boolean;
      selfScore: number | string | null;
      /** The item's correct answer — callers reveal this ONLY on the practice path. */
      correctAnswer: ObjectiveAnswer | null;
    };

export async function gradeAttempt(body: AttemptBody, user: PaidUser): Promise<GradeOutcome> {
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  if (!itemId) return { ok: false, status: 400, error: "Missing itemId" };

  const item = getItemById(itemId);
  if (!item) return { ok: false, status: 404, error: "Unknown item" };

  const objective = isObjectiveTask(item.taskType);
  const productive = !objective || !isFreeSkill(item.skill);

  // Gate: productive / AI tasks require paid access (owner + comp bypass inside).
  if (productive && !hasPaidAccess(user)) {
    return { ok: false, status: 402, error: "Productive feedback is a Pro feature" };
  }

  let points = 0;
  let maxPoints = 0;
  let correct = false;
  let readiness: string | null = null;
  const selfScore = body.selfScore ?? null;

  if (objective && item.answer) {
    // Graded against the SERVER-held key, not anything the client supplied.
    const graded = gradeObjective(item.answer, body.response);
    points = graded.points;
    maxPoints = graded.maxPoints;
    correct = maxPoints > 0 && points === maxPoints;
    readiness = correct ? "CLEAR" : "BELOW";
  } else {
    readiness = typeof selfScore === "string" ? selfScore : null;
  }

  // Best-effort persistence — itemId is now a stable server id, not a client token.
  try {
    await prisma.swissAttempt.create({
      data: {
        userId: user.id,
        itemId,
        status: objective ? "SCORED" : "EVALUATED",
        response: (body.response ?? { selfScore }) as object,
        points: objective ? points : null,
        maxPoints: objective ? maxPoints : null,
        readiness,
        submittedAt: new Date(),
      },
    });
  } catch {
    // attempts are optional this pass
  }

  return {
    ok: true,
    points,
    maxPoints,
    correct,
    selfScore,
    correctAnswer: objective ? item.answer : null,
  };
}
