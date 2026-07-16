import type { Metadata } from "next";
import Link from "next/link";
import { TRACKS, examsByTrack } from "@/lib/ch/registry";
import { TestimonialsSection } from "@/components/reviews/TestimonialsSection";

// Re-render hourly so newly approved testimonials appear without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: "AlmiSwiss | fide Practice for Swiss Permits & Naturalisation, with Honest Readiness",
  },
  description:
    "Switzerland asks B1 spoken and A2 written for naturalisation — but that is a federal minimum, and your canton decides. Practise fide in German or French with honest per-skill readiness bands. Not affiliated with SEM.",
  openGraph: {
    title: "AlmiSwiss — honest fide practice for permits and naturalisation",
    description:
      "Original fide practice in German and French, built around real Swiss situations — a readiness estimate shown honestly, not an inflated score.",
  },
};

const PROMISES = [
  {
    title: "Built for what your canton actually asks",
    detail:
      "Naturalisation (fide at the federal minimum — B1 spoken, A2 written), the C permit (lower, but route-dependent: B1 spoken on the five-year route, the same as citizenship), recognised certificates, and canton local knowledge. In German or French — whichever your canton uses, because that is not your choice to make.",
  },
  {
    title: "Honest readiness, not a fake score",
    detail:
      "Reading and Listening are auto-marked to a clear per-skill band. Writing and Speaking get AI feedback labelled an estimate. We band each skill separately rather than averaging them, because the levels are not symmetrical — speaking is asked a full level above writing, and one blended number would hide exactly the gap that decides your case.",
  },
  {
    title: "100% original material",
    detail:
      "Every reading text, audio transcript, writing task and speaking prompt is written from scratch around real situations — the Gemeinde counter, the insurer, the landlord, the parents' evening — never copied from a real test.",
  },
  {
    title: "We tell you what we can't do",
    detail:
      "fide is not a university admission test, so we don't sell it as one. There is no national Swiss civics test, so we don't invent one or show you a pass mark for it. And we can't tell you your canton's own bar — only your commune can.",
  },
] as const;

const PRICING_LINES = [
  "Full access to Writing & Speaking AI-evaluation across every track",
  "Free, unlimited auto-marked Reading, Listening and local-knowledge practice sets",
  "AI analysis modelled on the real task formats and criteria — always an estimate, never an official result",
  "Full timed mock for your chosen test, with per-skill readiness and progress tracking",
  "Flat $12/month with one-click cancellation inside your account",
] as const;

const FAQ = [
  {
    q: "Which tests does AlmiSwiss cover?",
    a: "fide — the Swiss test used as proof of language for settlement permits and naturalisation — across Reading, Listening, Writing and Speaking, in German or French. Plus canton local-knowledge practice. We also point you to the SEM-recognised certificate alternatives (telc/Goethe for German, DELF/TCF for French, CELI for Italian) where your procedure accepts them. You pick your track and language in your account, and your practice and full mock run for it.",
  },
  {
    q: "What language level do I need for Swiss naturalisation?",
    a: "The federal minimum is B1 spoken and A2 written in one national language. Read 'minimum' carefully: for an ordinary naturalisation your canton and commune decide, and some ask for more. If you are married to a Swiss citizen, the facilitated route is decided by SEM instead. Confirm what applies to you with your cantonal migration authority. We help you prepare fairly; we never claim to help anyone shortcut the process.",
  },
  {
    q: "Do I get to choose which language I'm tested in?",
    a: "No — your canton does. German, French and Italian are each the procedural language somewhere in Switzerland, and a few cantons are officially bilingual, so it can even come down to your commune. Working in English does not change it. Practise the language your canton actually uses.",
  },
  {
    q: "Is there a Swiss civics test I need to pass?",
    a: "There is no national one. Cantons and communes handle local knowledge themselves — some with a written test, some an interview, some neither — and each sets its own content. So there is no national pass mark, and anyone quoting you one has invented it. We offer practice on the areas these procedures tend to cover, and we call it practice, not a mock. Ask your commune what yours involves.",
  },
  {
    q: "Can I use fide to get into a Swiss university?",
    a: "No. fide runs A1–B1 and exists for permits and naturalisation — no university accepts it for admission. Degree programmes typically want around C1 in whichever language that university teaches in (Goethe C1/C2, TestDaF, DALF), or English via IELTS or TOEFL. We'd rather tell you that than sell you practice that cannot get you in.",
  },
  {
    q: "Is my AlmiSwiss estimate my real result?",
    a: "No. It's a practice readiness estimate to guide your prep — a per-skill band (Clear or Borderline) against the real criteria. Only a recognised test centre issues a real result, and only your canton and commune decide your case. AlmiSwiss is not affiliated with SEM, with any canton, or with a fide test centre, and none of them endorse this site.",
  },
  {
    q: "Is the practice copied from a real test?",
    a: "No. Every text, audio transcript, writing task, speaking prompt and local-knowledge question is original, written from scratch to mirror the real task types. They are not any test centre's question bank.",
  },
  {
    q: "How much does AlmiSwiss cost?",
    a: "$12 per month with a 7-day free trial, monthly only, cancel anytime. Reading, Listening and local-knowledge practice are free; AI feedback on Writing and Speaking and the full timed mock are part of the subscription.",
  },
] as const;

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

