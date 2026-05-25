"use client";

import { ShowmoreInteraction } from "./ShowmoreInteraction";

export type ChartActionContext = {
  /** Stable id used for deep-link / OG card. Pages set this. */
  panelId: string;
  /** Human-readable label, used for copy / share text. */
  title: string;
  /** CSV rows (header + body) — provided when Export makes sense. */
  csv?: () => string;
  /** Optional callback to trigger the click-to-zoom overlay. */
  onZoom?: () => void;
};

/**
 * Per-panel actions menu. Three-dot toggle reveals:
 *   Zoom · Copy link · Share · Export CSV
 *
 * Each action is wired to a real handler; if a handler is missing for a context
 * (e.g. no CSV available) that button is simply omitted.
 */
export function ChartPanelActions({ ctx }: { ctx: ChartActionContext }) {
  const copyLink = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.hash = `#${ctx.panelId}`;
    navigator.clipboard?.writeText(url.toString());
  };

  const share = async () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.hash = `#${ctx.panelId}`;
    const text = `${ctx.title} — DrawData`;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title: ctx.title, text, url: url.toString() });
      } catch {
        /* user cancelled */
      }
    } else {
      navigator.clipboard?.writeText(`${text} ${url.toString()}`);
    }
  };

  const exportCsv = () => {
    if (!ctx.csv) return;
    const csv = ctx.csv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ctx.panelId.replace(/[^a-z0-9-]/gi, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  };

  const items = [
    ctx.onZoom ? { id: "zoom", label: "Zoom", onClick: ctx.onZoom } : null,
    { id: "copy", label: "Copy link", onClick: copyLink },
    { id: "share", label: "Share", onClick: share },
    ctx.csv ? { id: "csv", label: "Export CSV", onClick: exportCsv } : null,
  ].filter(Boolean) as { id: string; label: string; onClick: () => void }[];

  return <ShowmoreInteraction items={items} />;
}
