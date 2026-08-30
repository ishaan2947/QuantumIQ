/**
 * Scroll-triggered fade-and-rise, shared by every section below the hero.
 *
 * `once: true` matters here: re-animating on every scroll-by makes a page
 * feel busy and costs work on a scroll the visitor is not even looking at.
 * Under prefers-reduced-motion the content renders at its final position with
 * no animation at all, rather than a faster version of the same movement.
 */

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Vertical travel in pixels. Smaller for items inside an already-revealed block. */
  distance?: number;
}

export default function Reveal({ children, delay = 0, className, distance = 26 }: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
