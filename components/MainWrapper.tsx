"use client";

import { RouteTransition } from "@/components/motion/primitives";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="flex-1" tabIndex={-1}>
      <RouteTransition>{children}</RouteTransition>
    </main>
  );
}
