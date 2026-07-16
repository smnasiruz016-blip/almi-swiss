// The facts behind the naturalisation-language page, kept separate from the view.
//
// Why they live here and not inside page.tsx: this is the most consequential set of
// claims in the product, and it must be readable and checkable without rendering a
// React tree. Splitting the data out means a script, a test, or a reviewer can
// import exactly what ships instead of reading a transcription of it — and a
// transcription is precisely the kind of copy that drifts.
//
// PROVENANCE, which differs per row and must not be flattened:
//   • NATURALISATION_MIN and who-decides: verified at SEM.
//   • C permit levels: founder-supplied, secondary-sourced, NOT confirmed at SEM —
//     every surface that shows them must also show C_PERMIT_PROVENANCE.
//   • The absence of a national civics test: verified by its absence from SEM.
// See src/lib/ch/registry.ts for the full fact base.

import { NATURALISATION_MIN, C_PERMIT_LEVELS, C_PERMIT_PROVENANCE } from "@/lib/ch/registry";

export interface Fact {
  k: string;
  v: string;
}

/** What is actually published. Every row here is checkable against a source. */
export const KNOWN: Fact[] = [
  {
    k: "The federal minimum",
    v: `${NATURALISATION_MIN.spoken} spoken and ${NATURALISATION_MIN.written} written in one national language — German, French or Italian. Published by SEM. A floor, not a guarantee.`,
  },
  {
    k: "Who decides",
    v: "For an ordinary naturalisation, your canton and commune. For the facilitated route (married to a Swiss citizen), SEM. These are different decisions by different bodies with different requirements — they are not interchangeable.",
  },
  {
    k: "Which language",
    v: "Whichever your canton uses — not your choice. A few cantons are officially bilingual, so it can depend on your commune.",
  },
  {
    k: "How you prove it",
    v: "The fide language passport, or an SEM-recognised certificate — telc or Goethe for German, DELF or TCF for French, CELI for Italian. Which your procedure accepts is decided locally.",
  },
  {
    k: "The C permit",
    v: `Lower than citizenship, but route-dependent: ${C_PERMIT_LEVELS.earlier.spoken} spoken on the early five-year route — the same as citizenship — and ${C_PERMIT_LEVELS.ordinary.spoken} spoken on the ordinary ten-year route. ${C_PERMIT_LEVELS.ordinary.written} written on both.`,
  },
];

/** What nobody can tell you. This list is the point of the page, not a caveat. */
export const UNKNOWN: Fact[] = [
  {
    k: "A national civics test",
    v: "Does not exist. Cantons and communes each decide what, if anything, they ask. We do not invent one, and we do not invent a canton's questions.",
  },
  {
    k: "Your canton's actual bar",
    v: "Not something any website can tell you — including this one. Some cantons ask more than the federal minimum. Only your cantonal migration authority and your commune know your case.",
  },
  {
    k: "A national pass mark for local knowledge",
    v: "There isn't one to publish, because there is no national test. Anyone quoting you a number has made it up.",
  },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: "What language level do I need for Swiss naturalisation?",
    a: `The federal minimum is ${NATURALISATION_MIN.spoken} spoken and ${NATURALISATION_MIN.written} written in one national language — German, French or Italian. Read "minimum" carefully: it is a floor set by the Confederation, not the answer to your case. For an ordinary naturalisation your canton and commune decide, and some ask for more than the federal floor. If you are married to a Swiss citizen, the facilitated route is decided by SEM instead. Confirm what applies to you with your cantonal migration authority.`,
  },
  {
    q: "Why is speaking a higher level than writing?",
    a: `Because the requirement is not symmetrical: speaking is asked at ${NATURALISATION_MIN.spoken} and writing only at ${NATURALISATION_MIN.written} — a full CEFR level lower. It catches people out in both directions. Someone with strong written German can be short on the deciding skill; someone who speaks comfortably but writes little may already be closer than they think. This is why we band each skill separately instead of averaging them into one number, which would hide exactly the gap that decides your case.`,
  },
  {
    q: "Do I get to choose which language I'm tested in?",
    a: "No. Your canton does. German, French and Italian are each the procedural language somewhere in Switzerland, and a few cantons — Bern, Fribourg, Valais — are officially bilingual, so it can even come down to your commune. Working in English, or living in an international city, does not change it. Practise the language your canton and commune actually use.",
  },
  {
    q: "Is there a Swiss civics test I need to pass?",
    a: "There is no national one. This is the question we are asked most and the one most often answered wrongly, because almost every comparable country has a single national test. Switzerland does not: cantons and communes handle local knowledge themselves — some with a written test, some with an interview, some with neither — and each sets its own content. So there is no national format and no national pass mark, and anyone quoting you one has invented it. Ask your commune what your procedure actually involves.",
  },
  {
    q: "Is the C permit easier than citizenship?",
    a: `Lower, but not in the way people assume — and the assumption is the dangerous part. ${C_PERMIT_LEVELS.earlier.label} asks for ${C_PERMIT_LEVELS.earlier.spoken} spoken, which is the same speaking level as citizenship. Only ${C_PERMIT_LEVELS.ordinary.label} drops to ${C_PERMIT_LEVELS.ordinary.spoken} spoken. Both ask ${C_PERMIT_LEVELS.ordinary.written} written. If you are on the five-year route and someone told you the permit needs less speaking, they were wrong on the one skill that decides it. ${C_PERMIT_PROVENANCE}`,
  },
  {
    q: "Is passing a language test enough for naturalisation?",
    a: "No — language is one requirement among several, and it is not the one most applications turn on. Naturalisation also depends on your residence, your integration, and your canton's and commune's own conditions. Only the authority deciding your case can tell you which apply to you. This page is about the language side, because that is the part we can honestly help with.",
  },
  {
    q: "How does AlmiSwiss help — and is it official?",
    a: "It is not official. AlmiSwiss is not affiliated with SEM, with any canton, or with a fide test centre, and none of them endorse this site. Our tasks are original practice, not any test centre's question bank, and no score here is a result — only a recognised test centre issues one, and only your canton and commune decide your case. What we do is show you honestly where you stand across the four skills, so you find your gaps before an examiner does.",
  },
];
