"use client";

/**
 * Analytics — privacy-first event analytics loader (Plausible), DORMANT
 * until configured.
 *
 * Uses Plausible's current per-site script format. Set
 * NEXT_PUBLIC_PLAUSIBLE_SRC to the exact script URL from your Plausible
 * dashboard snippet, e.g.:
 *   https://plausible.io/js/pa-XXXXXXXXXXXXXXXXXXXXXX.js
 * (the domain is baked into that unique URL, so no data-domain needed).
 *
 * Plausible is cookieless, stores no personal data, needs no consent
 * banner, and is ~1 KB. It auto-tracks pageviews; the init stub creates
 * the window.plausible queue so custom events (lib/analytics.ts track())
 * fired before the script finishes loading aren't lost. Nothing loads or
 * tracks until NEXT_PUBLIC_PLAUSIBLE_SRC is set and the site redeployed.
 */

import Script from "next/script";

const SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC;

export function Analytics() {
  if (!SRC) return null;
  return (
    <>
      <Script id="plausible-src" src={SRC} strategy="afterInteractive" />
      <Script id="plausible-init" strategy="afterInteractive">
        {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
      </Script>
    </>
  );
}
