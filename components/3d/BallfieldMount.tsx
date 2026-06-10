"use client";

/**
 * Client shim for the site-wide ballfield. app/layout.tsx is a server
 * component and can't use `dynamic(..., { ssr: false })` directly, so
 * this tiny client component does the lazy import. R3F + three
 * (~150 KB gz) stay out of the initial bundle; the field streams in
 * after hydration and fades up via CSS so there's no pop.
 */

import dynamic from "next/dynamic";

const BallfieldBackground = dynamic(
  () => import("@/components/3d/BallfieldBackground"),
  { ssr: false, loading: () => null },
);

export function BallfieldMount() {
  return (
    <div className="animate-fade-in" style={{ animationDuration: "1200ms" }}>
      <BallfieldBackground />
    </div>
  );
}
