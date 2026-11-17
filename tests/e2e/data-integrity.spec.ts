import { test, expect, headerDrawCount, int } from "./helpers";

/**
 * Client-computed analytics must agree with the server-rendered header.
 *
 * Regression for F-01: after pick histories moved to the compact `{ rows }`
 * encoding, the browser-side loader read `mod.draws` (undefined), so these
 * views showed "showing 0 draws" and an all-zero matrix directly beneath a
 * server-rendered "14,803 draws". Every page returned 200 and no error was
 * thrown — only comparing the two numbers catches it.
 *
 * One game per shape: original state, three-draws-a-day, later-added state,
 * 4-digit-only, 3-digit-only.
 */
const GAMES = ["wi-pick3", "ga-pick4", "ny-pick3", "ma-pick4", "co-pick3"];

for (const game of GAMES) {
  test(`pairs: client count matches server count — ${game}`, async ({ page }) => {
    await page.goto(`/${game}/pairs`);
    const server = await headerDrawCount(page);
    const shown = page.getByText(/showing\s+[\d,]+\s+draws/i).first();
    await expect(shown).toBeVisible();
    await expect.poll(async () => int((await shown.innerText()).match(/showing\s+([\d,]+)/i)![1])).toBe(server);
    expect(server).toBeGreaterThan(0);
  });
}

for (const game of ["wi-pick3", "ny-pick4", "md-pick3"]) {
  test(`carryover computes real transitions — ${game}`, async ({ page }) => {
    await page.goto(`/${game}/carryover`);
    const t = page.getByText(/[\d,]+\s+transitions/i).first();
    await expect(t).toBeVisible();
    expect(int((await t.innerText()).match(/([\d,]+)\s+transitions/i)![1])).toBeGreaterThan(0);
  });
}

for (const game of ["nj-pick4", "ny-pick3", "ca-pick4", "powerball"]) {
  test(`check page finishes loading — ${game}`, async ({ page }) => {
    await page.goto(`/${game}/check`);
    // Regression: the old inline loader only knew WI, PA and the ball games,
    // so every other Check page threw and showed its spinner forever.
    await expect(page.getByText(/Loading draws/i)).toHaveCount(0, { timeout: 30_000 });
    await expect(page.locator("main button").first()).toBeVisible();
  });
}

test("lookup page finishes loading — later-added state", async ({ page }) => {
  await page.goto("/co-pick3/lookup");
  await expect(page.getByText(/Loading draws/i)).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: /look up/i })).toBeVisible();
});
