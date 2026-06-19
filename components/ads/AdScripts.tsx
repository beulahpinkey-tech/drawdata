"use client";

/**
 * AdScripts — loads the network loader scripts, DORMANT until configured.
 *
 * AdSense: loads only when NEXT_PUBLIC_ADSENSE_CLIENT ("ca-pub-…") is set.
 * Ezoic:   loads only when NEXT_PUBLIC_EZOIC = "1" (Ezoic is normally
 *          integrated via their Cloudflare app / DNS and manages its own
 *          ad placeholders from the dashboard; this script path is the
 *          JavaScript-integration fallback).
 *
 * Both are no-ops until you've been APPROVED by the network and set the
 * env var in Cloudflare Pages → Settings → Environment variables, then
 * redeployed. Nothing here loads or tracks anything before that.
 */

import Script from "next/script";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const EZOIC_ON = process.env.NEXT_PUBLIC_EZOIC === "1";

export function AdScripts() {
  return (
    <>
      {ADSENSE_CLIENT && (
        <Script
          id="adsbygoogle-init"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      )}
      {EZOIC_ON && (
        <>
          <Script
            id="ezoic-sa"
            strategy="afterInteractive"
            src="//www.ezojs.com/ezoic/sa.min.js"
          />
          <Script id="ezoic-init" strategy="afterInteractive">
            {`window.ezstandalone = window.ezstandalone || {}; ezstandalone.cmd = ezstandalone.cmd || [];`}
          </Script>
        </>
      )}
    </>
  );
}
