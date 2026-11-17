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
 * Page errors we deliberately tolerate. Currently none.
 *
 * React #329/#418/#423/#425 were thrown on every load of the edge-rendered
 * pages before the 2026-11-17 deploy and stopped with it (0/18 loads across
 * three timezones, vs 18/18 before). The cause was never isolated — see
 * docs/AUDIT_2026-11.md F-07 — so any recurrence must fail the suite.
 */
export const isTriagedNoise = (_msg: string) => false;
