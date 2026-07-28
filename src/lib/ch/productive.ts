// PRODUCTIVE SCORING — the deterministic half.
//
// Writing and Speaking are 48.9% of the bank (680 of 1390 items) and cannot be graded
// against a key: there isn't one. What CAN be decided without a model is whether the
// response is a plausible attempt at THIS task at all — long enough, spoken long enough,
// present. That floor is computed here, and it VETOES: a model may not lift a response
// above what the deterministic layer allows.
//
// WHY A VETO AND NOT A SCORE. A language model asked to band a fluent, well-formed,
// on-topic-sounding answer will tend to reward it. The two failure modes that matters
// for are (a) an answer far under the length the task asks for, and (b) an answer that
// reads beautifully and ignores the question. (a) is measurable here; (b) is not, and is
// left to the model — but (a) alone stops a two-line fragment being called CLEAR.
//
// THE FLOOR IS THE ITEM'S OWN charBand / minSeconds — never an awarding body's figure.
// The DELF B1 production écrite floor is ~160 words while our four B1 items are authored
// at 80–120; keying the veto to DELF's number would park all four at the floor forever.
// The item's authored band is the contract for that practice item. Where the authored
// band does not match the real exam, that is a CONTENT finding to fix in the bank, not
// something to paper over in the grader.

import type { CefrLevel, SwissTaskType } from "./types";
import type { SwissItemSeed } from "./items";

export type Band = "CLEAR" | "BORDERLINE" | "BELOW";

/** Ordered worst → best, so "the best band still reachable" is a min(). */
const RANK: Record<Band, number> = { BELOW: 0, BORDERLINE: 1, CLEAR: 2 };
const BY_RANK: Band[] = ["BELOW", "BORDERLINE", "CLEAR"];

export type VetoCode =
  | "EMPTY"          // nothing to grade
  | "UNDER_LENGTH"   // shorter than the item's own charBand floor
  | "OVER_LENGTH"    // longer than the item's own charBand ceiling
  | "UNDER_DURATION" // spoken for less than the item's own minSeconds
  | "NO_LEVEL";      // the item declares no CEFR level — see below

export interface Veto {
  code: VetoCode;
  detail: string;
  /** The best band still reachable once this veto has fired. */
  caps: Band;
}

export interface DeterministicVerdict {
  vetoes: Veto[];
  /** The ceiling the model may not exceed. CLEAR when nothing fired. */
  maxBand: Band;
  measured: { chars: number; seconds: number | null };
  /** True when the model still has to decide — i.e. nothing here settled it. */
  needsModel: boolean;
}

/** Characters per second of speech, OUR convention for judging a typed transcript of a
 *  spoken answer. It is not a figure any awarding body publishes. Used only when a
 *  speaking response arrives without a measured duration. */
export const CHARS_PER_SECOND = 12;

export interface ProductiveItemView {
  taskType: SwissTaskType;
  cefr?: CefrLevel;
  charBand?: { min: number; max: number };
  minSeconds?: number;
}

export function viewOf(item: SwissItemSeed): ProductiveItemView {
  const p = (item.payload ?? {}) as Record<string, unknown>;
  return {
    taskType: item.taskType,
    cefr: item.cefr,
    charBand: p.charBand as { min: number; max: number } | undefined,
    minSeconds: typeof p.minSeconds === "number" ? p.minSeconds : undefined,
  };
}

/**
 * The deterministic floor for one response.
 *
 * `spokenSeconds` is the measured duration of a speaking answer when the client can
 * supply one. When it cannot, the duration is ESTIMATED from the transcript length at
 * CHARS_PER_SECOND — and an estimate is marked as such in the detail string, because a
 * veto justified by a guess should say so.
 */
export function evaluateDeterministic(
  view: ProductiveItemView,
  response: string,
  opts?: { spokenSeconds?: number },
): DeterministicVerdict {
  const text = (response ?? "").trim();
  const chars = text.length;
  const vetoes: Veto[] = [];

  const isSpeaking = view.taskType === "SPEAKING_PROMPT";
  const seconds = isSpeaking
    ? (opts?.spokenSeconds ?? Math.round(chars / CHARS_PER_SECOND))
    : null;
  const estimated = isSpeaking && opts?.spokenSeconds === undefined;

  if (chars < 20) {
    vetoes.push({ code: "EMPTY", detail: `${chars} characters — nothing to grade`, caps: "BELOW" });
  }

  // An item with no declared level cannot be graded AT a level, and the exam's label is a
  // range. Excluded rather than defaulted — 60 cert-track items are in exactly this state.
  if (!view.cefr) {
    vetoes.push({
      code: "NO_LEVEL",
      detail: "item declares no CEFR level; an exam label is a range and a range is not a standard",
      caps: "BELOW",
    });
  }

  if (!isSpeaking && view.charBand) {
    if (chars < view.charBand.min) {
      vetoes.push({
        code: "UNDER_LENGTH",
        detail: `${chars} chars, the task asks for at least ${view.charBand.min}`,
        caps: "BORDERLINE",
      });
    } else if (chars > view.charBand.max) {
      vetoes.push({
        code: "OVER_LENGTH",
        detail: `${chars} chars, the task caps at ${view.charBand.max}`,
        caps: "BORDERLINE",
      });
    }
  }

  if (isSpeaking && view.minSeconds && seconds !== null && seconds < view.minSeconds) {
    vetoes.push({
      code: "UNDER_DURATION",
      detail: `${seconds}s${estimated ? " (estimated from transcript length)" : ""}, the task asks for at least ${view.minSeconds}s`,
      caps: "BORDERLINE",
    });
  }

  const maxBand = vetoes.reduce<Band>(
    (acc, v) => (RANK[v.caps] < RANK[acc] ? v.caps : acc),
    "CLEAR",
  );
  return {
    vetoes,
    maxBand,
    measured: { chars, seconds },
    // Nothing here can award a band — it can only cap one. Even a fully vetoed response
    // needs the model to say HOW far below, and an unvetoed one is merely eligible.
    needsModel: maxBand !== "BELOW",
  };
}

/** Apply the deterministic ceiling to whatever the model proposed. */
export function capBand(modelBand: Band, verdict: DeterministicVerdict): Band {
  return RANK[modelBand] > RANK[verdict.maxBand] ? verdict.maxBand : modelBand;
}

export { RANK as BAND_RANK, BY_RANK as BANDS_WORST_FIRST };
