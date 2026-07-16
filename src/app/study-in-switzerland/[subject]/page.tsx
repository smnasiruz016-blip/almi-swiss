import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SUBJECT_BY_SLUG, SUBJECTS, COUNTRIES, UNIVERSITIES, studyPath } from "@/lib/seo/axes";
import { examBySlug } from "@/lib/ch/registry";

export const dynamicParams = false;
export function generateStaticParams() { return SUBJECTS.map((s) => ({ subject: s.slug })); }

type Params = Promise<{ subject: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { subject } = await params;
  const s = SUBJECT_BY_SLUG.get(subject);
  if (!s) return { title: "Not found" };
  return {
    title: { absolute: `Study ${s.name} in Switzerland — the language question | AlmiSwiss` },
    description: `What language you actually need to study ${s.name} in Switzerland — it depends on the university, not the country — and how a Swiss degree is recognised back home, by country of origin.`,
    alternates: { canonical: `/study-in-switzerland/${s.slug}` },
  };
}

export default async function SubjectHub({ params }: { params: Params }) {
  const { subject } = await params;
  const s = SUBJECT_BY_SLUG.get(subject);
  if (!s) notFound();
  const refUni = UNIVERSITIES[0];
  // NOTE what is NOT looked up here: an admission exam. We have none, because fide
  // is not one. The inherited code called examBySlug("tisus") — a slug that no longer
  // exists — so it silently returned undefined and fell back to hardcoded Swedish  hygiene-allow
  // text. A lookup that cannot fail loudly is how a fork keeps its ancestor's copy.
  // Link out to a sample of origin countries (full matrix is crawled via sitemap).
  const sample = COUNTRIES.slice(0, 60);
  return (
    <main className="bg-almi-bg text-almi-text">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-almi-text-muted">
          <Link href="/study-in-switzerland" className="hover:text-almi-coral">Study in Switzerland</Link> / {s.name}
        </nav>
        <h1 className="text-3xl font-semibold text-almi-ink sm:text-4xl">Study {s.name} in Switzerland</h1>
        <p className="mt-3 max-w-2xl text-base text-almi-text">
          Swiss universities teach a great deal of {s.name} in English, especially at master&apos;s
          level. Where a programme is taught in a national language, the requirement is set by that
          university and is typically around C1 — in German at Zurich or Basel, French at Geneva or
          Lausanne, Italian at Lugano. There is no national answer, so check the language requirement
          on each programme page. If you trained abroad, recognition of your qualification is a
          separate decision from admission. Pick your country of origin to see how a Swiss degree is
          recognised back home — and note that we do not prepare you for admission: fide is a permit
          and naturalisation test, not an admission exam.
        </p>
        <div className="mt-6">
          <Link href="/exams" className="text-sm font-semibold text-almi-coral hover:underline">See the Swiss language-test guides →</Link>
        </div>
        <h2 className="mt-10 text-lg font-semibold text-almi-ink">By country of origin</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {sample.map((c) => (
            <li key={c.slug}>
              <Link href={studyPath(s.slug, c.slug, refUni.slug)} className="inline-block rounded-full border border-almi-bg-peach bg-almi-paper px-3 py-1.5 text-sm text-almi-ink hover:border-almi-coral">
                {c.flag} {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
