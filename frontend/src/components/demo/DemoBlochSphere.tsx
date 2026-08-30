/**
 * Bloch sphere panel for the public demo.
 *
 * Two deliberate differences from the Lab's BlochSphere, both about being a
 * good citizen on a page a stranger might land on and scroll straight past:
 *
 *   1. The WebGL context isn't created until the panel scrolls into view.
 *   2. The render loop is suspended (frameloop="never") whenever it scrolls
 *      back out, instead of spinning at 60fps behind the fold for as long as
 *      the tab is open.
 *
 * The scene itself is the shared one from blochScene.tsx.
 */

import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useInView } from 'framer-motion';

import { BlochScene, DEMO_QUBIT_COLORS } from '../bloch/blochScene';
import type { BlochCoords } from '../../types';

interface DemoBlochSphereProps {
  coords: BlochCoords[];
}

export default function DemoBlochSphere({ coords }: DemoBlochSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // `once: false` so the loop can be suspended again on the way back out.
  const inView = useInView(containerRef, { margin: '160px' });
  const mountedRef = useRef(false);

  if (inView) mountedRef.current = true;

  return (
    <div
      ref={containerRef}
      className="edge-highlight relative flex flex-col overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-900/70 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
          Bloch Sphere
        </h3>
        <span className="text-[11px] text-gray-600">drag to orbit · scroll to zoom</span>
      </div>

      <div className="relative h-[280px] bg-[#070714]">
        {mountedRef.current ? (
          <Canvas
            camera={{ position: [2, 1.5, 2], fov: 45 }}
            frameloop={inView ? 'always' : 'never'}
            dpr={[1, 2]}
          >
            <BlochScene coords={coords} colors={DEMO_QUBIT_COLORS} />
          </Canvas>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-600">
            Loading 3D view…
          </div>
        )}
      </div>

      {/* Per-qubit readout. An entangled qubit's vector is shorter than 1,
          which is the single most useful thing this panel shows, so the
          length is spelled out rather than left to be eyeballed. */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-700/60 px-5 py-3">
        {coords.map((coord) => {
          const length = Math.hypot(coord.x, coord.y, coord.z);

          return (
            <div key={coord.qubit} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{
                  backgroundColor: DEMO_QUBIT_COLORS[coord.qubit % DEMO_QUBIT_COLORS.length],
                  boxShadow: `0 0 8px ${DEMO_QUBIT_COLORS[coord.qubit % DEMO_QUBIT_COLORS.length]}80`,
                }}
              />
              <span className="quantum-notation text-[11px] text-gray-400">
                q{coord.qubit} ({coord.x.toFixed(2)}, {coord.y.toFixed(2)}, {coord.z.toFixed(2)})
              </span>
              {length < 0.99 && (
                <span
                  className="rounded bg-quantum-500/15 px-1.5 py-0.5 text-[10px] font-medium text-quantum-300"
                  title="This qubit is entangled, so its reduced state is mixed and its vector sits inside the sphere"
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
