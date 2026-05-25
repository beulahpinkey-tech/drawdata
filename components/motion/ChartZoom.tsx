"use client";

import { useEffect, useState, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

/**
 * Wraps any chart/heatmap. Clicking the chart opens an expanded overlay
 * with pinch-zoom + drag-to-pan. Esc / click-out closes.
 *
 * Uses Framer's layoutId for a shared-element transition between the
 * inline chart and the overlay.
 */
export function ChartZoom({
  children,
  caption,
  className,
}: {
  children: React.ReactNode;
  caption?: string;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.div
        layoutId={reduce ? undefined : id}
        className={`relative group cursor-zoom-in ${className ?? ""}`}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label="Open chart for zoom and pan"
      >
        {children}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono panel-inner px-2 py-1">
            click to zoom
          </span>
        </div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[90] bg-ink/85 backdrop-blur-md p-4 sm:p-8 grid place-items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              layoutId={reduce ? undefined : id}
              className="panel w-full max-w-6xl h-[80vh] p-4 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-[12px] text-dim font-mono">
                  {caption} · pinch / scroll to zoom · drag to pan · <span className="kbd">Esc</span> to close
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 grid place-items-center rounded-md border border-edge text-dim hover:text-text hover:bg-white/[0.04]"
                  aria-label="close"
                >
                  ×
                </button>
              </div>
              <div className="h-[calc(100%-2.5rem)] panel-inner overflow-hidden">
                <TransformWrapper
                  initialScale={1}
                  minScale={0.5}
                  maxScale={6}
                  wheel={{ step: 0.2 }}
                  doubleClick={{ mode: "reset" }}
                  panning={{ velocityDisabled: false }}
                >
                  <TransformComponent
                    wrapperStyle={{ width: "100%", height: "100%" }}
                    contentStyle={{ width: "100%", height: "100%" }}
                  >
                    <div className="w-full h-full p-4">{children}</div>
                  </TransformComponent>
                </TransformWrapper>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
