// Deterministic, honest, varied content generator for the pSEO matrix.
// Every page is composed from its axes' REAL attributes; phrasing variants are
// selected by hash(slug) so text distributes across millions of pages without
// thin duplication.
//
// HONESTY GUARDRAILS — these are not style notes, they are product rules:
//   • Readiness is a per-skill band/estimate, NEVER an official result from SEM, a
//     canton, or a fide test centre.
//   • B1 spoken + A2 written is the FEDERAL MINIMUM for naturalisation. Never state
//     it as "the requirement": for an ORDINARY naturalisation the canton and commune
//     decide and may ask more. Every level claim pairs with the canton hedge.
//   • Never assert a national civics test. Switzerland has none — cantons and
//     communes differ. Never invent a canton's questions, format, or pass mark.
//   • WE DO NOT PREPARE ANYONE FOR UNIVERSITY ADMISSION, and this file must never
//     imply we do. This is the sharpest fork trap in the whole product: the ancestor
//     funnelled its study pages to Tisus — a REAL university admission exam at ≈C1.  hygiene-allow
//     The mechanical port is "practise fide for admission", which is FALSE. fide runs
//     A1–B1 and is a naturalisation/permit test; it admits nobody anywhere. Swiss
//     universities set their own requirement — typically C1 in the language that
//     university teaches in (Goethe C1/C2, TestDaF, DALF), or English for many
//     master's. Our registry has no university track ON PURPOSE. The study page
//     therefore says plainly what universities want and that it is not what we teach.
//   • Which national language applies is decided by the CANTON, not the reader, and
//     not by us. Never write "the Swiss language requirement" as if there is one.
//   • Facts about Swiss institutions must be TRUE and Swiss. This file's ancestor
//     shipped Danish universities described as Norwegian, and a Danish health        hygiene-allow
//     regulator labelled "the Norwegian Patient Safety Authority", to production.    hygiene-allow
//     Check every proper noun against the country you are in.

import { LANGUAGE_LABEL } from "@/lib/ch/types";
import {
  ALL_EXAMS, examBySlug,
  CITIZENSHIP_HEDGE as CH_CITIZENSHIP_HEDGE, CANTON_HEDGE, CIVIC_HEDGE,
  LANGUAGE_CHOICE_HEDGE, STANDARD_GERMAN_NOTE, C_PERMIT_PROVENANCE, C_PERMIT_LEVELS,
  NATURALISATION_MIN, type ExamMeta,
} from "@/lib/ch/registry";
import {
  hash, pick, studyPath, jobsPath,
  UNIVERSITIES, COUNTRIES, HUBS,
  type SeoUniversity, type SeoRole, type SeoCountry, type SeoSubject, type SeoHub,
} from "@/lib/seo/axes";
import { uniTeaches } from "@/lib/seo/subject-mapper";
import type { OriginBlock } from "@/lib/seo/origin-localization";
import { SITE_URL as SITE } from "@/lib/site";

// Strip trailing punctuation from a concern fragment so it reads cleanly when
// we quote it inline (e.g. `"…recognised back home"` not `"…back home?."`).
const cleanConcern = (s: string) => s.replace(/\s*[.?;]+\s*$/, "").trim();



export interface SeoPage {
  h1: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  canonicalPath: string;
  /** Taught-gate: false = thin/untaught cell → route emits robots:{index:false}. */
  indexable: boolean;
  intro: string[];
  sections: { heading: string; body: string[] }[];
  faq: { q: string; a: string }[];
  related: { href: string; label: string }[];
  breadcrumbs: { name: string; path: string }[];
  jsonLd: Record<string, unknown>;
}

