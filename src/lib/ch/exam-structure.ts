// EXAM STRUCTURE — what each exam this product practises actually asks for.
//
// WHY THIS FILE EXISTS. Until it was written, no swiss exam had its task structure
// recorded anywhere. Items carried charBands and minSeconds with nothing to check
// them against, which is the precondition that produced 121 malformed items in
// almi-french: authors work from whatever they last saw, and drift is invisible.
// The conformance gate (scripts/items/conformance-gate.mts) checks items against
// THIS file, so content and structure cannot quietly diverge.
//
// ── UNITS: CHARACTERS, NOT WORDS ─────────────────────────────────────────────
// Swiss items measure written length in CHARACTERS (payload.charBand) and spoken
// length in SECONDS (payload.minSeconds). Awarding bodies publish word counts. The
// conversions below use ~6.5 characters per word including spaces — German
// compounds run longer, French shorter — and every converted figure is OUR
// CONVENTION, never a limit the exam sets. A real exam sets a floor and a time,
// not a character ceiling.
//
// ── HOW STRICT EACH ENGINE IS, AND WHY THEY DIFFER ───────────────────────────
// telc/Goethe: STRICT per task, because the awarding bodies publish task counts and
//   approximate lengths, and each item declares WHICH exam it belongs to.
// fide: ENVELOPE only. fide is a FUNCTIONAL exam — it certifies what you can do in
//   daily life at A1/A2/B1, and does not publish a per-task word count. Its lengths
//   here are pitched by level, not by a fixed task shape, so the honest check is
//   "inside the range this product authors to", not equality against a published
//   figure that does not exist.
// delf-tcf: ENVELOPE, for a different reason — DELF is level-based and TCF is
//   scale-based, so one surface holds two incompatible shapes (see registry).
// canton-civic: NOT CHECKED. Knowledge MCQ carries no length or timing parameter,
//   so there is nothing to conform. Its correctness is guarded by verify-items
//   (answer keys self-grade) and the real-entity gate.

export type WrittenTask = {
  label: string;
  task: string;
  /** Approximate word count published by the body, where one exists. */
  approxWords?: number;
  /** Our character-band convention, derived from approxWords. NOT exam-set. */
  charMin: number;
  charMax: number;
};

export type SpokenTask = {
  label: string;
  task: string;
  minSeconds: number;
};

// ── telc / Goethe (German certificate surface) ───────────────────────────────
// TWO EXAMS, NOT ONE. The registry is explicit: "This bundle is telc AND Goethe:
// two exams, two papers." They are NOT interchangeable — Goethe B1 Schreiben has
// THREE tasks, telc B1 has ONE; their Sprechen parts differ too. Every item on this
// surface therefore declares which exam it is written for, and the gate checks it
// against that exam alone. A merged "telc-ish or Goethe-ish" shape is how the
// surface ended up holding translated DELF/TCF tasks in the first place.
//
// SCOPE: B1 only. The registry caps this surface at "A1–B1", and B1 is the ceiling
// a candidate would sit for naturalisation purposes. B2/C1/C2 are deliberately NOT
// recorded here — they were not sourced for this product, and the full telc/Goethe
// structure will be established at almi-goethe's own pass and reused rather than
// guessed twice.
//
// SOURCE: founder research, 2026-07-22. Task counts, formats and durations are
// solidly sourced; the ≈word figures are the bodies' own approximations and the
// character bands derived from them are this product's convention.
export const GOETHE_B1 = {
  exam: "GOETHE" as const,
  schreiben: {
    durationMinutes: 60,
    tasks: [
      { label: "Teil 1", task: "Informal personal email or letter to someone you know", approxWords: 80, charMin: 380, charMax: 700 },
      { label: "Teil 2", task: "Forum or comment post giving your opinion on a topic", approxWords: 80, charMin: 380, charMax: 700 },
      { label: "Teil 3", task: "Semi-formal short message: an excuse or a request", approxWords: 40, charMin: 180, charMax: 380 },
    ] satisfies WrittenTask[],
  },
  sprechen: {
    durationMinutes: 15,
    format: "pair",
    parts: [
      { label: "Teil 1", task: "Plan something together with your partner", minSeconds: 50 },
      { label: "Teil 2", task: "Present a topic to your partner", minSeconds: 90 },
      { label: "Teil 3", task: "Discuss the presentation you have just heard", minSeconds: 50 },
    ] satisfies SpokenTask[],
  },
};

