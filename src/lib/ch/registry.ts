// AlmiSwiss — the "Choose a Test" tree + exam metadata.
// Goal-based tracks → language → exams → skills. Drives navigation, content
// filtering, and the honest readiness thresholds used by the scoring engine. All
// "pass" figures are framed as READINESS estimates, never an official result from
// SEM, a canton, or a fide test centre.
//
// ─────────────────────────────────────────────────────────────────────────────
// FACT BASE — provenance is recorded per claim BECAUSE THE TIERS DIFFER.
// Re-check before editing any claim here. Do not promote a tier-2 claim to
// tier-1 framing just because it has been in the file a while.
//
// TIER 1 — VERIFIED DIRECTLY AT SEM (sem.admin.ch, 2026-07-15):
//   • Naturalisation language requirement: B1 SPOKEN + A2 WRITTEN in one national
//     language. Taken verbatim from SEM's page on becoming Swiss.
//     ⚠️ CRITICAL SCOPE NOTE: that quote sits on the FACILITATED (married to a
//     Swiss citizen) page, where SEM ITSELF DECIDES. For ORDINARY naturalisation
//     the CANTON AND COMMUNE decide and may set their own, higher bar. These two
//     routes must never be blurred into one "Swiss requirement" — see
//     CITIZENSHIP_HEDGE, which every surface rendering a citizenship level must
//     also render.
//   • The canton hedge is SEM's own: it directs people to the cantonal migration
//     authorities for further information.
//   • NO NATIONAL CIVICS TEST EXISTS. This is an ABSENCE verified by its absence
//     from SEM — cantons and communes differ, some use a test, some an interview.
//     Absence is the hardest thing to keep true in a fork: nothing breaks if we
//     invent one. See the CANTON_CIVIC note in types.ts. Never assert a national
//     test, never invent a canton's questions, format, or pass mark.
//
// TIER 2 — FOUNDER-SUPPLIED, SECONDARY-SOURCED. NOT yet confirmed at SEM.
//   (Same handling as AlmiFrench's DELF structures: use it, but say where it came
//   from, in code, so the next person can tell tier 2 from tier 1.)
//   • C permit, ordinary route (10 years):    A2 spoken / A1 written
//   • C permit, early/fast-track (5 years):   B1 spoken / A1 written
//     Note the fast-track SPEAKING level equals the citizenship level. An earlier
//     draft described the C permit as simply "lower than citizenship"; that reads
//     as A2 speaking and would UNDER-PREPARE 5-year applicants on the deciding
//     skill. The split is why C_PERMIT is one track with two routes, not one level.
//     WHY IT IS STILL TIER 2: SEM's CEFR table is published as an IMAGE, and the
//     EDA/SEM "proof of language skills" factsheet PDFs return 403 to automated
//     fetches, so this could not be machine-verified. fide-service.ch also would
//     not load. Founder wants final confirmation against the SEM factsheet.
//     → When that confirmation lands, move these to tier 1 and say so here.
//
// TIER 1 — exam landscape (SEM):
//   • fide is the Swiss test; a pass issues the fide LANGUAGE PASSPORT.
//   • SEM-recognised certificate alternatives exist per language: telc/Goethe for
//     German, DELF/TCF for French, CELI for Italian.
//
// NOT MODELLED, DELIBERATELY:
//   • Romansh. A national language, but rarely the language of a naturalisation
//     procedure. Omitted rather than filled with invented content.
//   • Any national civics exam. See above.
//   • Any pass mark for canton civic content. Cantons differ; we have none.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  SwissTrack,
  SwissExam,
  SwissLanguage,
  LanguageExam,
  CivicModule,
  SwissSkill,
  LanguageSkill,
} from "./types";
import { SHIPPING_LANGUAGES, LANGUAGE_LABEL } from "./types";

export interface ExamMeta {
  exam: SwissExam;
  language: SwissLanguage; // which national language this entry is set in
  track: SwissTrack;
  slug: string; // URL slug — ALWAYS language-suffixed; see slugFor()
  name: string; // display name (the official exam name)
  cefr: string; // CEFR label, or "Local knowledge" for canton civic content
  blurb: string;
  skills: SwissSkill[];
  civic?: boolean; // true = canton-dependent local knowledge. NOT an exam.
  lead?: boolean; // the citizenship hook — fide
  mockMinutes: number; // full timed mock duration guidance
  cantonDependent?: boolean; // UI must render CANTON_HEDGE wherever this appears
}

// Authorities. SEM sets the federal minimum; the canton or commune decides an
// ordinary naturalisation. We never present a practice score as a result from
// either, nor from a fide test centre.
export const AUTHORITY = {
  federal: "SEM (State Secretariat for Migration / Staatssekretariat für Migration)",
  cantonal: "your cantonal migration authority (and, for naturalisation, your commune)",
} as const;

