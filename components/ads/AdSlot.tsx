"use client";

/**
 * AdSlot — a single display-ad unit, DORMANT until configured.
 *
 * Renders NOTHING unless NEXT_PUBLIC_ADSENSE_CLIENT is set (your
 * "ca-pub-…" id, which you only get after AdSense approves the site).
 * This lets us place ad positions in the layout now without shipping
 * empty/broken ad markup or hurting the experience before approval —
 * the day you're approved you set the env var and these light up.
 *
 * Policy notes baked in: every unit carries the required "Advertisement"
 * label, and slots are placed between content (never inside the data
 * tools or the hero) so they don't fight the product or tank Core Web
 * Vitals. Ezoic, if used, is integrated at the platform/dashboard level
 * (see public/ads.txt + AdScripts) and largely manages its own
 * placeholders, so this component targets AdSense.
 */

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export function AdSlot({
  slot,
  format = "auto",
  className,
}: {
  slot: string;
  format?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!CLIENT) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense not ready yet — harmless */
    }
  }, []);

  // Dormant until approved + configured. No env id → nothing renders.
  if (!CLIENT) return null;

  return (
    <div className={`my-8 ${className ?? ""}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1 text-center">
        Advertisement
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
