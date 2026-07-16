import type { Metadata } from "next";
import Link from "next/link";
import { ROLES } from "@/lib/seo/axes";

export const metadata: Metadata = {
  title: { absolute: "Work in Switzerland — the language you'll need, by role | AlmiSwiss" },
  description:
    "Working in Switzerland: how much language each role needs, and which language — that is your canton's call, not your employer's. Confirm specifics with employers and the cantonal authority.",
  alternates: { canonical: "/work-in-switzerland" },
};

export default function WorkHub() {
  // Group roles by industry for a crawlable, organised hub.
  const byIndustry = new Map<string, typeof ROLES>();
  for (const r of ROLES) {
    const arr = byIndustry.get(r.industry) ?? [];
    arr.push(r);
    byIndustry.set(r.industry, arr);
  }
  const industries = [...byIndustry.keys()].sort();
  return (
    <main className="bg-almi-bg text-almi-text">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-almi-ink sm:text-4xl">Work in Switzerland</h1>
        <p className="mt-3 max-w-2xl text-base text-almi-text">
          Two things decide how much language you need, and only one of them is your job. The
          role matters — client-facing and regulated work expects more, while some technical
          roles run in English. But WHICH language is decided by your canton, not your
          employer: German in Zurich and Basel, French in Geneva and Lausanne, Italian in
          Ticino. Pick a role and a city to see both.
        </p>
        {industries.map((ind) => (
          <section key={ind} className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-almi-text-muted">{ind}</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {byIndustry.get(ind)!.map((r) => (
                <li key={r.slug}>
                  <Link href={`/work-in-switzerland/${r.slug}`} className="inline-block rounded-full border border-almi-bg-peach bg-almi-paper px-3 py-1.5 text-sm text-almi-ink hover:border-almi-coral">
                    {r.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