// The federal MINIMUM for naturalisation. Named "MINIMUM" on purpose: it is a
// floor, not the requirement in your canton.
export const NATURALISATION_MIN = {
  spoken: "B1",
  written: "A2",
} as const;

// Tier 2 — see the fact base. Rendered only alongside C_PERMIT_PROVENANCE.
export const C_PERMIT_LEVELS = {
  ordinary: { years: 10, spoken: "A2", written: "A1", label: "Ordinary route (after 10 years)" },
  earlier: { years: 5, spoken: "B1", written: "A1", label: "Early route (after 5 years)" },
} as const;

export const C_PERMIT_PROVENANCE =
  "These C permit levels come from SEM's published guidance as transcribed for us, not from a page we could verify automatically — SEM's CEFR table is an image and its factsheet PDFs block automated access. They are correct to the best of our knowledge; confirm yours with your cantonal migration authority before you plan around them.";

// The sentence that governs EVERY claim about a citizenship language level on this
// site. Every surface that renders a level must render this too.
export const CITIZENSHIP_HEDGE =
  "Switzerland's federal minimum for naturalisation is B1 spoken and A2 written in one national language — German, French or Italian, depending on where you live. Which language applies, and whether more is asked of you, depends on your canton and commune: for an ordinary naturalisation they decide, and some set a higher bar than the federal minimum. If you are married to a Swiss citizen, the facilitated route is decided by SEM instead. Confirm the requirement for your own canton and commune with the cantonal migration authority before you plan.";

// Rendered wherever a canton-dependent fact appears. SEM's own hedge, in our words.
export const CANTON_HEDGE =
  "Requirements and accepted proof vary by canton and commune — confirm yours with the cantonal migration authority.";

// The absence, stated out loud. If someone later asks "where's the civics test?",
// this is the answer — and the reason there is no exam to add.
export const CIVIC_HEDGE =
  "There is no national Swiss civics test. Cantons and communes handle local knowledge differently — some use a written test, some an interview, some neither — and they set their own content. So what follows is practice for the kinds of local knowledge these procedures tend to cover, not a mock of an exam. We will not invent a national test, or a canton's questions, and no score here is a result. Ask your commune what your procedure actually involves.";

// Which language you need is a fact about your canton, not a preference.
export const LANGUAGE_CHOICE_HEDGE =
  "You do not choose which national language you are tested in — your canton does. German, French and Italian are each the procedural language somewhere in Switzerland, and a few cantons are officially bilingual. Practise the one your canton and commune actually use.";

// Standard vs dialect — the thing people get wrong about German-speaking Switzerland.
export const STANDARD_GERMAN_NOTE =
  "Daily life in German-speaking Switzerland runs largely on Swiss-German dialect, but the recognised tests — fide, telc, Goethe — are set in Standard German. Practise Standard German for the test; expect dialect around you.";

// Per-skill readiness thresholds (honest). Shown as an estimate, clearly labelled.
export const READY_PCT = 70; // CLEAR — comfortably meeting the level's demands
export const BORDERLINE_PCT = 55; // BORDERLINE — close, needs consolidation

export const LANGUAGE_SKILLS: LanguageSkill[] = ["READING", "LISTENING", "WRITING", "SPEAKING"];

/** Skill labels in each national language. The `local` string is shown in the
 *  language the learner is actually being tested in — not a single national
 *  language, because there isn't one. */
export const SKILL_LABELS: Record<SwissSkill, { en: string; local: Record<SwissLanguage, string> }> = {
  READING: { en: "Reading", local: { DE: "Lesen", FR: "Compréhension écrite", IT: "Comprensione scritta" } },
  LISTENING: { en: "Listening", local: { DE: "Hören", FR: "Compréhension orale", IT: "Comprensione orale" } },
  WRITING: { en: "Writing", local: { DE: "Schreiben", FR: "Production écrite", IT: "Produzione scritta" } },
  SPEAKING: { en: "Speaking", local: { DE: "Sprechen", FR: "Production orale", IT: "Produzione orale" } },
  KNOWLEDGE: { en: "Local knowledge", local: { DE: "Ortskenntnisse", FR: "Connaissances locales", IT: "Conoscenze locali" } },
};

const LANG_SLUG: Record<SwissLanguage, string> = { DE: "german", FR: "french", IT: "italian" };

/** Exam slugs are ALWAYS language-suffixed. `fide` alone is ambiguous — fide is a
 *  different test in each language — and an ambiguous slug is how a French learner
 *  ends up on German content. */
export function slugFor(base: string, language: SwissLanguage): string {
  return `${base}-${LANG_SLUG[language]}`;
}

// ── The exam tree, generated per language so no language can silently drift ──
// Built from data rather than hand-listed: hand-listing is how a fork ends up with
// German entries a French learner can reach and French entries nobody maintains.

