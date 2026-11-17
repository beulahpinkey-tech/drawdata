/**
 * Security response headers for every production response.
 *
 * WHY THESE LIVE HERE (and are applied in middleware.ts):
 * Cloudflare Pages applies public/_headers to STATIC asset responses only —
 * never to responses produced by Pages Functions. Every /[game]/* route runs on
 * the edge runtime, i.e. as a Function, so ~8,840 of the site's ~8,850 pages
 * were served with only `nosniff`: no CSP, no X-Frame-Options (frameable for
 * clickjacking), no Permissions-Policy, COOP, CORP or Referrer-Policy. Only the
 * dozen prerendered pages (/, /about, …) carried the full set from _headers.
 * Middleware runs for every page request, static or dynamic, so it is the one
 * place that covers the whole site.
 *
 * Values are copied verbatim from public/_headers, where they were already
 * proven against the live site (Plausible, Cloudflare Web Analytics, Web3Forms
 * and Google Fonts all load under them). Keep the two in sync — the e2e suite
 * (tests/e2e/smoke-security.spec.ts) checks a dynamic page carries them.
 */
export const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self' https://fonts.gstatic.com data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' https://plausible.io https://static.cloudflareinsights.com",
  "connect-src 'self' https://plausible.io https://api.web3forms.com https://cloudflareinsights.com",
  "upgrade-insecure-requests",
].join("; ");

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};
