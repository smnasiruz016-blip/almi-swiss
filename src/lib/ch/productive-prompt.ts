// THE PRODUCTIVE-GRADING PROMPT — built once, used by the route and by the harness.
//
// WHY IT LIVES HERE. The prompt WAS assembled inline in /api/ch/grade. A harness that
// re-created it would be proving a grader that does not ship: the two copies would agree
// on the day they were written and drift silently afterwards, and the harness would keep
// reporting green about a prompt nobody serves. The thing under test has to be the thing
// deployed, so there is exactly one assembly and both callers import it.
//
// Everything here is derived from the SERVER-LOADED item. Nothing takes a caller's word
// for the level, the criteria, or the task text — see the note on GradeBody in the route.

import { LANGUAGE_LABEL, isCefrLevel, levelInstruction } from "@/lib/ch/types";
import type { CefrLevel } from "@/lib/ch/types";
import type { SwissItemSeed } from "@/lib/ch/items";
import { ALL_EXAMS } from "@/lib/ch/registry";

export type Band = "CLEAR" | "BORDERLINE" | "BELOW";
export const BANDS: Band[] = ["CLEAR", "BORDERLINE", "BELOW"];

export interface AiFeedback {
  band: Band;
  summary: string;
  strengths: string[];
  improvements: string[];
}

/** The registry entry for an item, found by the item's OWN identity.
 *  The examiner persona is language-specific: a wrong one produces confident, fluent,
 *  wrong feedback rather than an error anyone could see. */
export function examForItem(item: SwissItemSeed) {
  return ALL_EXAMS.find(
    (e) => e.language === item.language && e.track === item.track && e.exam === item.exam,
  );
}

/** The criteria the answer is judged against, off the AUTHORED payload.
 *  Never from a request: letting the caller supply these is letting it mark its own paper. */
export function criteriaOf(item: SwissItemSeed): string[] {
  const payload = (item.payload ?? {}) as { criteria?: unknown };
  return (Array.isArray(payload.criteria) ? payload.criteria : []).filter(
    (c): c is string => typeof c === "string" && c.trim().length > 0,
  );
}

/**
 * Build the system + user messages for one item and one learner answer.
 *
 * The level is the TASK's own. It was once read off the exam entry's `cefr`, which for
 * fide is the RANGE "A1–B1" — no task sits at "A1–B1", so a 40-word A2 note and a
 * 120-word B1 Leserbrief were judged against the same three-level span and the same
 * answer could pass as A1 and fail as B1 depending where the model aimed. A range is not
 * a standard. When a task declares no level, say so rather than substituting the range:
 * an unstated level is unknown, and "A1–B1" is not a safe guess for it.
 */
export function buildGradePrompt(
  item: SwissItemSeed,
  response: string,
): { system: string; user: string; cefr: CefrLevel | null } {
  const exam = examForItem(item);
  const examName = exam?.name ?? "the test";
  const examLanguage = exam ? LANGUAGE_LABEL[exam.language] : "the target";
  const cefr = isCefrLevel(item.cefr) ? item.cefr : null;
  const levelPhrase = cefr ?? "the task's own criteria";
  const isSpeaking = item.taskType === "SPEAKING_PROMPT";
  const criteria = criteriaOf(item);

  const system = [
    `You are an experienced ${examLanguage}-language examiner for ${examName}.`,
    // Shared, so no fork can drift back to handing the model an exam LABEL.
    levelInstruction(cefr ?? undefined),
    `You give an HONEST practice readiness estimate against the task's own criteria — this is a study aid, never an official result, and you never claim otherwise.`,
    isSpeaking
      ? `This is a SPEAKING task; the learner has typed the answer they would say aloud, so judge content, structure, range and appropriacy, not pronunciation.`
      : `This is a WRITING task; judge task fulfilment, coherence, range and accuracy at ${levelPhrase}.`,
    `Be constructive, specific and level-aware. Do not inflate. Reply with STRICT JSON only, no prose, no code fences, in this exact shape:`,
    `{"band":"CLEAR|BORDERLINE|BELOW","summary":"1-2 sentence honest estimate","strengths":["..."],"improvements":["..."]}`,
    `Bands: CLEAR = comfortably meets the criteria at ${levelPhrase}; BORDERLINE = partially meets them, could go either way; BELOW = does not yet meet them.`,
  ].join(" ");

  const user = [
    item.title ? `Task: ${item.title}` : null,
    item.prompt ? `Instructions: ${item.prompt}` : null,
    criteria.length ? `Criteria the answer should meet:\n- ${criteria.join("\n- ")}` : null,
    `\nLearner's answer:\n"""${response.slice(0, 6000)}"""`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user, cefr };
}

/** Parse the model's STRICT-JSON reply. Returns null on anything unparseable or
 *  off-shape — a malformed reply must degrade to self-rating, never to a guessed band. */
export function parseFeedback(raw: string): AiFeedback | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const band = typeof o.band === "string" ? o.band.toUpperCase() : "";
  if (!BANDS.includes(band as Band)) return null;
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  if (!summary) return null;
  const toList = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 5)
      : [];
  return {
    band: band as Band,
    summary,
    strengths: toList(o.strengths),
    improvements: toList(o.improvements),
  };
}
