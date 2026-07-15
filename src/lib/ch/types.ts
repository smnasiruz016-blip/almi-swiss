// AlmiSwiss — shared type contracts for the item bank.
// String-literal unions mirror the Prisma enums (kept in sync by hand) so the
// scoring engine, content pipeline, and UI don't depend on the generated client.
//
// WHAT MAKES SWITZERLAND STRUCTURALLY DIFFERENT from the Nordic siblings this
// product was forked from, and why the shapes below are not a rename of theirs:
//
//  1. THERE IS A LANGUAGE AXIS. Sweden/Norway/Denmark each have ONE national
//     language, so their registries key on (exam, skill). Switzerland has three
//     relevant national languages — German, French, Italian — and which one you
//     need is decided by your canton, not by you. So every exam here carries a
//     `language`, and the tree is (language × track × exam × skill).
//
//  2. THERE IS NO NATIONAL CIVICS TEST. The Swedish fork models exactly one
//     society exam (MEDBORGARSKAPSPROV, a real national test run by UHR). Switzerland
//     has NO national equivalent: cantons and communes differ, some use a test, some
//     an interview. Modelling a "Swiss civics exam" would fabricate a national test
//     that does not exist. Civic content is therefore CANTON_CIVIC — practice, not an
//     exam, and it must be presented as canton-dependent every time it is rendered.
//     Do not promote it to an exam, and do not invent a canton's questions or format.

// Switzerland's relevant national languages. Romansh is a national language but is
// rarely the language of a naturalisation procedure — deliberately omitted rather
// than modelled with invented content. Italian ships as a fast-follow (spec §8);
// the type carries it from day 1 so nothing has to be re-shaped later.
export type SwissLanguage = "DE" | "FR" | "IT";

// The "Choose a Test" tree is organised by the user's GOAL, not by the exam name.
export type SwissTrack =
  | "CITIZENSHIP" // → fide at the federal minimum: B1 spoken + A2 written
  | "C_PERMIT" // → fide at the permit levels — LOWER than citizenship, and route-dependent
  | "CERTIFICATE" // → telc/Goethe (DE), DELF/TCF (FR), CELI (IT)
  | "GETTING_STARTED" // → A1–A2 general practice
  | "CANTON_CIVIC"; // → canton-dependent local knowledge. NOT a national test.

// Language exams, each bound to a language in the registry.
// fide is the Swiss test (issues a language passport). The certificate exams are
// SEM-recognised alternatives — telc/Goethe for German, DELF/TCF for French,
// CELI for Italian.
export type LanguageExam =
  | "FIDE" // German / French / Italian — the Swiss scenario-based test
  | "TELC_GOETHE" // German only
  | "DELF_TCF" // French only
  | "CELI"; // Italian only

// Canton-dependent local-knowledge practice. NOT a national exam — see note 2 above.
// Named CANTON_CIVIC rather than e.g. "SWISS_CIVICS_TEST" precisely so the name can
// never be read as asserting a national test exists.
export type CivicModule = "CANTON_CIVIC";
export type SwissExam = LanguageExam | CivicModule;

export type LanguageSkill = "READING" | "LISTENING" | "WRITING" | "SPEAKING";
export type SwissSkill = LanguageSkill | "KNOWLEDGE";

export type SwissTaskType =
  | "MCQ_SINGLE"
  | "MATCHING"
  | "CLOZE"
  | "ORDERING"
  | "TRUE_FALSE"
  | "WRITING_PROMPT"
  | "SPEAKING_PROMPT";

export type SwissDifficulty = "FOUNDATION" | "CORE" | "STRETCH";

export const OBJECTIVE_TASK_TYPES: SwissTaskType[] = [
  "MCQ_SINGLE",
  "MATCHING",
  "CLOZE",
  "ORDERING",
  "TRUE_FALSE",
];

export const PRODUCTIVE_TASK_TYPES: SwissTaskType[] = ["WRITING_PROMPT", "SPEAKING_PROMPT"];

export function isObjectiveTask(t: SwissTaskType): boolean {
  return OBJECTIVE_TASK_TYPES.includes(t);
}

/** A skill is "free to taste" (auto-graded) vs gated (AI-graded / mock).
 *  Free taste = Reading + Listening + Knowledge (all objective, auto-graded).
 *  Gated = Writing + Speaking (AI-graded) + the full mock. */
export function isFreeSkill(skill: SwissSkill): boolean {
  return skill === "READING" || skill === "LISTENING" || skill === "KNOWLEDGE";
}

/** The languages that currently ship content. Italian is a fast-follow (spec §8):
 *  Rule #7 requires ≥15 tasks per module PER language track, so a language is only
 *  listed here once it actually meets that bar — never to make the tree look full. */
export const SHIPPING_LANGUAGES: SwissLanguage[] = ["DE", "FR"];

export const LANGUAGE_LABEL: Record<SwissLanguage, string> = {
  DE: "German",
  FR: "French",
  IT: "Italian",
};

/** The national language as named in itself — used where we show the learner the
 *  language they will actually be tested in. */
export const LANGUAGE_ENDONYM: Record<SwissLanguage, string> = {
  DE: "Deutsch",
  FR: "Français",
  IT: "Italiano",
};

/** BCP-47 tag for TTS. German is de-CH ONLY for regional flavour of everyday audio;
 *  the recognised tests are set in STANDARD German, not Swiss-German dialect, so
 *  test-format audio uses de-DE. Getting this wrong is the exact class of bug that
 *  had almi-danish reading Danish transcripts in an Icelandic voice: the label said
 *  one language and the code returned another. */
export const LANGUAGE_TTS: Record<SwissLanguage, string> = {
  DE: "de-DE",
  FR: "fr-FR",
  IT: "it-IT",
};

// ---- Task payload shapes (validated in items.ts) ----

export interface McqPayload {
  passage?: string;
  transcript?: string;
  question: string;
  options: string[];
}

export interface MatchingPayload {
  transcript?: string;
  passage?: string;
  instructions: string;
  left: string[];
  right: string[];
}

export interface ClozePayload {
  passage: string;
  gaps: { id: number; options: string[] }[];
}

export interface OrderingPayload {
  instructions: string;
  items: string[];
}

export type ObjectiveAnswer =
  | { type: "MCQ_SINGLE"; correctIndex: number }
  | { type: "TRUE_FALSE"; correctIndex: number }
  | { type: "MATCHING"; pairs: [number, number][] }
  | { type: "CLOZE"; correct: { id: number; index: number }[] }
  | { type: "ORDERING"; order: number[] };

export interface ProductivePayload {
  stimulus?: string;
  criteria: string[];
  charBand?: { min: number; max: number };
  minSeconds?: number;
}