// Illustrative sample — clearly labelled, never a real user, never a real result.
// Illustrative, and chosen to TEACH rather than to flatter: this learner is
// comfortably past the A2 writing bar but short on speaking — which is the level
// that actually decides naturalisation, and the five-year C permit with it. A
// blended average would read as "on track" and hide precisely that. It is the
// commonest real shape, and the reason we never show one number.
const SAMPLE = [
  { skill: "Reading", band: "Clear", pct: 82 },
  { skill: "Listening", band: "Clear", pct: 74 },
  { skill: "Writing", band: "Estimate", pct: 71 },
  { skill: "Speaking", band: "Estimate", pct: 58 },
];

function ReadinessMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="rounded-3xl border border-almi-bg-peach bg-almi-paper p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">Sample readiness · fide German</p>
          <span className="rounded-full bg-almi-bg-peach px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-almi-ink">Sample</span>
        </div>
        <ul className="mt-4 space-y-3">
          {SAMPLE.map((s) => (
            <li key={s.skill}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-almi-ink">{s.skill}</span>
                <span className="font-semibold text-almi-coral-deep">{s.band}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-almi-bg-peach">
                <div className="h-2 rounded-full bg-almi-coral" style={{ width: `${s.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl border border-almi-bg-peach bg-almi-bg px-4 py-3">
          <p className="text-xs text-almi-text-muted">
            A readiness band per skill against the real criteria — never an invented official result.
          </p>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-almi-text-muted">Illustrative example — not a real result.</p>
    </div>
  );
}

const TRACK_ACCENT: Record<string, string> = {
  CITIZENSHIP: "text-almi-coral",
  PROFICIENCY: "text-almi-teal",
  GETTING_STARTED: "text-almi-accent-deep",
  UNIVERSITY: "text-almi-accent-deep",
};

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-almi-bg text-almi-text">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-almi-bg via-almi-bg to-almi-bg-peach px-6 pt-16 pb-20 sm:pt-20">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 z-0 h-96 w-96 rounded-full bg-almi-accent/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 z-0 h-80 w-80 rounded-full bg-almi-coral/10 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-almi-accent-deep">AlmiSwiss · fide practice for permits &amp; naturalisation</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.08] text-almi-ink sm:text-5xl">
              The Swiss language bar, <span className="text-almi-coral">honestly measured.</span>
            </h1>
            <p className="mt-5 text-lg text-almi-text">
              Switzerland asks <strong>B1 spoken</strong> and <strong>A2 written</strong> for naturalisation — a{" "}
              <strong>federal minimum</strong>, not the answer to your case, because your{" "}
              <strong>canton and commune</strong> decide and can ask for more. Original{" "}
              <strong>fide</strong> practice in German or French, banded per skill against the real criteria,
              so you know exactly where you stand.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-almi-coral/30"
              >
                Start your 7-day free trial
              </Link>
              <Link href="/login" className="text-sm font-medium text-almi-coral hover:underline">
                Already have an account? Log in →
              </Link>
            </div>
            <p className="mt-4 text-sm text-almi-text-muted">
              $12/month, 7-day free trial, cancel anytime · Reading &amp; Listening free · Original material, never copied
            </p>
          </div>
          <ReadinessMockup />
        </div>
      </section>

      {/* Honest hook */}
      <section className="border-t border-almi-bg-peach bg-almi-paper px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">An honest estimate, not a fake score</h2>
          <p className="mt-5 text-base text-almi-text">
            <strong>fide</strong> is set and marked by recognised test centres, and your case is decided by your{" "}
            <strong>canton and commune</strong> — or, if you are married to a Swiss citizen, by{" "}
            <strong>SEM</strong>. We are none of those, so anyone promising you a guaranteed official outcome
            from an online simulation is guessing. AlmiSwiss does the honest thing instead: we estimate your
            readiness from your practice and map it into clear bands (Clear or Borderline) against the real
            criteria.
          </p>
          <p className="mt-4 text-base text-almi-text">
            We band <strong className="text-almi-ink">each skill separately, and never average them.</strong> That
            is not a design preference — Switzerland asks a full CEFR level more of your speaking than your
            writing, so a single blended number would read as &ldquo;on track&rdquo; for someone who is short on
            the one skill that actually decides it. The same asymmetry catches people on the five-year C permit,
            which asks B1 spoken too.
          </p>
          <p className="mt-4 text-base text-almi-text">
            One principle runs through it: <strong className="text-almi-ink">tell you the truth</strong> — including
            when the truth is that we are not what you need. fide will not get you into a university, and no
            website can tell you your own canton&apos;s bar. Confirm that with your cantonal migration authority.
            We are not affiliated with SEM, with any canton, or with a fide test centre, and none of them endorse
            this site.
          </p>
        </div>
      </section>

      {/* Citizenship lead */}
      <section className="border-t border-almi-bg-peach bg-almi-bg-peach/40 px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full bg-almi-coral/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-almi-coral-deep">
            B1 spoken / A2 written is a floor, not an answer
          </span>
          <h2 className="mt-4 text-3xl font-semibold text-almi-ink">Switzerland decides this by canton. Almost nobody tells you that.</h2>
          <p className="mt-4 text-base text-almi-text">
            The figure you find everywhere — <strong>B1 spoken, A2 written</strong> — is real, and it comes from{" "}
            <strong>SEM</strong>. It is also a <strong>federal minimum</strong>. For an ordinary naturalisation
            your <strong>canton and commune</strong> decide, and some ask for more; the facilitated route for
            spouses of Swiss citizens is decided by SEM instead. Which of the three national languages applies is
            your canton&apos;s call as well, not yours — and a few cantons are officially bilingual, so it can come
            down to your commune.
          </p>
          <p className="mt-4 text-base text-almi-text">
            Two things follow that catch people out. Your <strong>speaking</strong> is asked a full level above
            your writing — and the <strong>five-year C permit asks B1 spoken too</strong>, so &ldquo;the permit
            needs less&rdquo; is wrong on the deciding skill. And there is{" "}
            <strong>no national civics test</strong> — cantons and communes each decide, so nobody can honestly
            quote you a pass mark for one.{" "}
            <Link href="/swiss-naturalisation-language" className="font-semibold text-almi-coral-deep hover:underline">
              See exactly what is and isn&apos;t published
            </Link>
            , then practise against the real thing. We help you prepare fairly — never to shortcut the process.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
            >
              Practise fide — free trial
            </Link>
          </div>
        </div>
      </section>

      {/* Four goals */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">Start from your goal</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-almi-text-muted">
            Reading, Listening and the society knowledge questions are auto-marked and free to practise.
            Writing and Speaking are graded with honest AI feedback against each exam's real criteria.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRACKS.map((t) => (
              <div
                key={t.track}
                className={`rounded-2xl border bg-almi-paper p-6 ${t.lead ? "border-almi-coral/40 ring-1 ring-almi-coral/20" : "border-almi-bg-peach"}`}
              >
                <p className={`text-xs font-bold uppercase tracking-widest ${TRACK_ACCENT[t.track] ?? "text-almi-accent-deep"}`}>
                  {t.label}{t.lead ? " · Lead" : ""}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-almi-ink">{t.requires}</h3>
                <ul className="mt-4 space-y-2 text-sm text-almi-text">
                  {examsByTrack(t.track).map((e) => (
                    <li key={e.slug} className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-6 min-w-[2.5rem] items-center justify-center rounded-md bg-almi-bg-peach px-1.5 text-[11px] font-bold text-almi-ink">{e.cefr}</span>
                      <span className="font-semibold text-almi-ink">{e.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why honest */}
      <section className="border-t border-almi-bg-peach px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">Honest readiness, exam by exam</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {PROMISES.map((p) => (
              <li key={p.title} className="flex items-start gap-3 rounded-2xl border border-almi-bg-peach bg-almi-paper p-5">
                <span aria-hidden className="mt-0.5 flex-shrink-0 select-none font-bold text-almi-teal">✓</span>
                <p className="text-sm text-almi-text">
                  <span className="font-semibold text-almi-ink">{p.title}</span>
                  {" — "}
                  {p.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-almi-bg-peach bg-almi-paper px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold text-almi-ink">Simple, honest pricing</h2>
          <p className="mt-3 text-xl font-semibold text-almi-ink">$12/month — 7-day free trial, cancel anytime.</p>
          <ul className="mx-auto mt-6 max-w-xl space-y-2 text-left text-sm text-almi-text">
            {PRICING_LINES.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 flex-shrink-0 select-none font-bold text-almi-teal">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-6 max-w-xl text-sm text-almi-text-muted">
            25% of AlmiSwiss proceeds fund the Shamool Foundation&apos;s social mission — free primary-school education and daily hot meals for underprivileged children in Lahore, Pakistan.
          </p>
          <div className="mt-8">
            <Link href="/signup" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep">
              Start your 7-day free trial
            </Link>
          </div>
          <p className="mt-4 text-sm text-almi-text-muted">
            <Link href="/pricing" className="underline hover:text-almi-ink">See full pricing</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold text-almi-ink">Common questions</h2>
          <dl className="mt-10 space-y-6">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl border border-almi-bg-peach bg-almi-bg p-6">
                <dt className="text-lg font-semibold text-almi-ink">{f.q}</dt>
                <dd className="mt-2 text-sm text-almi-text">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <TestimonialsSection />

      {/* Final CTA */}
      <section className="border-t border-almi-bg-peach bg-almi-paper px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-almi-ink">Practise honestly. Walk in ready.</h2>
          <p className="mt-3 text-base text-almi-text">
            Practice at your level in the language your canton uses, honest readiness estimates, 100% original material — for
            $12/month with a 7-day free trial.
          </p>
          <div className="mt-8">
            <Link href="/signup" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep">
              Start your 7-day free trial
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
