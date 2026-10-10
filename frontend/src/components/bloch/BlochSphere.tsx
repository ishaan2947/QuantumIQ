/**
 * The Lab's Bloch sphere panel.
 *
 * Why Three.js over D3: the Bloch sphere is inherently 3D — a unit sphere
 * where qubit states map to points on the surface. D3 would need manual
 * projection maths and could not provide smooth 3D rotation. Three.js gives
 * hardware-accelerated WebGL, camera orbiting and real-time animation.
 *
 * The Bloch vector represents the qubit state:
 *   |0⟩ = north pole (0, 0, 1)      |1⟩ = south pole (0, 0, -1)
 *   |+⟩ = (1, 0, 0)                 |−⟩ = (-1, 0, 0)
 *   |i⟩ = (0, 1, 0)                 |−i⟩ = (0, -1, 0)
 *
 * The scene lives in blochScene.tsx, shared with the public console. This
 * component is the panel chrome plus the wiring to circuit context, and the
 * per-qubit readout that spells out |r| — the vector's length, which is how
 * entanglement becomes visible rather than inferred.
 */

import { Canvas } from '@react-three/fiber';

import { useCircuit } from '../../hooks/useCircuit';
import { BLOCH_CAMERA, BlochScene, QUBIT_COLORS } from './blochScene';

/** Signed, fixed-width so the column doesn't shift between +0.71 and −0.71. */
function signed(value: number): string {
  return `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(2)}`;
}

export default function BlochSphere() {
  const { simulationResult, stepResult, currentStep } = useCircuit();

  // Step data wins while stepping through; otherwise the full simulation.
  const result = stepResult ? stepResult.steps[currentStep] : simulationResult;
  const coords = result?.bloch_coords ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="nameplate">
        <span className="nameplate-label">State</span>
        <span className="font-mono text-readout-sm text-ink-faint">drag to orbit</span>
      </div>

      <div className="relative h-[300px] bg-panel-sunk">
        <Canvas camera={BLOCH_CAMERA} dpr={[1, 2]}>
          <BlochScene coords={result?.bloch_coords ?? null} autoRotate={!result} />
        </Canvas>

        {!result && (
          <p
            className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-mono
                       text-[10px] text-ink-tertiary"
          >
            resting at |0⟩ — run the circuit to see the state move
          </p>
        )}
      </div>

      {coords.length > 0 && (
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

                <span className="ml-auto flex items-center gap-2">
                  <span className="text-ink-faint">|r|</span>
                  <span className={mixed ? 'text-copper-300' : 'text-ink-secondary'}>
                    {length.toFixed(2)}
                  </span>
                </span>

                {mixed && (
                  <span
                    className="rounded-tight border border-copper-600 px-1.5 py-px text-[9px] uppercase tracking-[0.12em] text-copper-200"
                    title="Entangled: this qubit's reduced state is mixed, so its vector sits inside the sphere"
                  >
                    entangled
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
