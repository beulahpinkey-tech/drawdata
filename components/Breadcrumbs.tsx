import Link from "next/link";
import type { Crumb } from "@/lib/seo/breadcrumbs";
import { breadcrumbJsonLd } from "@/lib/seo/breadcrumbs";

/**
 * Visible breadcrumb trail + matching BreadcrumbList JSON-LD. Renders
 * from a single `Crumb[]` so the markup Google reads always matches what
 * the visitor sees (a requirement for the rich result). The last crumb
 * is the current page — shown as plain text, not a link.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[12px] font-mono text-dim">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(crumbs)),
        }}
      />
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-x-1.5">
              {c.path && !last ? (
                <Link href={c.path} className="hover:text-text transition-colors">
                  {c.name}
                </Link>
              ) : (
                <span className={last ? "text-text" : undefined} aria-current={last ? "page" : undefined}>
                  {c.name}
                </span>
              )}
              {!last && <span className="text-dim/50">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
