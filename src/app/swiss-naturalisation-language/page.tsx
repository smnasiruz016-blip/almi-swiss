import type { Metadata } from "next";
import Link from "next/link";
import {
  NATURALISATION_MIN,
  C_PERMIT_LEVELS,
  C_PERMIT_PROVENANCE,
  C_PERMIT_SCOPE,
} from "@/lib/ch/registry";
import { KNOWN, UNKNOWN, FAQ } from "./facts";

// Honest requirements explainer for the language side of Swiss naturalisation.
//
// This page's whole job is to be the one place that does not flatten. The single
// most common error written about Switzerland — on other sites and in the ancestor
// this file was forked from — is stating ONE national answer for a country that
// decides this at canton and commune level. B1 spoken / A2 written is real, and it
// is a FEDERAL MINIMUM, not "the requirement". Everything here is arranged around
// keeping that distinction visible rather than burying it in a footnote.
//
// Framed as honest preparation, never as beating or getting around SEM or a canton.
//
// Cost rule: cache indefinitely; the facts only change on redeploy.
export const revalidate = false;

const PATH = "/swiss-naturalisation-language";

export const metadata: Metadata = {
  title: { absolute: "Swiss Naturalisation Language Levels: B1 Spoken, A2 Written — and Why That Isn't the Whole Answer" },
  description:
    "Switzerland's federal minimum for naturalisation is B1 spoken and A2 written in one national language. But your canton and commune decide an ordinary naturalisation and can ask for more — and there is no national civics test. An honest guide.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Swiss naturalisation and language — an honest guide to what is actually required",
    description:
      "The federal minimum, why your canton can ask for more, why there is no national civics test, and what nobody can tell you. Confirm your own case with your cantonal migration authority.",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-2xl border border-almi-bg-peach bg-almi-paper p-5 sm:grid-cols-[11rem_1fr]">
      <div className="text-sm font-semibold text-almi-ink">{k}</div>
      <div className="text-sm text-almi-text sm:col-span-1 col-span-2">{v}</div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="bg-almi-bg text-almi-text">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="mx-auto max-w-3xl px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-almi-text-muted">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link href="/" className="hover:text-almi-coral">Home</Link></li>
            <li className="flex items-center gap-1"><span aria-hidden>/</span><Link href="/exams" className="hover:text-almi-coral">Swiss language tests</Link></li>
            <li className="flex items-center gap-1"><span aria-hidden>/</span><span>Naturalisation language</span></li>
          </ol>
        </nav>

        <header>
          <p className="text-sm font-bold uppercase tracking-widest text-almi-accent-deep">Requirements · Switzerland</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-almi-ink sm:text-4xl">
            Swiss naturalisation and language: the federal minimum, and why it isn&apos;t your answer.
          </h1>
          <p className="mt-3 text-base text-almi-text">
            Switzerland asks for <strong>{NATURALISATION_MIN.spoken} spoken</strong> and{" "}
            <strong>{NATURALISATION_MIN.written} written</strong> in one national language. That figure is real, it comes
            from <strong>SEM</strong>, and on its own it will mislead you — because it is a{" "}
            <strong>federal minimum</strong>, and for an ordinary naturalisation it is your{" "}
            <strong>canton and commune</strong> who decide, not the Confederation.
          </p>
          <p className="mt-3 text-base text-almi-text">
            Most of what is written about this online flattens a canton-by-canton reality into one national number. This
            page does the opposite: it separates what is actually published from what only your commune can tell you.
          </p>
        </header>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-almi-ink">What is actually published</h2>
          <div className="mt-4 space-y-3">
            {KNOWN.map((f) => <Fact key={f.k} {...f} />)}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-almi-ink">What no website can tell you — and what we refuse to invent</h2>
          <div className="mt-4 space-y-3">
            {UNKNOWN.map((f) => <Fact key={f.k} {...f} />)}
          </div>
          <p className="mt-4 text-xs text-almi-text-muted">
            This is general information about the requirement, not advice about your naturalisation application.
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-almi-bg-peach bg-almi-paper p-6">
          <h2 className="text-xl font-semibold text-almi-ink">There is no national civics test</h2>
          <p className="mt-3 text-base text-almi-text">
            Nearly every country that asks this of applicants has a single national test with a published format and a
            pass mark. <strong>Switzerland does not.</strong> Local knowledge is handled by cantons and communes: some use
            a written test, some an interview, some neither — and each decides its own content. So there is{" "}
            <strong>no national format and no national pass mark</strong>, and any site that quotes you one has invented
            it.
          </p>
          <p className="mt-3 text-base text-almi-text">
            We offer <Link href="/exams/canton-civic-german" className="font-semibold text-almi-coral-deep hover:underline">local-knowledge practice</Link>{" "}
            on the areas these procedures tend to cover — how the political system works, rights and obligations,
            geography, everyday rules. It is <em>preparation, not a mock</em>, because there is no national exam to mock.
            Ask your commune what your procedure actually involves.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-almi-ink">Speaking is the level that decides it</h2>
          <p className="mt-3 text-base text-almi-text">
            The requirement is <strong>not symmetrical</strong>: {NATURALISATION_MIN.spoken} spoken but only{" "}
            {NATURALISATION_MIN.written} written — a full CEFR level apart. And the{" "}
            <strong>{C_PERMIT_LEVELS.earlier.label.toLowerCase()}</strong> of the settlement permit asks{" "}
            <strong>{C_PERMIT_LEVELS.earlier.spoken} spoken too</strong> — the same as citizenship. The idea that
            &ldquo;the C permit needs less&rdquo; is true only on the ordinary route, where speaking drops to{" "}
            {C_PERMIT_LEVELS.ordinary.spoken}. On the early route it is exactly as demanding on the skill that
            matters most.
          </p>
          <p className="mt-3 text-xs text-almi-text-muted">
            {C_PERMIT_PROVENANCE} {C_PERMIT_SCOPE}
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-almi-ink">The language is only one part</h2>
          <p className="mt-3 text-base text-almi-text">
            Meeting the language level addresses <strong>one</strong> requirement. Naturalisation also depends on your
            residence, your integration, and conditions your canton and commune set themselves — and it is they who
            decide an ordinary naturalisation, while <strong>SEM</strong> decides the facilitated route for spouses of
            Swiss citizens. Those are different bodies applying different rules. Check your own situation with your
            cantonal migration authority rather than assuming that what applied to someone in another canton applies to
            you.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-almi-ink">How to prepare — honestly</h2>
          <p className="mt-3 text-base text-almi-text">
            Start by asking your commune what your procedure actually involves — that is free, it takes one email, and it
            is the only way to learn your real bar. Then practise against it. AlmiSwiss gives you original tasks built
            around the situations you will actually be in — the Gemeinde counter, the insurer, the landlord, the parents&apos;
            evening — auto-marked so you can see where you stand. Because the levels are asymmetrical, we{" "}
            <strong>band each skill separately</strong> rather than averaging them into a single number that would hide
            the gap that decides your case.
          </p>
          <p className="mt-3 text-base text-almi-text">
            We help you prepare fairly. We don&apos;t claim to shortcut the process, and we couldn&apos;t if we wanted to.
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-almi-bg-peach bg-almi-paper p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-almi-ink">Practise the language you&apos;ll actually be judged on.</p>
          <Link
            href="/practice/fide-german"
            className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
          >
            Try the free practice tasks
          </Link>
          <p className="mt-3 text-xs text-almi-text-muted">Reading and Listening practice is free · no card needed</p>
        </section>

        <section className="mt-10 rounded-2xl border border-almi-accent/40 bg-almi-accent/10 p-5">
          <p className="text-sm text-almi-ink">
            <strong>AlmiSwiss is not affiliated with SEM, with any canton, or with a fide test centre, and none of them
            endorse this site.</strong> Our tasks are original practice, not any test centre&apos;s question bank, and no
            score here is a result. Only a recognised test centre issues a real result, and only your canton and commune
            decide your case — confirm your own requirement with your cantonal migration authority.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-almi-ink">Questions</h2>
          <dl className="mt-4 space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5">
                <dt className="font-semibold text-almi-ink">{f.q}</dt>
                <dd className="mt-1 text-sm text-almi-text">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-almi-ink">Related</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            <li><Link href="/exams/fide-german" className="inline-block rounded-full border border-almi-bg-peach bg-almi-paper px-3 py-1.5 text-sm text-almi-ink hover:border-almi-coral">fide German guide</Link></li>
            <li><Link href="/exams/fide-french" className="inline-block rounded-full border border-almi-bg-peach bg-almi-paper px-3 py-1.5 text-sm text-almi-ink hover:border-almi-coral">fide French guide</Link></li>
            <li><Link href="/exams/canton-civic-german" className="inline-block rounded-full border border-almi-bg-peach bg-almi-paper px-3 py-1.5 text-sm text-almi-ink hover:border-almi-coral">Local knowledge — not a national test</Link></li>
            <li><Link href="/exams" className="inline-block rounded-full border border-almi-bg-peach bg-almi-paper px-3 py-1.5 text-sm text-almi-ink hover:border-almi-coral">All Swiss language tests</Link></li>
          </ul>
        </section>
      </div>
    </main>
  );
}
