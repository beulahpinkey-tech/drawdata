import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end regression suite for draw-data.com.
 *
 *   npm run test:e2e                         # against production
 *   BASE_URL=http://localhost:3000 npm run test:e2e   # against a dev server
 *
 * Deliberately low-impact against production: 2 workers, read-only journeys.
 * The one form that would send a real message (feedback / waitlist) has its
 * submission endpoint intercepted, so no email is ever sent from a test run.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: 1,
  workers: 2,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "https://draw-data.com",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
