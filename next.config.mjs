/** @type {import('next').NextConfig} */

// Security headers applied to every response.
// Tuned to be strict but not break the site:
//   - Google Fonts (fonts.googleapis.com + fonts.gstatic.com) are needed
//     because layout.tsx pulls Fraunces / Hanken Grotesk / JetBrains Mono
//     from there.
//   - 'unsafe-inline' is kept ONLY for style-src because Next.js inlines
//     small style chunks; script-src is strict. If we move to a CSS-in-JS
//     library that emits runtime <style> tags we'll need to add a nonce
//     pattern; for now Tailwind + tokens.css are static.
//   - 'unsafe-eval' is included in script-src for dev (HMR needs it) —
//     Next sets NODE_ENV=production at build, so we conditionally drop it.
const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self' https://fonts.gstatic.com data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "connect-src 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // Content-Security-Policy: defense-in-depth against XSS and clickjacking.
  { key: "Content-Security-Policy", value: csp },
  // Belt and suspenders for older browsers / agents that don't honor CSP.
  { key: "X-Frame-Options", value: "DENY" },
  // No MIME sniffing — image responses must be image/*, etc.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Tight referrer policy: send origin only on cross-origin nav.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features we don't use. Stops a compromised script
  // from silently turning on the user's camera / mic / location.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()",
  },
  // HSTS: lock the site to HTTPS for 2 years after first visit (includes
  // subdomains and submits us for browser preload list eligibility).
  // Only meaningful over HTTPS, which Cloudflare Pages enforces.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Cross-origin isolation primitives. We don't load embeds; tight is fine.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

// `output: "standalone"` packages a self-hosted Node server into
// .next/standalone. Nothing in this project consumes it: Cloudflare Pages
// serves .vercel/output/static, produced by @cloudflare/next-on-pages
// (see wrangler.toml), and there is no Dockerfile or custom server.
//
// It is also actively broken on Windows — the standalone tracing step dies
// with EBUSY copying .next/server/edge-chunks/*.js, because this app runs
// pages on the edge runtime. That reproduces on a clean checkout with no
// local changes, so `next build` cannot complete on a Windows dev machine.
//
// Rather than drop the setting outright (it predates the Cloudflare
// migration and something on Linux may still expect it), skip it only on
// Windows. CI and production build on Linux and keep the exact behaviour
// they have today; local Windows builds now finish.
const isWindows = process.platform === "win32";

const nextConfig = {
  reactStrictMode: true,
  ...(isWindows ? {} : { output: "standalone" }),
  // Don't leak Next's version in X-Powered-By — drops one fingerprint
  // a scanner could use to target known-Next vulnerabilities.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // Legacy bookmarks from before the state-scoped restructure.
    // /pick3, /pick4 default to Wisconsin (the first state we shipped).
    const subroutes = [
      "",
      "/check",
      "/coverage",
      "/frequency",
      "/gaps",
      "/lookup",
      "/pairs",
      "/positional",
      "/carryover",
      "/streams",
    ];
    return [
      ...subroutes.map((s) => ({
        source: `/pick3${s}`,
        destination: `/wi-pick3${s}`,
        permanent: true,
      })),
      ...subroutes.map((s) => ({
        source: `/pick4${s}`,
        destination: `/wi-pick4${s}`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
