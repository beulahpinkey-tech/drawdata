import { test, expect, int } from "./helpers";
import { STATE_GAMES } from "../../lib/states";
import { ALL_GAMES } from "../../lib/types";

/* ── State picker ─────────────────────────────────────────────────────────
 * Regression for F-02: the picker routed only WI/PA/NJ/TX/NC. Clicking any of
 * the 9 states added later (all marked "available") opened the waitlist modal
 * — "DrawData doesn't have New York yet" — for a state that was live.        */
const available = STATE_GAMES.filter((s) => s.status === "available");

for (const s of available) {
  test(`picker: ${s.state} opens its game, not the waitlist`, async ({ page }) => {
    const code = s.abbr.toLowerCase();
    const expected = ALL_GAMES.find((g) => g === `${code}-pick3`) ?? ALL_GAMES.find((g) => g === `${code}-pick4`);
    await page.goto("/picker");
    await page.getByRole("button", { name: new RegExp(`^${s.state}\\b`) }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${expected}$`));
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });
}

test("picker: a waitlist state opens the waitlist (not a 404)", async ({ page }) => {
  const s = STATE_GAMES.find((x) => x.status === "waitlist")!;
  await page.goto("/picker");
  await page.getByRole("button", { name: new RegExp(`^${s.state}\\b`) }).first().click();
  await expect(page.locator('[role="dialog"]')).toContainText(s.state);
});

/* ── Homepage lists every state it claims ──────────────────────────────── */
test("homepage game grid includes every available state", async ({ page }) => {
  await page.goto("/");
  const main = page.locator("main");
  for (const s of available) await expect(main).toContainText(s.state);
});

/* ── Card headings name the games, not a sliced-up state name ─────────── */
test("homepage cards show game names with no state fragment", async ({ page }) => {
  await page.goto("/");
  const headings = await page.locator("main h3").allInnerTexts();
  expect(headings.length).toBeGreaterThan(0);

  // Two-game cards read "<game> · <game>". Deriving that by taking the last
  // two words of the full label turned "New York Numbers" into
  // "York Numbers · Win 4" in production — New York is the only state whose
  // name is two words, so the heuristic looked right everywhere else.
  //
  // Compared exactly, not by substring: "York Numbers · Win 4" *contains*
  // "Numbers · Win 4", so a toContain-on-joined-string check passes while
  // the bug is live. That mistake made the first version of this test green
  // against a broken page.
  expect(headings).toContain("Numbers · Win 4");

  // No heading may carry a leftover word from a multi-word state name.
  const FRAGMENTS = ["York", "Carolina", "Jersey", "Hampshire"];
  for (const heading of headings) {
    const words = heading.split(/\s+/);
    const leaked = FRAGMENTS.filter((f) => words.includes(f));
    expect(leaked, `heading "${heading}" carries a state-name fragment`).toEqual([]);
  }
});

/* ── Formula Lab on a state added after the original five ─────────────── */
test("formula lab backtests a later-added state", async ({ page }) => {
  await page.goto("/lab?game=ny-pick3");
  const run = page.getByRole("button", { name: /Backtest now/i }).first();
  await expect(run).toBeEnabled({ timeout: 30_000 });
  await run.click();
  const res = page.getByText(/[\d,]+\s+transitions/i).first();
  await expect(res).toBeVisible({ timeout: 45_000 });
  expect(int((await res.innerText()).match(/([\d,]+)\s+transitions/i)![1])).toBeGreaterThan(1000);
});

/* ── Explore / Patterns offer every digit game ─────────────────────────── */
for (const path of ["/explore", "/patterns"]) {
  test(`${path} offers later-added states`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("button", { name: /New York/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Massachusetts/ }).first()).toBeVisible();
  });
}

/* ── Navigation ────────────────────────────────────────────────────────── */
test("mobile menu reaches every primary page", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only menu");
  await page.goto("/ny-pick3");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.locator("#mobile-menu");
  for (const label of ["Explorer", "Formula Lab", "Patterns", "Machine", "Odds", "Feedback", "About"]) {
    await expect(menu.getByRole("link", { name: label })).toBeVisible();
  }
  await menu.getByRole("link", { name: "Frequency" }).click();
  await expect(page).toHaveURL(/\/ny-pick3\/frequency$/);
  await expect(page.locator("#mobile-menu")).toHaveCount(0); // closes on navigation
});

test("per-game tab bar navigates and back/forward work", async ({ page, isMobile }) => {
  test.skip(isMobile, "tab bar is desktop-only; mobile covered by menu test");
  await page.goto("/ga-pick3");
  await page.getByRole("link", { name: "Gaps", exact: true }).first().click();
  await expect(page).toHaveURL(/\/ga-pick3\/gaps$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/ga-pick3$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/ga-pick3\/gaps$/);
});

test("results archive month → previous month", async ({ page }) => {
  await page.goto("/nc-pick4/results/2018/07");
  await expect(page.locator("main")).toContainText(/July 2018/);
  await page.locator('main a[href="/nc-pick4/results/2018/06"]').first().click();
  await expect(page).toHaveURL(/\/nc-pick4\/results\/2018\/06$/);
  await expect(page.locator("main")).toContainText(/June 2018/);
});

/* ── Feedback form: validation + submit, WITHOUT sending a real message ── */
test("feedback form validates, then submits (endpoint mocked)", async ({ page }) => {
  let sent: any = null;
  await page.route("https://api.web3forms.com/**", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send" }).click();
  expect(sent).toBeNull(); // empty message must not submit
  await page.getByRole("textbox").first().fill("Automated regression test — please ignore.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect.poll(() => sent?.message).toBe("Automated regression test — please ignore.");
});

/* ── First visit: age gate + cookie consent ─────────────────────────────── */
test("age gate and cookie banner appear for a new visitor and remember the choice", async ({ browser }) => {
  const ctx = await browser.newContext(); // no pre-seeded storage
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: /I am 18 or older/i }).click();
  await page.getByRole("button", { name: /Essential only/i }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: /I am 18 or older/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Essential only/i })).toHaveCount(0);
  await ctx.close();
});
