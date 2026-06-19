/**
 * track() — fire a privacy-first custom event (Plausible).
 *
 * No-op unless analytics is configured (NEXT_PUBLIC_PLAUSIBLE_DOMAIN set)
 * AND the Plausible script has loaded. Plausible is cookieless and stores
 * no personal data — only aggregate counts — so these events tell you
 * "Odds was viewed for Powerball 40 times today," never who did it.
 *
 * Pageviews (every route, including Explorer's filter-encoded URLs) are
 * tracked automatically by the script. Use track() for the in-page
 * choices that DON'T change the URL — the game a visitor picks inside the
 * Odds / Patterns / Draw Machine tools.
 */

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number> }) => void;
  }
}

export function track(event: string, props?: Record<string, string | number>): void {
  if (typeof window === "undefined") return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    /* analytics not loaded — harmless */
  }
}