// Honest per-subject descriptors + whether the field is typically regulated.
// `regulated` drives the extra licensing paragraph, NOT the language level —
// see levelForStudy() for why.
const SUBJECT_META: Record<string, { field: string; regulated: boolean }> = {
  "medicine-health-sciences": { field: "medicine, nursing and the health sciences", regulated: true },
  "engineering-technology": { field: "engineering and applied technology", regulated: false },
  "computer-science-it": { field: "computer science, software and IT", regulated: false },
  "business-management": { field: "business, management and economics", regulated: false },
  "law": { field: "law and legal studies", regulated: true },
  "natural-sciences": { field: "the natural sciences", regulated: false },
  "arts-humanities": { field: "the arts and humanities", regulated: false },
  "social-sciences": { field: "the social sciences", regulated: false },
  "education": { field: "education and teaching", regulated: true },
  "mathematics-statistics": { field: "mathematics and statistics", regulated: false },
  "architecture-design": { field: "architecture and design", regulated: true },
  "agriculture-environment": { field: "agriculture and environmental science", regulated: false },
};

// The exams the funnel links to.
// The exams the funnel links to. NOTE WHAT IS ABSENT: any university-admission
// exam. The ancestor had one (Tisus, ≈C1) and pointed every study page at it. We  hygiene-allow
// have none, because fide is not one — see the guardrail above. Adding a
// `UNIVERSITY` entry here to make the funnel symmetrical would be inventing a
// product we do not have.
const FIDE_DE = examBySlug("fide-german")!; // citizenship track, German (lead)
const FIDE_FR = examBySlug("fide-french")!; // citizenship track, French
const CIVIC_DE = examBySlug("canton-civic-german")!; // local-knowledge PRACTICE, not an exam

// A short roster of well-known Swiss universities, named generically so the copy
// never fabricates a specific programme claim. These are SWISS institutions — verify
// before ever editing this line.
//
// The parenthetical language is not decoration: in Switzerland the university's
// language of instruction IS the language requirement, and it differs between
// institutions in the same country. That is the fact this whole page turns on, so it
// is carried in the roster itself rather than asserted loosely nearby.
const SWISS_UNIS =
  "ETH Zurich and the University of Zurich (German), EPFL and the University of Geneva (French), the Università della Svizzera italiana in Lugano (Italian), and others including Basel, Bern, Lausanne and St. Gallen";

// Shared honest fragments -----------------------------------------------------
const READINESS_LINE =
  "AlmiSwiss gives you an honest readiness estimate — a per-skill band (Clear or Borderline) against the real criteria — never an invented official result. AlmiSwiss is not affiliated with SEM, with any canton, or with a fide test centre, and none of them endorse unofficial practice, including ours. Only a recognised test centre issues a real result.";
// Sourced from the registry rather than restated here, so the wording of the single
// most consequential claim in the product exists in exactly one place.
const CITIZENSHIP_HEDGE = `${CH_CITIZENSHIP_HEDGE} We help you prepare fairly; we never claim to help anyone shortcut or beat the process.`;
const MISSION_LINE =
  "25% of AlmiSwiss proceeds fund the Shamool Foundation's social mission.";
const CTA_LINE =
  "Reading and Listening practice is free; AI feedback on Writing and Speaking and the full timed mock become available with a 7-day free trial ($12/month after, cancel anytime).";
// Canton civic content has no Writing/Speaking — it is a single KNOWLEDGE module.
// Offering "AI feedback on Writing and Speaking" there would be selling something the
// module does not contain.
const CTA_LINE_KNOWLEDGE =
  "The local-knowledge practice questions are free and unlimited — no card needed. A subscription ($12/month after a 7-day free trial) covers the language tracks: AI feedback on Writing and Speaking, and the full timed mock.";

// DELIBERATELY NOT A FUNCTION THAT RETURNS ONE OF OUR EXAMS.
//
// The ancestor had `levelForStudy()` returning Tisus, and every study page said  hygiene-allow
// "practise for Tisus". Ported mechanically that becomes "practise fide for  hygiene-allow
// admission" — false, and the most damaging kind of false, because a reader would
// prepare for the wrong thing for months.
//
// Switzerland has no single admission language requirement to return. It depends on
// the university, because it depends on which language that university teaches in,
// and the level is typically C1 — above everything we offer. So the honest answer to
// "which of your exams do I take to get in?" is: none of them. That is what this
// says, and callers must render it rather than a level.
const ADMISSION_TRUTH =
  "There is no single Swiss language requirement for study, because there is no single language of instruction. Each university sets its own: a German-taught programme typically asks for around C1 in German (commonly a Goethe C1/C2 certificate or TestDaF), a French-taught one for around C1 in French (commonly DALF), and many master's programmes are taught entirely in English and ask for IELTS or TOEFL instead. Only the university and programme can tell you what they accept — confirm it there, and treat any site that quotes you one number for all of Switzerland with suspicion.";

