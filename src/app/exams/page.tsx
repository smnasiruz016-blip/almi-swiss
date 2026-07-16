import type { Metadata } from "next";
import Link from "next/link";
import {
  LANGUAGE_EXAMS,
  KNOWLEDGE_EXAMS,
  LANGUAGE_TEST_HEDGE,
  SOCIETY_FORMAT_HEDGE,
  ALL_EXAMS,
  type ExamMeta,
} from "@/lib/ch/registry";

// Exam names come from the registry so this page can never drift from the tree.
const EXAM_NAMES = ALL_EXAMS.map((e) => e.name).join(", ");

export const metadata: Metadata = {
  title: {
    absolute:
      "Swedish exams — SFI, Swedish B1–B2, Tisus & Medborgarskapsprovet | AlmiSwiss",
  },
  description: `The Swedish exams for citizenship, university, getting started and building proficiency — ${EXAM_NAMES}. Honest per-skill readiness practice, never an official result.`,
  alternates: { canonical: "/exams" },
};

function ExamList({ exams }: { exams: ExamMeta[] }) {
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {exams.map((e) => (
        <li key={e.slug}>
          <Link
            href={`/exams/${e.slug}`}
            className="flex h-full flex-col rounded-2xl border border-almi-bg-peach bg-almi-paper p-5 hover:border-almi-coral"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 min-w-[2.5rem] items-center justify-center rounded-md bg-almi-bg-peach px-1.5 text-xs font-bold text-almi-ink">{e.cefr}</span>
              <span className="text-lg font-semibold text-almi-ink">{e.name}</span>
              {e.lead && <span className="rounded-full bg-almi-coral/15 px-2 py-0.5 text-xs font-semibold text-almi-coral-deep">Citizenship</span>}
            </div>
            <span className="mt-2 text-sm text-almi-text-muted">{e.blurb}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SwissTestsHub() {
  return (
    <main className="bg-almi-bg text-almi-text">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-almi-ink sm:text-4xl">
          Swedish exams — citizenship, university, study &amp; getting started
        </h1>
        <p className="mt-3 max-w-2xl text-base text-almi-text">
          The Swedish ladder — SFI Courses A–B and C–D, general Swedish B1–B2 and Tisus — plus
          Medborgarskapsprovet, the society knowledge test that applicants for Swedish citizenship
          aged 16–66 must take. Each language exam assesses Läsförståelse, Hörförståelse, Skriftlig
          framställning and Muntlig framställning. Pick one for an honest readiness estimate — never a
          fabricated official result.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-almi-ink">The Swedish language ladder</h2>
          <p className="mt-1 text-sm text-almi-text-muted">
            The core Swedish-language exams. SFI Courses A–B (≈A1–A2) are the first steps in Svenska
            för invandrare; SFI Courses C–D (≈A2–B1+) are the exit courses Skolverket places at
            roughly B1/B1+; Swedish B1–B2 takes you to a comfortable working level; and Tisus (≈C1),
            run by Stockholms universitet, is the established route into Swedish-taught degree
            programmes. The SFI scale is not CEFR, so the levels above are approximate.
          </p>
          <ExamList exams={LANGUAGE_EXAMS} />
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-almi-ink">Swedish society knowledge test</h2>
          <p className="mt-1 text-sm text-almi-text-muted">
            Medborgarskapsprovet is a multiple-choice test of knowledge about Swedish society
            (Samhällskunskap) — not language proficiency. UHR (Universitets- och högskolerådet)
            develops, administers and marks it; Migrationsverket assesses citizenship applications.
            The first sitting, on 15 August 2026, is a pilot (utprövningsprov) and free of charge —
            not a general launch. {SOCIETY_FORMAT_HEDGE} Our questions are original practice, not the
            official question bank, and AlmiSwiss is not affiliated with UHR.
          </p>
          <ExamList exams={KNOWLEDGE_EXAMS} />
          <p className="mt-4 text-sm text-almi-text-muted">{LANGUAGE_TEST_HEDGE}</p>
        </section>
      </div>
    </main>
  );
}
