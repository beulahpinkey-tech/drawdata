import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_HOST = "draw-data.com";

/**
 * Edge middleware that consolidates traffic onto a single canonical
 * hostname. Anything that lands on the Cloudflare Pages preview URL
 * (drawdata.pages.dev) or the www subdomain or http:// gets 301'd
 * to https://draw-data.com.
 *
 * Why this is necessary:
 *   Google indexes whichever URL it sees content at. Without this,
 *   the same page lives at three URLs (pages.dev, www, apex) and
 *   ranking signal splits three ways. The 301 tells search engines
 *   "this is the canonical address — consolidate all signal here."
 *
 * Why this is in middleware.ts (Next.js edge) and not _redirects:
 *   Cloudflare Pages' _redirects file matches on PATH only, not on
 *   request HOST. So it can't say "if host is X redirect to Y". An
 *   edge middleware can — it sees the full request including the
 *   Host header — and produces the same standard 301 response.
 *
 * Performance: this runs at Cloudflare's edge before any rendering.
 * Adds ~1ms to canonical-host requests (early-return path) and ~3ms
 * to redirected requests. Negligible.
 */
// Hosts that should be left alone — local dev + IP-based requests.
// We can't use NODE_ENV here because `next start` (the production
// server) also runs locally with NODE_ENV=production; the host header
// is the reliable signal.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

export function middleware(request: NextRequest) {
  const rawHost = request.headers.get("host") ?? "";
  // Strip the port — "localhost:3000" → "localhost"
  const host = rawHost.split(":")[0].toLowerCase();

  // Local dev never enforces the canonical host. Otherwise `npm run dev`
  // would 301 every request away to production and you couldn't iterate.
  if (LOCAL_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  // Already canonical (over https) — let it through unchanged.
  if (host === CANONICAL_HOST && url.protocol === "https:") {
    return NextResponse.next();
  }

  // Anything else → 301 to https://draw-data.com/<path>
  // Covers drawdata.pages.dev, www.draw-data.com, http://draw-data.com,
  // and preview/PR deploys like <hash>.drawdata.pages.dev.
  url.host = CANONICAL_HOST;
  url.protocol = "https:";
  url.port = "";
  return NextResponse.redirect(url, 301);
}

export const config = {
  // Match every route EXCEPT static assets — we don't want to redirect
  // image/CSS/JS requests that already cached at the wrong host (they'd
  // start failing if we did). Page navigations get redirected, assets
  // continue serving from whatever host the browser asked.
  matcher: [
    "/((?!_next/static|_next/image|hero-balls\\.mp4|hero-balls-poster\\.svg|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
