# DrawData — Security Posture & Operational Checklist

This file documents what's already in place and what to verify after
each deploy. The site is fully static (no server-side user input, no
auth, no DB), so the realistic threats are: defacement via a hijacked
deploy pipeline, takedown via DDoS, SEO poisoning via crawler abuse,
and social engineering of the domain registrar.

---

## In-app defenses (live in this repo)

### HTTP response headers — `next.config.mjs`

Every response carries:

| Header | Value | What it stops |
|---|---|---|
| `Content-Security-Policy` | strict allowlist (self + Google Fonts) | Most XSS, third-party script injection |
| `X-Frame-Options` | `DENY` | Clickjacking via `<iframe>` embed |
| `X-Content-Type-Options` | `nosniff` | MIME-confusion attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Leaking URLs in `Referer` |
| `Permissions-Policy` | camera/mic/geo/payment/usb all off | Compromised script silently using device APIs |
| `Strict-Transport-Security` | 2-year HSTS, includeSubDomains, preload | Downgrade attacks; TLS-stripping |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cross-window scripting |
| `Cross-Origin-Resource-Policy` | `same-origin` | Resource leakage to other origins |
| `X-Powered-By` | (removed) | Fingerprinting by version-targeted scanners |

CSP is the most important one. If a future change adds an external
script (analytics, embeds, etc.), update `csp` in `next.config.mjs`
or it will be blocked.

### Canonical-host middleware — `middleware.ts`

301s every non-`draw-data.com` request (pages.dev, www, http) to the
canonical host. This is anti-phishing as well as SEO — typo-domain
content can't appear at our preview URLs.

### Route guards

- `app/[game]/layout.tsx`: `dynamicParams = false` and an `ALL_GAMES`
  membership check. Unknown slugs 404 instead of trying to render.
- `app/lab/LabView.tsx`: the `?game=` query param is filtered through
  an `isPick(...)` allowlist before use.

The site has no user input forms, no API routes, and no server-side
state. Surface area for injection is small.

---

## GitHub Actions hardening — `.github/workflows/pa-refresh.yml`

- **Least-privilege permissions**: the workflow grants `contents:
  write` (needed to push the refresh commit) and explicitly DENIES
  every other scope (actions, issues, packages, id-token, etc.). A
  compromised action can't escalate to open PRs or mint cloud
  credentials.
- **Concurrency lock**: only one refresh runs at a time; queued runs
  cancel themselves.
- **Pinned major versions** on third-party actions
  (`actions/checkout@v6`, `actions/setup-node@v6`, `actions/cache@v5`).
  Consider pinning to full SHAs if the threat model escalates.
- **Push retry with rebase**: bounded to 5 attempts so a runaway loop
  can't burn Actions minutes.

If you ever add a workflow that needs Cloud credentials, use OIDC
(`id-token: write`) instead of long-lived secrets.

---

## DDoS / takedown protection

The site is hosted on Cloudflare Pages, so the realistic mitigations
live in the Cloudflare dashboard, not the repo:

- **Security level**: Medium or higher
- **Bot Fight Mode**: On (free tier is fine for static sites)
- **Rate Limiting Rules**: optional one-rule free tier — recommend
  capping `/sitemap.xml` and `/robots.txt` to a sane RPS to prevent
  amplification scrapes
- **Always Use HTTPS**: On (also enforced by HSTS)
- **TLS 1.3**: On, min TLS 1.2

There is no application-layer rate limiter in this repo because the
site is static and Cloudflare in front of it is the right layer.

---

## Domain & DNS

- Domain registrar: enable registrar lock + 2FA + DNSSEC
- Cloudflare account: 2FA (TOTP preferred over SMS) + a hardware key
- Auth log review: monthly, check Cloudflare Audit Log for any rule
  changes you didn't make

---

## Pre-deploy checklist

Run before any change to `middleware.ts`, `next.config.mjs`, the
workflow, or any auth-adjacent code:

- [ ] `npm run typecheck` — no errors
- [ ] `npm run verify:isolation` — no cross-game contamination
- [ ] Local `npm run build` succeeds
- [ ] If headers changed: open the production URL and check Response
  Headers in DevTools; confirm CSP is intact and didn't get widened
- [ ] If middleware changed: hit `https://drawdata.pages.dev/` and
  confirm it 301s to `https://draw-data.com/`
- [ ] If a new external script/font/image origin was added: update
  the CSP allowlist in `next.config.mjs`

## Incident response

If you suspect the site is compromised:

1. Disable the GitHub Actions workflow first (`gh workflow disable
   pa-refresh.yml`) so the bot can't push compromised commits.
2. Revert the most recent suspect commits on `main`.
3. In Cloudflare, set Security Level to High and enable "Under
   Attack" mode while you investigate.
4. Rotate the GitHub fine-grained PAT used by the bot.
5. Check the Cloudflare Audit Log and GitHub Audit Log for the
   intrusion window.

## Reporting a vulnerability

Email the maintainer (see `app/contact/page.tsx`). Please don't open
a public issue for security reports.