interface ExamTemplate {
  exam: LanguageExam;
  languages: SwissLanguage[];
  track: SwissTrack;
  base: string;
  name: (l: SwissLanguage) => string;
  cefr: string;
  blurb: (l: SwissLanguage) => string;
  mockMinutes: number;
  lead?: boolean;
  cantonDependent?: boolean;
}

const TEMPLATES: ExamTemplate[] = [
  {
    exam: "FIDE",
    languages: ["DE", "FR", "IT"],
    track: "CITIZENSHIP",
    base: "fide",
    name: (l) => `fide (${LANGUAGE_LABEL[l]})`,
    cefr: "A1–B1",
    blurb: (l) =>
      `The Swiss test, in ${LANGUAGE_LABEL[l]} — built around everyday situations you actually deal with here rather than classroom exercises. A pass issues the fide language passport, which is what naturalisation and permit procedures ask to see. The federal minimum for naturalisation is B1 spoken and A2 written; your canton decides what applies to you.`,
    mockMinutes: 120,
    lead: true,
    cantonDependent: true,
  },
  {
    exam: "FIDE",
    languages: ["DE", "FR", "IT"],
    track: "C_PERMIT",
    base: "fide-c-permit",
    name: (l) => `fide for the C permit (${LANGUAGE_LABEL[l]})`,
    cefr: "A1–B1",
    blurb: (l) =>
      `The same fide test in ${LANGUAGE_LABEL[l]}, aimed at the settlement permit rather than citizenship. The levels are lower than naturalisation — but they depend on your route: the early route after five years asks B1 spoken, the same speaking level as citizenship, while the ordinary route after ten years asks A2 spoken. Both ask A1 written.`,
    mockMinutes: 120,
    cantonDependent: true,
  },
  {
    exam: "TELC_GOETHE",
    languages: ["DE"],
    track: "CERTIFICATE",
    base: "telc-goethe",
    name: () => "telc / Goethe (German)",
    cefr: "A1–B1",
    blurb: () =>
      "SEM-recognised German certificates, accepted as proof of language alongside the fide passport. Set in Standard German, not Swiss-German dialect. Useful if you already hold one, or want a certificate that travels beyond Switzerland — check with your canton that the certificate and level you plan to take are accepted for your procedure.",
    mockMinutes: 150,
    cantonDependent: true,
  },
  {
    exam: "DELF_TCF",
    languages: ["FR"],
    track: "CERTIFICATE",
    base: "delf-tcf",
    name: () => "DELF / TCF (French)",
    cefr: "A1–B1",
    blurb: () =>
      "SEM-recognised French certificates, accepted as proof of language alongside the fide passport. Useful if you already hold one, or want a certificate that travels beyond Switzerland — check with your canton that the certificate and level you plan to take are accepted for your procedure.",
    mockMinutes: 150,
    cantonDependent: true,
  },
  {
    exam: "CELI",
    languages: ["IT"],
    track: "CERTIFICATE",
    base: "celi",
    name: () => "CELI (Italian)",
    cefr: "A1–B1",
    blurb: () =>
      "SEM-recognised Italian certificates, accepted as proof of language alongside the fide passport. Relevant in Ticino and the Italian-speaking valleys of Graubünden — check with your canton that the certificate and level you plan to take are accepted for your procedure.",
    mockMinutes: 150,
    cantonDependent: true,
  },
  {
    exam: "FIDE",
    languages: ["DE", "FR", "IT"],
    track: "GETTING_STARTED",
    base: "getting-started",
    name: (l) => `Getting started in ${LANGUAGE_LABEL[l]}`,
    cefr: "A1–A2",
    blurb: (l) =>
      `First steps in ${LANGUAGE_LABEL[l]} — the everyday language of appointments, housing, work and neighbours. Not an exam: the groundwork that makes fide at A2 and B1 reachable.`,
    mockMinutes: 90,
  },
];

/** Canton civic practice. NOT an exam — see CIVIC_HEDGE and types.ts. It is built
 *  per language because the procedure runs in your canton's language. */
function civicEntry(language: SwissLanguage): ExamMeta {
  return {
    exam: "CANTON_CIVIC" as CivicModule,
    language,
    track: "CANTON_CIVIC",
    slug: slugFor("canton-civic", language),
    name: `Living in Switzerland — local knowledge (${LANGUAGE_LABEL[language]})`,
    cefr: "Local knowledge",
    blurb:
      "Practice for the kinds of local knowledge naturalisation procedures tend to cover — how the political system works, rights and obligations, geography and everyday rules. There is no national civics test: your canton and commune decide whether you face a test, an interview, or neither, and set their own content. This is preparation, not a mock.",
    skills: ["KNOWLEDGE"],
    civic: true,
    cantonDependent: true,
    mockMinutes: 60,
  };
}