// Said plainly, because the alternative is letting a reader assume.
const NOT_ADMISSION_LINE =
  "To be direct about what we are not: AlmiSwiss does not prepare you for university admission. fide is a naturalisation and permit test that runs from A1 to B1 — it is not an admission exam and no university takes it as one. If you need C1 for a degree programme, you need a different exam than anything we offer, and we would rather say so than sell you the wrong thing.";

// Display label for an exam. Append the level only when the name doesn't already
// carry it, to avoid duplication like "fide (A1–B1) (A1–B1)".
function examLabel(e: ExamMeta): string {
  return e.name.includes(e.cefr) ? e.name : `${e.name} (${e.cefr})`;
}

// A few sibling internal links (same subject, other origin countries).
function relatedStudy(subject: SeoSubject, country: SeoCountry, seed: number): { href: string; label: string }[] {
  const others = COUNTRIES.filter((c) => c.slug !== country.slug);
  const picks = [others[seed % others.length], others[(seed * 7 + 3) % others.length], others[(seed * 13 + 5) % others.length]]
    .filter((c, i, a) => c && a.findIndex((x) => x.slug === c.slug) === i);
  const uniPick = UNIVERSITIES[(seed * 17) % UNIVERSITIES.length];
  return picks.map((c) => ({ href: studyPath(subject.slug, c.slug, uniPick.slug), label: `${subject.name} in Switzerland from ${c.name}` }));
}

