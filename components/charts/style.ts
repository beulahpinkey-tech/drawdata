// Shared chart tooltip style — used by every Recharts <Tooltip>.
// Brighter than the page background so values stay legible at hover.
export const TOOLTIP_STYLE: React.CSSProperties = {
  background: "rgba(28, 31, 40, 0.96)",
  border: "1px solid rgba(233, 184, 74, 0.35)",
  borderRadius: 8,
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.45)",
  padding: "8px 10px",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--text)",
};

export const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: "var(--dim)",
  marginBottom: 2,
  fontSize: 11,
};

export const TOOLTIP_ITEM_STYLE: React.CSSProperties = {
  color: "var(--text)",
};

export const TOOLTIP_CURSOR = { fill: "rgba(233, 184, 74, 0.08)" };
