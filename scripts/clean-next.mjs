/**
 * Wipe .next before dev/build.
 *
 * Why this exists: this repo lives inside OneDrive, and OneDrive tags
 * synced directories with reparse metadata. Next.js's internal cleaner
 * (lib/recursive-delete.js) calls fs.readlink on anything that lstats
 * as a reparse point and dies with EINVAL on OneDrive's tags — so any
 * `next dev` / `next build` after a previous run wrote .next crashes
 * on startup. (Tracked upstream; OneDrive + Node 22+ on Windows.)
 *
 * Node's own fs.rmSync usually copes; when it doesn't, Windows' rmdir
 * always does. By wiping .next BEFORE Next starts, its fragile cleaner
 * only ever sees an empty/missing dir and never traverses reparse
 * points. Cross-platform: on Linux/CI the rmSync path just works and
 * the cmd fallback never runs.
 *
 * Cost: cold compile on every dev start (a few seconds — the webpack
 * cache under .next/cache is sacrificed). Correctness over speed; a
 * crashed dev server has no speed.
 */
import { rmSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const dir = ".next";

if (existsSync(dir)) {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  } catch (err) {
    if (process.platform === "win32") {
      // cmd's rmdir deletes OneDrive reparse-tagged trees that Node
      // refuses to touch.
      execSync(`rmdir /s /q "${dir}"`, { shell: "cmd.exe", stdio: "ignore" });
    } else {
      throw err;
    }
  }
}

if (existsSync(dir)) {
  console.error("clean-next: .next still present after cleanup — close any running dev server and retry.");
  process.exit(1);
} else {
  console.log("clean-next: .next cleared.");
}
