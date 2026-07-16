import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROLE_BY_SLUG, ROLES, COUNTRIES, HUBS, jobsPath } from "@/lib/seo/axes";
import { examBySlug } from "@/lib/ch/registry";

export const dynamicParams = false;
export function generateStaticParams() { return ROLES.map((r) => ({ role: r.slug })); }

type Params = Promise<{ role: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { role } = await params;
  const r = ROLE_BY_SLUG.get(role);
  if (!r) return { title: "Not found" };
  return {
    title: { absolute: `Work in Switzerland as a ${r.name} — the language you'll need | AlmiSwiss` },
    description: `How much language a ${r.name} needs in Switzerland, and which language — that is decided by your canton, not your employer. By country of origin and city.`,
    alternates: { canonical: `/work-in-switzerland/${r.slug}` },
  };
}

export default async function RoleHub({ params }: { params: Params }) {
  const { role } = await params;
  const r = ROLE_BY_SLUG.get(role);
  if (!r) notFound();
  const sample = COUNTRIES.slice(0, 60);
  // Hub names come from the axis data so the city list can never drift.
  const hubNames = HUBS.map((h) => h.name).join(", ");
  // The lead test — read from the registry, not hardcoded. The inherited code looked
  // up "svenska-b1b2", a slug that no longer exists, so `working` was always
  // undefined and the CTA below silently never rendered. Nothing failed; the button
  // just quietly disappeared.
  const working = examBySlug("fide-german");
  return (
    <main className="bg-almi-bg text-almi-text">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-almi-text-muted">
          <Link href="/work-in-switzerland" className="hover:text-almi-coral">Work in Switzerland</Link> / {r.name}
        </nav>
        <h1 className="text-3xl font-semibold text-almi-ink sm:text-4xl">Work in Switzerland as a {r.name}</h1>
        <p className="mt-3 max-w-2xl text-base text-almi-text">
          How much language a {r.name} needs depends on the setting. WHICH language depends on the
          canton — German in Zurich and Basel, French in Geneva and Lausanne — and that is not your
          employer&apos;s call or yours. Pick where you&apos;re coming from and the city you&apos;re
          targeting — {hubNames} — to see both.
        </p>
        {working && (
          <div className="mt-6">
            <Link href={`/exams/${working.slug}`} className="text-sm font-semibold text-almi-coral hover:underline">
              {working.name} ({working.cefr}) — the level most workplaces expect →
            </Link>
          </div>
        )}
        <h2 className="mt-10 text-lg font-semibold text-almi-ink">By country of origin</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {sample.map((c) => (
            <li key={c.slug}>
              <Link href={jobsPath(r.slug, c.slug, HUBS[0].slug)} className="inline-block rounded-full border border-almi-bg-peach bg-almi-paper px-3 py-1.5 text-sm text-almi-ink hover:border-almi-coral">
                {c.flag} {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
