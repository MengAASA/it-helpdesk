"use client";

import { createContext, useContext } from "react";
import { motion } from "framer-motion";

/**
 * The sidebar's collapsed state, shared so dashboard blocks can animate when it toggles.
 *
 * Why not just ease the main area's padding (as other admin pages do)? The dashboard is a CSS
 * multi-column masonry: easing the width re-flows the columns on every frame, and when the
 * column count flips (3 <-> 4) cards jump between columns mid-slide, which reads as flicker.
 * Instead the layout snaps once and each block glides from its old box to its new one (FLIP).
 *
 * A page opts in by putting `data-sidebar-flip` on its root: the shell then turns off its padding
 * transition, which would otherwise hide the final layout from the FLIP measurement.
 */
export const SidebarCollapsedContext = createContext(false);

/** Same duration and curve as the sidebar's own width transition, so everything moves together. */
const GLIDE = { layout: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } };

/**
 * A card that morphs from its old box to its new one when the sidebar toggles. The content sits in
 * its own layout layer so framer counter-scales it: text keeps its final size instead of stretching
 * while the card's outline resizes.
 */
export function FlipCard({ className, radius, children }: { className: string; radius: number; children: React.ReactNode }) {
  const collapsed = useContext(SidebarCollapsedContext);
  return (
    <motion.section
      layout
      layoutDependency={collapsed}
      transition={GLIDE}
      // Set inline so framer can correct the corner radius while the card is scaled.
      style={{ borderRadius: radius }}
      className={className}
    >
      <motion.div layout="position" layoutDependency={collapsed} transition={GLIDE}>
        {children}
      </motion.div>
    </motion.section>
  );
}

/** A block that only slides to its new position (no resize), for headings and similar. */
export function FlipBlock({ className, children }: { className?: string; children: React.ReactNode }) {
  const collapsed = useContext(SidebarCollapsedContext);
  return (
    <motion.div layout="position" layoutDependency={collapsed} transition={GLIDE} className={className}>
      {children}
    </motion.div>
  );
}