// ---- STUDY PAGE -------------------------------------------------------------
export function buildStudyPage(subject: SeoSubject, country: SeoCountry, uni: SeoUniversity, origin: OriginBlock): SeoPage {
  const path = studyPath(subject.slug, country.slug, uni.slug);
  const seed = hash(path);
  const sm = SUBJECT_META[subject.slug] ?? { field: subject.name.toLowerCase(), regulated: false };
  const uniPlace = [uni.city, uni.countryName].filter(Boolean).join(", ");

  // TAUGHT-GATE: index only where the reference institution actually lists the
  // subject. A thin, untaught cell is noindexed and canonicals UP to the subject
  // hub — a route that EXISTS — never to a subject×origin URL with no page (404).
  const taught = uniTeaches(uni, subject.slug);
  const canonicalPath = taught ? path : `/study-in-switzerland/${subject.slug}`;

  const recognitionSection = {
    heading: `Using a Swiss degree back in ${country.name}`,
    body: [
      origin.localized
        ? `In ${country.name}, recognition of a foreign degree goes through ${origin.recognitionBody}${origin.recognitionUrl ? ` (${origin.recognitionUrl})` : ""}. ${origin.equivalenceNote}`
        : origin.equivalenceNote,
      `A common concern for students from ${country.name} — "${cleanConcern(origin.commonConcern)}" — is worth planning early, alongside the language question.${origin.sourceNote ? ` (${origin.sourceNote})` : ""}${origin.searchTerms.length ? ` Students from ${country.name} commonly search for: ${origin.searchTerms.join(", ")}.` : ""}`,
    ],
  };

  const introVariants = [
    `Planning to study ${sm.field} in Switzerland from ${country.name}? ${SWISS_UNIS} all offer strong programmes across ${subject.name.toLowerCase()}. Notice the languages in that list — they are not a detail. Which one you need depends on which university you go to, not on Switzerland.`,
    `${subject.name} draws students from ${country.name} to Switzerland every year. What surprises people is that "the Swiss language requirement" does not exist: a degree in Zurich, one in Geneva and one in Lugano ask for three different languages, and plenty of master's ask for English.`,
    `If you're coming from ${country.name} to study ${sm.field} in Switzerland, the language question has a different shape than you might expect. There is no national answer to it — only a per-university one, and it starts with the language that university teaches in.`,
  ];
  const uniLine = taught
    ? `${uni.name} — based in ${uniPlace} — lists programmes associated with ${subject.name.toLowerCase()}${uni.subjects.length ? ` (fields such as ${uni.subjects.slice(0, 3).join(", ")})` : ""}. Your degree background matters for admission, and language proficiency is assessed separately by the Swiss university you apply to.`
    : `${uni.name} — based in ${uniPlace} — is in our directory, but its public listing doesn't specifically show ${subject.name.toLowerCase()}. For a verified overview see the ${subject.name} in Switzerland guide; here we focus on the language question, which applies wherever you study.`;

  return {
    h1: `Study ${subject.name} in Switzerland from ${country.name}`,
    subtitle: `Reference institution: ${uni.name} (${uniPlace})`,
    metaTitle: `Study ${subject.name} in Switzerland from ${country.name} — the language question`,
    metaDescription: `What language you actually need to study ${sm.field} in Switzerland from ${country.name} — it depends on the university, not the country — plus degree recognition via ${origin.recognitionBody}. Honest about what we do and don't prepare you for.`,
    canonicalPath,
    indexable: taught,
    intro: [pick(introVariants, seed), uniLine],
    sections: [
      {
        heading: "Which language, and how much of it?",
        body: [
          ADMISSION_TRUTH,
          sm.regulated
            ? `${subject.name} is often a regulated field, and in Switzerland that adds a second, separate hurdle after your degree: practising the profession requires recognition of your qualification and can carry its own language requirement, set by the competent authority for that profession rather than by the university. Admission and the right to practise are two different decisions made by two different bodies — plan for both, and confirm each with the body that actually makes it.`
            : `For ${sm.field}, the practical advice is to aim a level above the programme's minimum. The requirement is what gets you admitted; it is everyday life — housing, insurance, a part-time job, the people around you — that decides whether you can actually live where you are studying.`,
        ],
      },
      recognitionSection,
      {
        heading: "What we do — and what we don't",
        body: [
          NOT_ADMISSION_LINE,
          `What AlmiSwiss does prepare you for is the language you need to LIVE here: fide, the test used for settlement permits and naturalisation, in German or French. That matters to students more often than they expect, because degrees turn into jobs and jobs turn into staying. ${LANGUAGE_CHOICE_HEDGE}`,
        ],
      },
      {
        heading: "Thinking about staying after your studies?",
        body: [
          `If you plan to remain in Switzerland after graduating, the language stops being an admission requirement and becomes a residence one — and that is the part we can genuinely help with. ${CITIZENSHIP_HEDGE}`,
          `${READINESS_LINE} ${CTA_LINE}`,
        ],
      },
    ],
    faq: [
      { q: `Do I need German to study ${subject.name} in Switzerland?`, a: `Only if you study somewhere that teaches in German. Zurich and Basel do; Geneva and Lausanne teach in French; Lugano teaches in Italian; and many master's programmes across all of them are taught in English and ask for IELTS or TOEFL instead. There is no single national answer — the university and programme decide, so confirm it with them.` },
      { q: `Can I use fide to get into a Swiss university?`, a: `No. fide runs from A1 to B1 and exists for settlement permits and naturalisation — no university accepts it for admission. Degree programmes typically want around C1 in their language of instruction, through a certificate such as Goethe C1/C2, TestDaF or DALF, or English through IELTS or TOEFL. We would rather tell you that than sell you practice that cannot get you in.` },
      { q: `Will a Swiss degree be recognised in ${country.name}?`, a: origin.localized
        ? `Recognition of a foreign degree in ${country.name} goes through ${origin.recognitionBody}. ${origin.equivalenceNote} Confirm the current process on the official site${origin.recognitionUrl ? ` (${origin.recognitionUrl})` : ""}.`
        : origin.equivalenceNote },
      { q: `Is the readiness estimate my real result?`, a: `No. It's a practice estimate against the real criteria, to guide your prep. Only a recognised test centre issues a real result.` },
    ],
    related: [
      { href: `/exams/${FIDE_DE.slug}`, label: `${FIDE_DE.name} — for permits and citizenship` },
      { href: `/exams/${FIDE_FR.slug}`, label: `${FIDE_FR.name} — for permits and citizenship` },
      { href: `/swiss-naturalisation-language`, label: `The language levels Swiss naturalisation asks for` },
      ...relatedStudy(subject, country, seed),
    ],
    breadcrumbs: [
      { name: "Study in Switzerland", path: "/study-in-switzerland" },
      { name: subject.name, path: `/study-in-switzerland/${subject.slug}` },
      { name: country.name, path: path },
    ],
    jsonLd: faqJsonLd([
      { q: `Do I need German to study ${subject.name} in Switzerland?`, a: `Only if the university teaches in German. Zurich and Basel teach in German, Geneva and Lausanne in French, Lugano in Italian, and many master's are taught in English. The university and programme set the requirement.` },
      { q: `Can I use fide to get into a Swiss university?`, a: `No. fide runs A1–B1 and is for settlement permits and naturalisation. Universities typically ask for around C1 in their language of instruction, or English via IELTS/TOEFL.` },
    ], `${SITE}${path}`, `Study ${subject.name} in Switzerland from ${country.name}`),
  };
}

