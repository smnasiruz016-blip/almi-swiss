// Shared client-side item shapes handed from the runner pages to the practice
// components. Payloads stay `unknown` and are narrowed by taskType at render.

import type {
  SwissExam,
  SwissLanguage,
  SwissSkill,
  SwissTaskType,
  ObjectiveAnswer,
} from "@/lib/ch/types";
import { LANGUAGE_TTS } from "@/lib/ch/types";

export interface RunnerItem {
  /** Which national language this item is set in. Required: the runner cannot pick a
   *  TTS voice, or label a skill, without it — and guessing is the is-IS bug.  hygiene-allow
   */
  language: SwissLanguage;
  title: string;
  prompt: string;
  exam: SwissExam;
  skill: SwissSkill;
  taskType: SwissTaskType;
  payload: unknown;
  answer: ObjectiveAnswer | null;
  maxPoints: number;
}

export type ProductiveItem = Omit<RunnerItem, "answer" | "maxPoints">;

export interface SubmitResult {
  ok: boolean;
  points: number;
  maxPoints: number;
  correct: boolean;
}

/** The BCP-47 voice tag for listening audio, for the language the item is SET IN.
 *
 *  ⚠️ THIS FUNCTION TOOK NO ARGUMENT AND RETURNED "sv-SE" WHEN THIS REPO WAS FORKED.  hygiene-allow
 *  That is not a stale string — it is the same bug the fork-hygiene gate's own header
 *  documents from two generations ago: almi-norwegian inherited ttsLang() → "is-IS"  hygiene-allow
 *  and read every Norwegian transcript aloud in an Icelandic voice. Here it would  hygiene-allow
 *  have read every German fide transcript in a Swedish voice, and nothing would have  hygiene-allow
 *  thrown: the label says German, the audio is Swedish, and only a user notices.  hygiene-allow
 *
 *  An argument-less accessor was CORRECT in a one-language country and is
 *  structurally unable to be correct here. So the language is now required, and the
 *  tag comes from LANGUAGE_TTS — where de-DE is deliberate: the recognised tests are
 *  set in Standard German, not Swiss-German dialect. */
export function ttsLang(language: SwissLanguage): string {
  return LANGUAGE_TTS[language];
}

/** POST a graded/echoed attempt to the submit API. DB-optional, never throws. */
export async function submitAttempt(body: unknown): Promise<SubmitResult | null> {
  try {
    const res = await fetch("/api/ch/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as SubmitResult;
  } catch {
    return null;
  }
}

export type ProductiveBand = "CLEAR" | "BORDERLINE" | "BELOW";

export interface AiFeedback {
  band: ProductiveBand;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export type GradeOutcome =
  | { status: "graded"; feedback: AiFeedback }
  | { status: "unavailable" } // key not provisioned / model hiccup → self-rate
  | { status: "error"; message: string };

/**
 * Request honest AI feedback on a productive answer. Returns "unavailable" (not
 * an error) when the key isn't provisioned yet, so the caller falls back to the
 * self-rating flow. Never throws.
 */
export async function gradeProductive(body: {
  exam: SwissExam;
  skill: SwissSkill;
  taskType: SwissTaskType;
  title: string;
  prompt: string;
  criteria: string[];
  response: string;
}): Promise<GradeOutcome> {
  try {
    const res = await fetch("/api/ch/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as
      | ({ ok?: boolean; available?: boolean; error?: string } & Partial<AiFeedback>)
      | null;
    if (!res.ok || !data) {
      return { status: "error", message: data?.error ?? "Could not get feedback right now." };
    }
    if (data.available === false || !data.band) return { status: "unavailable" };
    return {
      status: "graded",
      feedback: {
        band: data.band,
        summary: data.summary ?? "",
        strengths: data.strengths ?? [],
        improvements: data.improvements ?? [],
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}
