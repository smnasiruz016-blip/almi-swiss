// PRACTICE submit endpoint. Server-authoritative: the item (and its answer key) is
// re-loaded by id in gradeAttempt() and graded against the SERVER key — the client
// posts only { itemId, response, selfScore } and a client-supplied answer is never
// trusted. On this PRACTICE path the correct answer IS returned, for the post-submit
// reveal. The mock path (api/ch/mock/submit) runs the same grader but withholds the
// answer — the split is which route runs, not a client flag.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { gradeAttempt, type AttemptBody } from "@/lib/ch/grade-attempt";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let body: AttemptBody;
  try {
    body = (await req.json()) as AttemptBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const r = await gradeAttempt(body, user);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  }

  // PRACTICE reveal: disclose the correct answer AFTER the learner has committed theirs.
  return NextResponse.json({
    ok: true,
    points: r.points,
    maxPoints: r.maxPoints,
    correct: r.correct,
    selfScore: r.selfScore,
    answer: r.correctAnswer,
  });
}
