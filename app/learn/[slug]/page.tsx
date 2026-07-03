export const runtime = "edge";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { learnPage, learnPages, learnSlugs } from "@/lib/learn";
import { dataModified } from "@/lib/seo/dataset";
import { BASE } from "@/lib/seo/breadcrumbs";
import type { Crumb } from "@/lib/seo/breadcrumbs";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await learnSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await learnPage(params.slug);
  if (!p) return {};
  const url = `${BASE}/learn/${p.slug}`;
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: url },
    openGraph: { type: "article", title: `${p.title} — DrawData`, description: p.description, url },
    twitter: { card: "summary_large_image", title: p.title, description: p.description },
  };
}

export default async function LearnPage({ params }: { params: { slug: string } }) {
  const p = await learnPage(params.slug);
  if (!p) notFound();

  const url = `${BASE}/learn/${p.slug}`;
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Learn", path: "/learn" },
    { name: p.h1 },
  ];

  // FAQPage — the answers Google can surface as a rich result.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: p.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  // Article — establishes authorship/freshness for the explainer body.
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.h1,
    description: p.description,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "DrawData", url: BASE },
    publisher: { "@id": `${BASE}/#org` },
    dateModified: dataModified(),
    isAccessibleForFree: true,
  };

  const allPages = await learnPages();
  const related = (p.related ?? [])
    .map((s) => allPages.find((x) => x.slug === s))
    .filter(Boolean) as typeof allPages;

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <Breadcrumbs crumbs={crumbs} />

      <header>
        <h1 className="t-h1">{p.h1}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-text">{p.intro}</p>
      </header>

      <div className="space-y-4 text-[15px] leading-relaxed text-dim">
        {p.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className="panel p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">See the data</div>
        <Link href={p.backing.href} className="mt-1 inline-flex items-center gap-2 text-accent hover:underline text-[15px]">
          {p.backing.label} <span aria-hidden>→</span>
        </Link>
      </div>

      <section className="panel p-6">
        <h2 className="font-display text-[20px]">Frequently asked</h2>
        <dl className="mt-4 space-y-4">
          {p.faqs.map((f, i) => (
            <div key={i}>
              <dt className="text-[15px] font-medium text-text">{f.q}</dt>
              <dd className="mt-1 text-[14px] text-dim leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {related.length > 0 && (
        <nav aria-label="Related" className="text-[13px]">
          <span className="text-dim">Related: </span>
          {related.map((r, i) => (
            <span key={r.slug}>
              {i > 0 && <span className="text-dim"> · </span>}
              <Link href={`/learn/${r.slug}`} className="text-accent hover:underline">{r.h1}</Link>
            </span>
          ))}
        </nav>
      )}
    </article>
  );
}
