/**
 * Pointer-tracking hook behind the hero's parallax.
 *
 * Returns two spring-smoothed motion values in roughly [-0.5, 0.5], measured
 * from the centre of the tracked element. Consumers multiply them by however
 * many pixels that layer should travel, which is what produces the depth
 * effect: layers with a bigger multiplier read as closer to the viewer.
 *
 * Performance notes, since this runs on mousemove:
 *   - Motion values are written outside React state, so moving the pointer
 *     never triggers a re-render — Framer Motion writes the transform
 *     directly to the DOM node.
 *   - The listener only stores coordinates; the read of getBoundingClientRect
 *     is cached and refreshed on resize/scroll rather than per event, so we
 *     don't force layout on every pointer move.
 *   - It disables itself for coarse pointers (touch, where there is no
 *     hover to track) and for prefers-reduced-motion.
 */

import { useEffect, useRef, type RefObject } from 'react';
import { useMotionValue, useSpring, useReducedMotion, type MotionValue } from 'framer-motion';

export interface PointerParallax {
  /** Horizontal offset from centre, about -0.5 (left) to 0.5 (right). */
  px: MotionValue<number>;
  /** Vertical offset from centre, about -0.5 (top) to 0.5 (bottom). */
  py: MotionValue<number>;
}

const SPRING = { stiffness: 55, damping: 18, mass: 0.6 };

export function usePointerParallax(ref: RefObject<HTMLElement>): PointerParallax {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const px = useSpring(rawX, SPRING);
  const py = useSpring(rawY, SPRING);

  const prefersReducedMotion = useReducedMotion();
  const boundsRef = useRef<DOMRect | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion) return;

    // No hover to follow on touch devices, and running the listener there
    // would just be battery spent on nothing.
    const finePointer = window.matchMedia('(pointer: fine)');
    if (!finePointer.matches) return;

    const measure = () => {
      boundsRef.current = element.getBoundingClientRect();
    };
    measure();

    const flush = () => {
      frameRef.current = null;
      const point = pendingRef.current;
      const bounds = boundsRef.current;
      if (!point || !bounds || bounds.width === 0 || bounds.height === 0) return;

      rawX.set((point.x - bounds.left) / bounds.width - 0.5);
      rawY.set((point.y - bounds.top) / bounds.height - 0.5);
    };

    const handleMove = (event: PointerEvent) => {
      pendingRef.current = { x: event.clientX, y: event.clientY };
      // Coalesce bursts of pointer events into one write per frame.
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(flush);
      }
    };

    // Drift back to centre when the pointer leaves, so the hero settles
    // instead of freezing at whatever angle it was last nudged to.
    const handleLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    document.addEventListener('pointerleave', handleLeave);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerleave', handleLeave);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [ref, prefersReducedMotion, rawX, rawY]);

  return { px, py };
}
