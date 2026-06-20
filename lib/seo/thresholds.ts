// Anti-thin-content guard. A programmatic page may only ship if the
// slice behind it carries real, page-specific data. These helpers are
// the single chokepoint every template calls before rendering — and the
// same predicate generateStaticParams() uses to decide which URLs even
// exist, so we never prerender an empty shell.

/** Minimum draws a sliced archive page needs to stand on its own. */
export const MIN_ARCHIVE_DRAWS = 1;

/** True when a slice has enough data to justify its own indexable page. */
export function hasEnoughData(drawCount: number, min = MIN_ARCHIVE_DRAWS): boolean {
  return drawCount >= min;
}
