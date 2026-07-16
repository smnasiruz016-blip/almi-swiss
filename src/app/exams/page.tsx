import type { Metadata } from "next";
import Link from "next/link";
import {
  LANGUAGE_EXAMS,
  CIVIC_MODULES,
  CIVIC_HEDGE,
  LANGUAGE_CHOICE_HEDGE,
  NATURALISATION_MIN,
  ALL_EXAMS,
  type ExamMeta,
} from "@/lib/ch/registry";
import { LANGUAGE_LABEL, SHIPPING_LANGUAGES } from "@/lib/ch/types";

// Exam names come from the registry so this page can never drift from the tree.
const EXAM_NAMES = ALL_EXAMS.map((e) => e.name).join(", ");
const LANGS = SHIPPING_LANGUAGES.map((l) => LANGUAGE_LABEL[l]).join(" and ");

export const metadata: Metadata = {
  title: {
    absolute: "Swiss language tests — fide, telc/Goethe, DELF/TCF & local knowledge | AlmiSwiss",
  },
  description: `The language tests behind Swiss permits and naturalisation — ${EXAM_NAMES}. The federal minimum is ${NATURALISATION_MIN.spoken} spoken and ${NATURALISATION_MIN.written} written, but your canton decides. Honest per-skill readiness practice, never an official result.`,
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 min-w-[2.5rem] items-center justify-center rounded-md bg-almi-bg-peach px-1.5 text-xs font-bold text-almi-ink">{e.cefr}</span>
              <span className="text-lg font-semibold text-almi-ink">{e.name}</span>
              {/* The language is not decoration on the card — it is what makes the entry
                  a different test. Two cards can both read "fide" and mean different
                  things, so this badge is never optional. */}
              <span className="rounded-full bg-almi-bg-peach px-2 py-0.5 text-xs font-semibold text-almi-ink">{LANGUAGE_LABEL[e.language]}</span>
              {e.lead && <span className="rounded-full bg-almi-coral/15 px-2 py-0.5 text-xs font-semibold text-almi-coral-deep">Citizenship</span>}
              {e.civic && <span className="rounded-full bg-almi-accent/20 px-2 py-0.5 text-xs font-semibold text-almi-ink">Not a test</span>}
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
          Swiss language tests — permits, naturalisation &amp; recognised certificates
        </h1>
        <p className="mt-3 max-w-2xl text-base text-almi-text">
          fide is the Swiss test: a pass issues the <strong>fide language passport</strong>, which is what permit
          and naturalisation procedures ask to see. SEM also recognises certificate alternatives — telc and Goethe
          for German, DELF and TCF for French, CELI for Italian. Each assesses Reading, Listening, Writing and
          Speaking. Pick one for an honest readiness estimate — never a fabricated official result.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-almi-text-muted">{LANGUAGE_CHOICE_HEDGE}</p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-almi-ink">The language tests</h2>
          <p className="mt-1 text-sm text-almi-text-muted">
            The federal minimum for naturalisation is <strong>{NATURALISATION_MIN.spoken} spoken</strong> and{" "}
            <strong>{NATURALISATION_MIN.written} written</strong> in one national language — a floor set by the
            Confederation, not the answer to your case: for an ordinary naturalisation your canton and commune
            decide, and some ask for more. The settlement permit asks less, but route-dependently — the five-year
            route still wants B1 spoken. We currently ship {LANGS}; Italian follows once its content meets the same
            bar, and we would rather list it late than list it empty.
          </p>
          <ExamList exams={LANGUAGE_EXAMS} />
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-almi-ink">Canton local knowledge — not a national test</h2>
          <p className="mt-1 text-sm text-almi-text-muted">{CIVIC_HEDGE}</p>
          <ExamList exams={CIVIC_MODULES} />
          <p className="mt-4 text-sm text-almi-text-muted">
            One more thing we are not: <strong>fide is not a university admission test</strong>. It runs A1–B1 and
            no university accepts it for admission — degree programmes typically want around C1 in whichever
            language that university teaches in, or English via IELTS or TOEFL. If that is what you need, you need a
            different exam than anything on this page.
          </p>
        </section>
      </div>
    </main>
  );
}