export const TELC_B1 = {
  exam: "TELC" as const,
  schreiben: {
    durationMinutes: 30,
    tasks: [
      { label: "Schreiben", task: "One guided letter or email answering roughly four given points", approxWords: 80, charMin: 380, charMax: 700 },
    ] satisfies WrittenTask[],
  },
  sprechen: {
    durationMinutes: 15,
    format: "pair",
    parts: [
      { label: "Teil 1", task: "Kontaktaufnahme — get acquainted with your partner", minSeconds: 30 },
      { label: "Teil 2", task: "Gespräch über ein Thema — discuss a topic together", minSeconds: 90 },
      { label: "Teil 3", task: "Gemeinsam etwas planen — plan something together", minSeconds: 50 },
    ] satisfies SpokenTask[],
  },
};

/** Which exam an item on the telc-goethe surface is written for. */
export const CERTIFICATE_VARIANTS = ["GOETHE", "TELC"] as const;
export type CertificateVariant = (typeof CERTIFICATE_VARIANTS)[number];

// ── fide (naturalisation and C permit) ───────────────────────────────────────
// fide is FUNCTIONAL: it certifies what a candidate can do in daily life — fill in
// a municipal form, write a note to a neighbour, handle a role-play at a counter —
// at A1, A2 or B1. The Sekretariat fide publishes the task TYPES and the level, not
// a word count per task. So there is no published figure to check equality against,
// and inventing one would be the fabrication this file exists to prevent.
//
// The envelope below is therefore explicitly OUR authoring range across A1–B1, not
// an exam limit. It exists to catch an item pitched wildly outside the surface (a
// 2000-character essay in a functional A1–B1 bank), not to police ±20 characters.
export const FIDE = {
  writtenTaskTypes: [
    "Municipal or administrative form",
    "Short message: SMS, note, or slip to a neighbour or teacher",
    "Short email or letter on a daily-life matter",
  ],
  spokenTaskTypes: [
    "Describe or respond to an image",
    "Role-play a daily-life encounter (counter, telephone, appointment)",
    "Talk about your own everyday circumstances",
  ],
  /** SANITY BOUND for A1–B1 functional writing — deliberately wide.
   *
   *  Derived from what CEFR A1–B1 functional tasks actually ask for: an A1 form
   *  entry or SMS can be ten words (~60 characters), a B1 letter about 150 (~1000).
   *  It is NOT derived from what this bank happens to contain — an envelope fitted
   *  to the current items would ratify whatever is there and could never go red.
   *
   *  A first attempt set the floor at 120 and immediately failed ten legitimate
   *  fide-c-permit items ("SMS: Ich bin krank", 70–200) — the gate was wrong, not
   *  the content. A gate that fails on correct content trains you to ignore it.
   *
   *  This catches gross drift (a 2000-character essay in a functional bank), not a
   *  ±20-character difference. fide publishes no per-task word count, so a wide
   *  honest bound is the most this check can truthfully assert. */
  charEnvelope: { min: 60, max: 1000 },
  /** Same reasoning for speaking: a short A1 exchange runs ~20 s, a B1 turn ~2 min. */
  secondsEnvelope: { min: 20, max: 120 },
};

// ── DELF / TCF (French certificate surface) ──────────────────────────────────
// The registry notes these are "not even the same KIND of test": DELF is
// level-based, TCF is scale-based, and this one surface holds both. So the check is
// an envelope, not a per-task equality.
//
// SOURCES, read 2026-07-22 for almi-french and reused here rather than re-derived:
//   DELF A1–B2 — France Éducation International, the awarding body, verified
//     2026-07-15 (see almi-french/src/lib/french/delf-structure.ts). A1 "a message
//     of about 40 words"; A2 "two productions of about 60 words each"; B1 "one
//     production of about 160 words".
//   TCF tâches — Prep2Pass, https://prep2pass.ca/exam-explanation: T1 60–120 words,
//     T2 120–150, T3 120–180; orale T1 2 min, T2 2 min prep + 3 min 30, T3 4 min 30.
// Swiss caps this surface at A1–B1, so DELF B2 and the TCF upper tâches are out of
// scope here. Character bands are converted convention, as above.
export const DELF_TCF = {
  /** Same sanity bound and same reasoning as fide's — see the note there. Swiss
   *  caps this surface at A1–B1, and one surface holding both a level-based and a
   *  scale-based exam cannot support a per-task equality check. */
  charEnvelope: { min: 60, max: 1000 },
  secondsEnvelope: { min: 20, max: 120 },
};