// ---- JOBS PAGE --------------------------------------------------------------
export function buildJobsPage(role: SeoRole, country: SeoCountry, hub: SeoHub, origin: OriginBlock): SeoPage {
  const path = jobsPath(role.slug, country.slug, hub.slug);
  const seed = hash(path);
  const clientFacing = role.collar === "pink" || role.collar === "white";

  // Which language this hub actually runs on is a FACT OF THE HUB, not a preference
  // of the reader — it is carried on the axis (hub.region) and must never be
  // flattened into "German" because German is the largest. A Genf/Lausanne page that
  // tells a nurse to learn German is the same class of error as the ancestor telling
  // Norwegian healthcare applicants to seek authorisation from Denmark's regulator.  hygiene-allow
  const french = /French/i.test(hub.region);
  const italian = /Italian/i.test(hub.region);
  const hubLang = french ? "French" : italian ? "Italian" : "German";
  const hubExam = french ? FIDE_FR : FIDE_DE;
  const dialectNote = hubLang === "German" ? ` ${STANDARD_GERMAN_NOTE}` : "";

  const introVariants = [
    `Moving from ${country.name} to work as a ${role.name} in ${hub.name}? ${hub.profile} How much ${hubLang} you need depends a lot on the role — and it's easy to underestimate.`,
    `${role.name}s from ${country.name} looking at ${hub.name} face two questions: is there demand, and how good does my ${hubLang} need to be? ${hub.profile}`,
    `Working in Switzerland as a ${role.name} — coming from ${country.name} — usually starts with the language, and in ${hub.name} that language is ${hubLang}. ${hub.profile}`,
  ];

  return {
    h1: `Work in Switzerland as a ${role.name} from ${country.name}`,
    subtitle: `${hub.name} · ${hub.region}`,
    metaTitle: `Work in Switzerland as a ${role.name} from ${country.name} (${hub.name}) — the ${hubLang} you'll need`,
    metaDescription: `The language side of working as a ${role.name} in ${hub.name}, coming from ${country.name} — how much ${hubLang} you'll need, qualification recognition via ${origin.recognitionBody}, and honest readiness practice. Confirm specifics with employers and the cantonal authority.`,
    canonicalPath: path,
    indexable: true,
    intro: [pick(introVariants, seed)],
    sections: [
      {
        heading: `How much ${hubLang} does a ${role.name} in ${hub.name} need?`,
        body: [
          clientFacing
            ? `As a ${role.name} you'll deal with colleagues, clients or patients directly, so employers here generally expect conversational-to-professional ${hubLang} — think B1–B2 and up. Even in workplaces that run on English, ${hubLang} decides how much of ${hub.name} is actually open to you.${dialectNote}`
            : `A ${role.name} in a technical or international team in ${hub.name} may work largely in English — common in Swiss finance, pharma, tech and research. But ${hubLang} still governs admin, teammates and daily life, and it becomes decisive the moment you think about staying: a permit does not care what language your employer uses.${dialectNote}`,
          `Some professions are regulated, and in Switzerland recognition of a foreign qualification and the right to practise are decided by the competent federal or cantonal authority for that profession — not by your employer, and not by the language test. Each sets its own requirements. Confirm both with the employer and with the authority that actually regulates your profession. ${origin.localized ? `If you trained in ${country.name}, your qualification's home recognition runs through ${origin.recognitionBody}${origin.recognitionUrl ? ` (${origin.recognitionUrl})` : ""}; ${origin.equivalenceNote}` : origin.equivalenceNote} A common concern coming from ${country.name}: "${cleanConcern(origin.commonConcern)}".${origin.searchTerms.length ? ` Searches from ${country.name} often include: ${origin.searchTerms.join(", ")}.` : ""}`,
        ],
      },
      {
        heading: `Why ${hub.name} means ${hubLang}, and not the other national languages`,
        body: [
          `${hub.region}. That is the whole reason this page is about ${hubLang}: Switzerland has three relevant national languages, and your canton — not you, and not your employer — decides which one your permit and naturalisation procedure run in. Someone doing your exact job an hour away may need a different language entirely. ${CANTON_HEDGE}`,
        ],
      },
      {
        heading: "Settling in Switzerland, and later citizenship",
        body: [
          `If working in ${hub.name} is a step toward settling, the language matters well beyond the job. The settlement permit asks less than naturalisation does — but how much less depends on your route. ${C_PERMIT_LEVELS.earlier.label} asks for ${C_PERMIT_LEVELS.earlier.spoken} spoken, the same speaking level as citizenship; ${C_PERMIT_LEVELS.ordinary.label} asks for ${C_PERMIT_LEVELS.ordinary.spoken} spoken. Both ask ${C_PERMIT_LEVELS.ordinary.written} written. ${C_PERMIT_PROVENANCE}`,
          `${CITIZENSHIP_HEDGE} ${origin.citizenshipNote}`,
        ],
      },
      {
        heading: `Practise the ${hubLang} you'll actually use — honestly`,
        body: [
          `${hubExam.name} is built around the situations you will actually be in — the Gemeinde counter, the insurer, the landlord, the parents' evening — rather than classroom exercises. Practise Reading, Listening, Writing and Speaking at the level you need. ${READINESS_LINE}`,
          CTA_LINE,
        ],
      },
    ],
    faq: [
      { q: `Do I need ${hubLang} to work as a ${role.name} in ${hub.name}?`, a: `It depends on the role. Client-facing and regulated jobs usually expect B1–B2 or more; some technical roles in ${hub.name} run largely in English. You'll still need ${hubLang} for daily life, and for any permit or naturalisation step later. Confirm the job side with the employer.` },
      { q: `Would German work instead?`, a: hubLang === "German" ? `In ${hub.name}, German is the language of the procedure — so yes. Note that daily life here runs largely on Swiss-German dialect while the recognised tests are set in Standard German; practise Standard German for the test and expect dialect around you.` : `Not for the procedure. ${hub.region}, so your permit and naturalisation steps run in ${hubLang}. German is a national language of Switzerland, but it is not the language of your canton's procedure — and it is the canton that decides. Confirm with your cantonal migration authority.` },
      { q: `Which level should I practise?`, a: `For naturalisation the federal minimum is ${NATURALISATION_MIN.spoken} spoken and ${NATURALISATION_MIN.written} written — but your canton and commune decide an ordinary naturalisation and can ask for more. Many employers want B1–B2 regardless. AlmiSwiss shows an honest readiness band, never an official result.` },
    ],
    related: [
      { href: `/exams/${hubExam.slug}`, label: `${hubExam.name} — the test used here` },
      { href: `/swiss-naturalisation-language`, label: `The language levels Swiss naturalisation asks for` },
      ...HUBS.filter((h) => h.slug !== hub.slug).map((h) => ({ href: jobsPath(role.slug, country.slug, h.slug), label: `${role.name} in ${h.name}` })),
    ],
    breadcrumbs: [
      { name: "Work in Switzerland", path: "/work-in-switzerland" },
      { name: role.name, path: `/work-in-switzerland/${role.slug}` },
      { name: `${country.name} · ${hub.name}`, path: path },
    ],
    jsonLd: faqJsonLd([
      { q: `Do I need ${hubLang} to work as a ${role.name} in ${hub.name}?`, a: `It depends on the role; client-facing and regulated jobs usually expect B1–B2. ${hub.region}, so the language of any permit or naturalisation procedure here is ${hubLang}. Confirm with the employer and your cantonal migration authority.` },
    ], `${SITE}${path}`, `Work in Switzerland as a ${role.name} from ${country.name}`),
  };
}

