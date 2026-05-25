"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────
export interface ActionItem {
  id: string;
  label: string;
  onClick?: () => void;
}

export interface ShowmoreInteractionProps {
  items?: ActionItem[];
  backgroundColor?: string;
  pillBackgroundColor?: string;
  textColor?: string;
  iconColor?: string;
  style?: React.CSSProperties;
}

// ─── Default Data ──────────────────────────────────────────────────────
const defaultItems: ActionItem[] = [
  { id: "save", label: "Save" },
  { id: "copy", label: "Copy" },
  { id: "share", label: "Share" },
  { id: "delete", label: "Delete" },
];

// ─── SVG Icons ─────────────────────────────────────────────────────────
function DotsIcon() {
  return (
    <svg width="16" height="4" viewBox="0 0 16 4" fill="none">
      <circle cx="2" cy="2" r="1.75" fill="currentColor" />
      <circle cx="8" cy="2" r="1.75" fill="currentColor" />
      <circle cx="14" cy="2" r="1.75" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M1 1L9 9M9 1L1 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Global Spring Transition ──────────────────────────────────────────
const springTransition = { type: "spring" as const, bounce: 0.4, duration: 1 };

// ─── Sub-Components ────────────────────────────────────────────────────

function ActionButton({
  item,
  pillBackgroundColor,
  textColor,
}: {
  item: ActionItem;
  pillBackgroundColor: string;
  textColor: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={item.onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 14px",
        backgroundColor: pillBackgroundColor,
        border: "1px solid var(--edge)",
        borderRadius: 100,
        cursor: "pointer",
        color: textColor,
        // Re-skin: DrawData uses Hanken Grotesk for body, JetBrains Mono for caps/labels.
        fontFamily: "var(--font-body)",
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "-0.01em",
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {item.label}
    </motion.button>
  );
}

function ToggleIconButton({
  isExpanded,
  onClick,
  pillBackgroundColor,
  iconColor,
}: {
  isExpanded: boolean;
  onClick: () => void;
  pillBackgroundColor: string;
  iconColor: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={onClick}
      aria-label={isExpanded ? "Hide actions" : "Show more actions"}
      style={{
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pillBackgroundColor,
        border: "1px solid var(--edge)",
        borderRadius: 100,
        cursor: "pointer",
        color: iconColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={false}
        animate={{ opacity: isExpanded ? 1 : 0 }}
        transition={springTransition}
        style={{
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CloseIcon />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ opacity: isExpanded ? 0 : 1 }}
        transition={springTransition}
        style={{
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DotsIcon />
      </motion.div>
    </motion.button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

/**
 * ShowmoreInteraction — an expandable pill bar.
 *
 * Click the three-dot toggle to fan out action buttons with a staggered
 * spring (50ms between items). Click the X to collapse. All transitions
 * use the global spring (bounce: 0.4, duration: 1). Outer container has
 * `layout` so the capsule resize is automatic.
 *
 * Default palette differs from the source spec — uses the DrawData
 * cool-teal accent so it stands apart from amber primary surfaces.
 */
export function ShowmoreInteraction({
  items = defaultItems,
  // DrawData re-skin: ink/panel pill on amber tinted container.
  backgroundColor = "rgba(233, 184, 74, 0.08)", // amber tint
  pillBackgroundColor = "var(--panel2)",
  textColor = "var(--text)",
  iconColor = "var(--accent)",
  style,
}: ShowmoreInteractionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      transition={springTransition}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: 6,
        backgroundColor,
        borderRadius: 344,
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      <AnimatePresence mode="popLayout">
        {isExpanded &&
          items.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.8, filter: "blur(5px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.8, filter: "blur(5px)" }}
              transition={{ ...springTransition, delay: index * 0.05 }}
            >
              <ActionButton
                item={item}
                pillBackgroundColor={pillBackgroundColor}
                textColor={textColor}
              />
            </motion.div>
          ))}
      </AnimatePresence>
      <motion.div layout transition={springTransition}>
        <ToggleIconButton
          isExpanded={isExpanded}
          onClick={() => setIsExpanded((v) => !v)}
          pillBackgroundColor={pillBackgroundColor}
          iconColor={iconColor}
        />
      </motion.div>
    </motion.div>
  );
}