function buildExams(): ExamMeta[] {
  const out: ExamMeta[] = [];
  for (const t of TEMPLATES) {
    for (const language of t.languages) {
      // A language appears only once it actually ships content (Rule #7: ≥15 tasks
      // per module PER language track). Listing a language we have not built is how
      // a tree looks full and a learner finds an empty page.
      if (!SHIPPING_LANGUAGES.includes(language)) continue;
      out.push({
        exam: t.exam,
        language,
        track: t.track,
        slug: slugFor(t.base, language),
        name: t.name(language),
        cefr: t.cefr,
        blurb: t.blurb(language),
        skills: ["READING", "LISTENING", "WRITING", "SPEAKING"],
        mockMinutes: t.mockMinutes,
        lead: t.lead,
        cantonDependent: t.cantonDependent,
      });
    }
  }
  for (const language of SHIPPING_LANGUAGES) out.push(civicEntry(language));
  return out;
}

export const ALL_EXAMS: ExamMeta[] = buildExams();
export const LANGUAGE_EXAMS: ExamMeta[] = ALL_EXAMS.filter((e) => !e.civic);
export const CIVIC_MODULES: ExamMeta[] = ALL_EXAMS.filter((e) => e.civic);

// ── The goal-based "Choose a Test" tree ──
// Each track is a reason someone studies a Swiss national language; the exams under
// it are what that goal commonly requires. Tracks are language-independent — the
// language is chosen inside the track, because the goal is what the user knows and
// the language is what their canton decides.

export interface TrackMeta {
  track: SwissTrack;
  label: string;
  goal: string;
  requires: string;
  lead?: boolean;
  caveat: string; // shown wherever the track is surfaced — never optional here
}

export const TRACKS: TrackMeta[] = [
  {
    track: "CITIZENSHIP",
    label: "Swiss citizenship",
    goal: "Working toward Swiss naturalisation",
    requires: "fide — or an SEM-recognised certificate — at B1 spoken and A2 written",
    lead: true,
    caveat: CITIZENSHIP_HEDGE,
  },
  {
    track: "C_PERMIT",
    label: "C permit (settlement)",
    goal: "Applying for the settlement permit",
    requires: "fide at the permit levels — B1 spoken on the early route, A2 spoken on the ordinary route; A1 written on both",
    caveat: `${C_PERMIT_PROVENANCE} ${CANTON_HEDGE}`,
  },
  {
    track: "CERTIFICATE",
    label: "Language certificate",
    goal: "Proving your level with a recognised certificate",
    requires: "telc or Goethe (German) · DELF or TCF (French) · CELI (Italian)",
    caveat: `Recognised certificates are accepted alongside the fide passport, but which certificate and level your procedure accepts is decided locally. ${CANTON_HEDGE}`,
  },
  {
    track: "GETTING_STARTED",
    label: "Getting started",
    goal: "Starting out in German, French or Italian",
    requires: "A1–A2 everyday language — the groundwork, not an exam",
    caveat: LANGUAGE_CHOICE_HEDGE,
  },
  {
    track: "CANTON_CIVIC",
    label: "Local knowledge",
    goal: "Preparing for a canton or commune's local-knowledge step",
    requires: "No national test exists — what you face depends on your commune",
    caveat: CIVIC_HEDGE,
  },
];

export function examBySlug(slug: string): ExamMeta | undefined {
  return ALL_EXAMS.find((e) => e.slug === slug);
}

export function examsByTrack(track: SwissTrack): ExamMeta[] {
  return ALL_EXAMS.filter((e) => e.track === track);
}

export function examsByLanguage(language: SwissLanguage): ExamMeta[] {
  return ALL_EXAMS.filter((e) => e.language === language);
}

export function examFor(track: SwissTrack, language: SwissLanguage): ExamMeta | undefined {
  return ALL_EXAMS.find((e) => e.track === track && e.language === language);
}

export function trackMeta(track: SwissTrack): TrackMeta | undefined {
  return TRACKS.find((t) => t.track === track);
}

const LANGUAGE_EXAM_IDS: LanguageExam[] = ["FIDE", "TELC_GOETHE", "DELF_TCF", "CELI"];

export function isLanguageExam(exam: SwissExam): exam is LanguageExam {
  return (LANGUAGE_EXAM_IDS as string[]).includes(exam);
}

/** Canton civic content is NOT an exam. This predicate exists so callers can be
 *  forced to handle it differently — it must never render as "your test". */
export function isCivicModule(exam: SwissExam): exam is CivicModule {
  return exam === "CANTON_CIVIC";
}

/** The lead exam — fide, in the first shipping language. The citizenship hook. */
export function leadExam(): ExamMeta {
  return ALL_EXAMS.find((e) => e.lead) ?? ALL_EXAMS[0];
}
