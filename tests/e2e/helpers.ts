import { test as base, expect, type Page } from "@playwright/test";

/**
 * Every test starts as a returning visitor: age gate confirmed and cookie
 * choice made, so overlays don't mask the page under test. The gate and the
 * banner themselves are covered by their own journey in journeys.spec.ts.
 */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await use(errors);
  },
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem("drawdata_age_confirmed_v1", "yes");
        localStorage.setItem("drawdata_cookie_consent_v1", "essential-only");
      } catch {}
    });
    await use(context);
  },
});
export { expect };

/** Parse a "14,803"-style integer. */
export const int = (s: string) => parseInt(s.replace(/[^\d]/g, ""), 10);

/** Draw count rendered on the server in the game header ("14,803 draws"). */
export async function headerDrawCount(page: Page): Promise<number> {
  const t = await page.locator("main").innerText();
  const m = t.match(/([\d,]+)\s*draws/i);
  if (!m) throw new Error("no server-rendered draw count in header");
  return int(m[1]);
}

/**
 * Known framework noise we have triaged and deliberately do not fail on:
 * React #329 ("Unknown root exit status") and the hydration trio on the lookup
 * route are tracked in docs/AUDIT_2026-11.md (F-07/F-08) — content renders.
 * Anything else thrown in the page is a real failure.
 */
export const isTriagedNoise = (msg: string) => /Minified React error #(329|418|423|425)/.test(msg);
