import { test, expect, isTriagedNoise } from "./helpers";

/* ── One URL per route template: renders, no uncaught errors, no overflow ── */
const ROUTES = [
  "/", "/picker", "/explore", "/combinations", "/draw-machine", "/odds", "/lab", "/patterns",
  "/learn", "/learn/are-lottery-numbers-random", "/about", "/contact", "/privacy", "/terms",
  "/wi-pick3", "/powerball", "/ny-pick3/frequency", "/co-pick3/positional", "/ga-pick3/gaps",
  "/md-pick4/coverage", "/tx-pick4/check", "/pa-pick3/pairs", "/nj-pick4/lookup",
  "/mi-pick3/carryover", "/ga-pick3/streams", "/wa-pick3/streams", "/ma-pick4/results",
  "/ny-pick3/results/1980", "/nc-pick4/results/2018/07", "/wi-pick3/number/7",
  "/powerball/number/special-26", "/lab?game=ny-pick4",
];

for (const path of ROUTES) {
  test(`renders ${path}`, async ({ page, errors }) => {
    const resp = await page.goto(path);
    expect(resp?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "horizontal page overflow (px)").toBeLessThanOrEqual(1);
    // On a phone, content wider than the screen doesn't scroll — it widens the
    // layout viewport and the browser zooms the whole page out. scrollWidth
    // can't see that (innerWidth grows with it), so compare to the device.
    expect(await page.evaluate(() => window.innerWidth), "layout viewport wider than device").toBe(page.viewportSize()!.width);
    expect(errors.filter((e) => !isTriagedNoise(e))).toEqual([]);
  });
}

test("unknown routes and impossible slugs 404", async ({ request }) => {
  for (const p of ["/this-page-does-not-exist", "/oh-pick3", "/ma-pick3", "/wi-pick3/number/99", "/learn/not-a-real-slug"]) {
    expect((await request.get(p)).status(), p).toBe(404);
  }
});

/* ── Security configuration drift ──────────────────────────────────────── */
// "/" is a static page (headers via public/_headers); the others are
// edge-rendered Functions, which _headers never reaches — middleware must.
for (const path of ["/", "/wi-pick3", "/ny-pick4/pairs", "/powerball/number/7"]) test(`security headers are served — ${path}`, async ({ request }) => {
  const h = (await request.get(path)).headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).not.toContain("unsafe-eval");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBeTruthy();
  expect(h["permissions-policy"]).toContain("camera=()");
  expect(h["cross-origin-opener-policy"]).toBe("same-origin");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("redirects never leave the site", async ({ request }) => {
  for (const p of ["/pick3?next=https://evil.example", "/wi-pick3/sums?redirect=//evil.example", "//evil.example/"]) {
    const r = await request.get(p, { maxRedirects: 0 });
    const loc = r.headers()["location"] ?? "";
    expect(loc === "" || /^(\/(?!\/)|https:\/\/draw-data\.com)/.test(loc), `${p} -> ${loc}`).toBeTruthy();
  }
});

test("no source, config or build artefacts are exposed", async ({ request }) => {
  for (const p of ["/.env", "/.git/config", "/package.json", "/lib/data/meta.json", "/_worker.js", "/nop-build-log.json"]) {
    expect((await request.get(p)).status(), p).toBe(404);
  }
});
