// MOCK submit endpoint. Same server-authoritative grader as the practice route
// (gradeAttempt re-loads the item by id and grades the SERVER key), but this route
// NEVER returns the correct answer — a mock must not reveal keys mid-exam. The
// practice-vs-mock reveal split is decided HERE, by which route runs, not by any
// client-supplied flag.

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

  // MOCK: no `answer` in the response — the key stays server-side until the mock ends.
  return NextResponse.json({
    ok: true,
    points: r.points,
    maxPoints: r.maxPoints,
    correct: r.correct,
    selfScore: r.selfScore,
  });
}