// ---- EXAM LEVEL PAGE --------------------------------------------------------
export function buildLevelPage(exam: ExamMeta): SeoPage {
  const path = `/exams/${exam.slug}`;
  const isLead = exam.lead === true; // fide on the citizenship track
  const isCivic = exam.civic === true; // canton local knowledge — NOT an exam
  const lang = LANGUAGE_LABEL[exam.language];

  // Canton civic content is the one place this product could most easily fabricate a
  // national test, because every other country in the family HAS one. It does not get
  // exam framing anywhere: not in the h1, not in the meta, not in the FAQ.
  const civicLine = ` It is local-knowledge practice, not a test — Switzerland has no national civics exam, and what your commune asks of you is decided there.`;
  const languageLine = ` It assesses Reading, Listening, Writing and Speaking in ${lang}, the language your canton's procedure runs in.`;
  const trackLine = isCivic ? civicLine : languageLine;

  const levelSentence = isCivic
    ? `${exam.name} is practice for the local-knowledge step some Swiss cantons and communes include in a naturalisation procedure.`
    : `${exam.name} sits at CEFR ${exam.cefr}.`;
  const levelQ = `What is ${exam.name}?`;
  const levelA = isCivic
    ? `It is original practice for the kind of local knowledge naturalisation procedures tend to cover. ${CIVIC_HEDGE}`
    : `${exam.name} covers CEFR ${exam.cefr} and is used as proof of language for settlement permits and naturalisation. AlmiSwiss shows an honest per-skill readiness band, not an official result.`;

  const skillsAssessed = isCivic
    ? " It is answered as multiple-choice questions; a strong result means you know the material well, and nothing more than that."
    : " A strong result means being ready across all four skills — which matters, because the levels asked of you are not the same for each.";

  return {
    h1: isCivic
      ? `${exam.name} — local knowledge, not a national test`
      : isLead
        ? `${exam.name} — the language test for permits and naturalisation`
        : `${examLabel(exam)} — recognised certificate`,
    subtitle: exam.blurb,
    metaTitle: isCivic
      ? `${exam.name}: what Swiss cantons actually ask — and what nobody can tell you`
      : `${examLabel(exam)} — format, levels & honest practice`,
    metaDescription: `${examLabel(exam)}: what it covers, which levels apply, and honest readiness practice. ${isCivic ? "There is no national Swiss civics test — cantons and communes each decide. We never invent one." : `The federal minimum for naturalisation is ${NATURALISATION_MIN.spoken} spoken and ${NATURALISATION_MIN.written} written, but your canton decides. A practice estimate, not an official result.`}`,
    canonicalPath: path,
    indexable: true,
    intro: [`${levelSentence}${trackLine}${skillsAssessed}`],
    sections: [
      isCivic
        ? { heading: "What is actually known — and what isn't", body: [CIVIC_HEDGE, CITIZENSHIP_HEDGE] }
        : { heading: `Who ${exam.name} is for`, body: [exam.blurb, LANGUAGE_CHOICE_HEDGE] },
      ...(isCivic
        ? [{
            heading: "Why we will not show you a pass mark",
            body: [
              `Every other country in this family has a national civics test with a published format. Switzerland does not, and that absence is the whole point: cantons and communes decide for themselves, some with a written test, some with an interview, some with neither, and each sets its own content. So there is no national pass mark to show you, and anybody quoting one has invented it. Our questions are original practice on the areas these procedures tend to cover — they are not any canton's question bank, and no score here is a result. Ask your commune what your procedure actually involves.`,
            ],
          }]
        : [{
            heading: "Which level do you actually need?",
            body: [
              `For naturalisation, the federal minimum is ${NATURALISATION_MIN.spoken} spoken and ${NATURALISATION_MIN.written} written in one national language. Read that carefully: it is a MINIMUM, and it is not symmetrical — speaking is asked at a full CEFR level above writing. ${CITIZENSHIP_HEDGE}`,
              `For the settlement permit the levels are lower — but "lower" hides the thing that matters. ${C_PERMIT_LEVELS.earlier.label} asks ${C_PERMIT_LEVELS.earlier.spoken} spoken, exactly the same speaking level as citizenship; only ${C_PERMIT_LEVELS.ordinary.label} drops to ${C_PERMIT_LEVELS.ordinary.spoken}. Both ask ${C_PERMIT_LEVELS.ordinary.written} written. If you are on the five-year route and someone told you the permit needs less speaking than citizenship, they were wrong. ${C_PERMIT_PROVENANCE}`,
            ],
          }]),
      ...(exam.language === "DE" && !isCivic
        ? [{ heading: "Standard German, not dialect", body: [STANDARD_GERMAN_NOTE] }]
        : []),
      {
        heading: "Honest readiness, not a fake score",
        body: [
          isCivic
            ? `Every question is auto-marked so you can see where you stand. Because no canton publishes a pass mark for this, we do not show one — we show what you got right and where the gaps are. ${READINESS_LINE}`
            : `Reading and Listening are auto-marked to a clear per-skill band — Clear or Borderline — against the real criteria. Writing and Speaking get AI feedback, labelled as an estimate. Because the levels are asymmetrical, we band each skill separately rather than averaging them into one number that would hide exactly the gap that decides your case. ${READINESS_LINE}`,
          isCivic ? CTA_LINE_KNOWLEDGE : CTA_LINE,
        ],
      },
      {
        heading: "Prepare by where you're coming from",
        body: [`Studying or working in Switzerland? See the language pathway for your situation — from any country, for study or work.`],
      },
    ],
    faq: [
      { q: levelQ, a: levelA },
      isCivic
        ? { q: `What score do I need to pass?`, a: `Nobody can honestly tell you, because there is no national test to pass. Your canton and commune decide what your procedure involves and set their own content — some use a written test, some an interview, some neither. Anyone quoting you a national pass mark for Swiss civics has made it up. Ask your commune.` }
        : { q: `Is my AlmiSwiss result official?`, a: `No — it's an honest practice estimate to guide your prep. Only a recognised test centre issues a real result, and only your canton and commune decide your case.` },
      ...(!isCivic
        ? [
            { q: `Is ${NATURALISATION_MIN.spoken} spoken and ${NATURALISATION_MIN.written} written enough for citizenship?`, a: `It is the federal minimum, which is not the same as "enough". For an ordinary naturalisation your canton and commune decide, and some ask for more than the federal floor. The figure is a floor to clear, not a target that guarantees anything — confirm what applies to you with your cantonal migration authority before you plan around it.` },
            { q: `Do I get to choose which national language I'm tested in?`, a: `No. ${LANGUAGE_CHOICE_HEDGE}` },
          ]
        : []),
    ],
    related: [
      ...ALL_EXAMS.filter((e) => e.slug !== exam.slug).map((e) => ({ href: `/exams/${e.slug}`, label: examLabel(e) })),
    ],
    breadcrumbs: [
      { name: "Swiss language tests", path: "/exams" },
      { name: examLabel(exam), path: path },
    ],
    jsonLd: faqJsonLd([{ q: levelQ, a: levelA }], `${SITE}${path}`, `${examLabel(exam)}`),
  };
}

function faqJsonLd(faq: { q: string; a: string }[], url: string, name: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": url, name, url },
      { "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };
}

export { MISSION_LINE, FIDE_DE, FIDE_FR, CIVIC_DE };
