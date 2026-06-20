// Breadcrumb helpers — shared by every programmatic page so the visible
// trail and the BreadcrumbList JSON-LD are always built from the SAME
// source of truth (no drift between what the user sees and what Google
// parses). Google requires the markup to match the on-page breadcrumb,
// so both come from one `Crumb[]`.

export const BASE = "https://draw-data.com";

export type Crumb = {
  /** Visible label, e.g. "Pennsylvania Pick 3". */
  name: string;
  /** Absolute path beginning with "/", or undefined for the current page (last crumb). */
  path?: string;
};

/**
 * BreadcrumbList JSON-LD. The final crumb (the current page) is included
 * per Google's spec; it may carry an `item` (absolute URL) or omit it.
 */
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: `${BASE}${c.path}` } : {}),
    })),
  };
}
