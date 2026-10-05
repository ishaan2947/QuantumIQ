/**
 * The console's state panel: the Bloch sphere plus a per-qubit readout.
 *
 * Two deliberate differences from the Lab's BlochSphere, both about being a
 * good citizen on a page a stranger might land on and scroll straight past:
 *
 *   1. The WebGL context isn't created until the panel scrolls into view.
 *   2. The render loop is suspended (frameloop="never") whenever it scrolls
 *      back out, instead of spinning at 60fps behind the fold for as long as
 *      the tab is open.
 *
 * The readout spells out |r|, the length of each qubit's vector, as a bar.
 * That number is the single most useful thing this panel shows and the one
 * most easily missed: a qubit entangled with another has a *genuinely
 * shorter* vector, because its own state is less defined, not because the
 * drawing is imprecise.
 */

import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useInView } from 'framer-motion';

import { BLOCH_CAMERA, BlochScene, QUBIT_COLORS } from '../bloch/blochScene';
import type { BlochCoords } from '../../types';

interface DemoBlochSphereProps {
  coords: BlochCoords[];
}

/** Signed, fixed-width so the column doesn't shift between +0.71 and -0.71. */
function signed(value: number): string {
  return `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(2)}`;
}

export default function DemoBlochSphere({ coords }: DemoBlochSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // `once: false` so the loop can be suspended again on the way back out.
  const inView = useInView(containerRef, { margin: '160px' });
  const mountedRef = useRef(false);

  if (inView) mountedRef.current = true;

  return (
    <div ref={containerRef} className="flex h-full flex-col">
      <div className="nameplate">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-micro text-copper-400">02</span>
          <span className="nameplate-label">State</span>
        </div>
        <span className="font-mono text-readout-sm text-ink-faint">drag to orbit</span>
      </div>

      <p className="border-b border-rule px-4 py-2.5 text-small text-ink-secondary">
        One vector per qubit. Entangle two and both vectors shrink toward the
        centre — each qubit alone is genuinely less defined.
      </p>

      <div className="relative h-[300px] bg-panel-sunk">
        {mountedRef.current ? (
          <Canvas
            camera={BLOCH_CAMERA}
            frameloop={inView ? 'always' : 'never'}
            dpr={[1, 2]}
          >
            <BlochScene coords={coords} />
          </Canvas>
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-readout-sm text-ink-faint">
            initialising 3D view…
          </div>
        )}
      </div>

      {/* ── Per-qubit readout ──────────────────────────────────────────── */}
      <div className="motion-keep divide-y divide-rule border-t border-rule">
        {coords.map((coord) => {
          const length = Math.hypot(coord.x, coord.y, coord.z);
          const mixed = length < 0.99;
          const color = QUBIT_COLORS[coord.qubit % QUBIT_COLORS.length];

          return (
            <div
              key={coord.qubit}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 font-mono text-readout-sm"
            >
              <span className="flex items-center gap-2 text-ink-tertiary">
                <span
                  aria-hidden
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                q{coord.qubit}
              </span>

              <span className="text-ink-secondary">
                {signed(coord.x)} {signed(coord.y)} {signed(coord.z)}
              </span>

              {/* |r| as a bar — purity, read at a glance. */}
              <span className="ml-auto flex items-center gap-2">
                <span className="text-ink-faint">|r|</span>
                <span
                  aria-hidden
                  className="relative h-1.5 w-10 overflow-hidden rounded-tight bg-panel-sunk"
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-tight"
                    style={{
                      width: `${Math.min(100, length * 100)}%`,
                      backgroundColor: mixed ? '#8A531F' : color,
                      transition: 'width var(--t-move) var(--ease)',
                    }}
                  />
                </span>
                <span className={mixed ? 'text-copper-300' : 'text-ink-secondary'}>
                  {length.toFixed(2)}
                </span>
              </span>

              {mixed && (
                <span
                  className="rounded-tight border border-copper-600 px-1.5 py-px text-[9px] uppercase tracking-[0.12em] text-copper-200"
                  title="Entangled: the reduced state of this qubit is mixed, so its vector sits inside the sphere"
                >
                  entangled
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
