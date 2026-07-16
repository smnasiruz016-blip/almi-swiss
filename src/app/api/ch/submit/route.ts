// Practice submit endpoint. Grades objective items deterministically via the
// Swiss engine and echoes productive self-ratings. DB persistence of attempts is
// best-effort: bundled items have no DB id, so unless a resolvable itemId is
// supplied we simply return the grade — this never 500s on an empty database.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPaidAccess } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import { gradeObjective } from "@/lib/ch/grading";
import { isObjectiveTask, isFreeSkill } from "@/lib/ch/types";
import type {
  ObjectiveAnswer,
  SwissSkill,
  SwissTaskType,
} from "@/lib/ch/types";

export const runtime = "nodejs";

interface SubmitBody {
  itemId?: string;
  exam?: string;
  skill?: SwissSkill;
  taskType?: SwissTaskType;
  answer?: ObjectiveAnswer | null;
  maxPoints?: number;
  response?: unknown;
  selfScore?: number | string | null;
}

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { itemId, skill, taskType, answer, response, selfScore } = body;
  if (!taskType) {
    return NextResponse.json({ ok: false, error: "Missing taskType" }, { status: 400 });
  }

  const objective = isObjectiveTask(taskType);
  const productive = !objective || (skill !== undefined && !isFreeSkill(skill));

  // Gate: productive / AI tasks require paid access (owner + comp bypass inside).
  if (productive && !hasPaidAccess(user)) {
    return NextResponse.json(
      { ok: false, error: "Productive feedback is a Pro feature" },
      { status: 402 },
    );
  }

  let points = 0;
  let maxPoints = typeof body.maxPoints === "number" ? body.maxPoints : 0;
  let correct = false;
  let readiness: string | null = null;

  if (objective && answer) {
    const graded = gradeObjective(answer, response);
    points = graded.points;
    maxPoints = graded.maxPoints;
    correct = maxPoints > 0 && points === maxPoints;
    readiness = correct ? "CLEAR" : "BELOW";
  } else {
    // Productive: nothing sensitive stored; echo the self-rating.
    readiness = typeof selfScore === "string" ? selfScore : null;
  }

  // Best-effort persistence — only when a real DB item id is supplied. Any DB
  // failure (missing item, empty database) is swallowed so grading still returns.
  if (itemId) {
    try {
      await prisma.swissAttempt.create({
        data: {
          userId: user.id,
          itemId,
          status: objective ? "SCORED" : "EVALUATED",
          response: (response ?? { selfScore: selfScore ?? null }) as object,
          points: objective ? points : null,
          maxPoints: objective ? maxPoints : null,
          readiness,
          submittedAt: new Date(),
        },
      });
    } catch {
      // ignore — attempts are optional this pass
    }
  }

  return NextResponse.json({ ok: true, points, maxPoints, correct, selfScore: selfScore ?? null });
}
