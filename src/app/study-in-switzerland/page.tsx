import type { Metadata } from "next";
import Link from "next/link";
import { SUBJECTS } from "@/lib/seo/axes";

export const metadata: Metadata = {
  title: { absolute: "Study in Switzerland — the language question, by subject | AlmiSwiss" },
  description:
    "There is no single Swiss language requirement for study — Zurich teaches in German, Geneva in French, Lugano in Italian, and many master's programmes in English. Explore what applies by subject and country of origin.",
  alternates: { canonical: "/study-in-switzerland" },
};

export default function StudyHub() {
  return (
    <main className="bg-almi-bg text-almi-text">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-almi-ink sm:text-4xl">Study in Switzerland</h1>
        <p className="mt-3 max-w-2xl text-base text-almi-text">
          There is no single Swiss language requirement for study, because there is no single
          language of instruction. Zurich teaches in German, Geneva in French, Lugano in
          Italian, and many master&apos;s programmes in English — each university sets its own
          bar, typically around C1 in the language it teaches in. Choose a field to see what
          applies and how a Swiss degree is recognised back home. To be direct: we do not
          prepare you for admission — fide is a permit and naturalisation test, not an
          admission exam. What we do prepare you for is the language you need to stay.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {SUBJECTS.map((s) => (
            <li key={s.slug}>
              <Link href={`/study-in-switzerland/${s.slug}`} className="block rounded-2xl border border-almi-bg-peach bg-almi-paper p-4 text-almi-ink hover:border-almi-coral">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
