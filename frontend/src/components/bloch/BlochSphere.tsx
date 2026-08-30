/**
 * 3D Bloch Sphere visualization for the signed-in Lab.
 *
 * Why Three.js over D3: The Bloch sphere is inherently 3D — a unit sphere
 * where qubit states map to points on the surface. D3 would require manual
 * projection math and couldn't provide smooth 3D rotation. Three.js gives
 * us hardware-accelerated WebGL, smooth camera orbiting, and real-time
 * animation out of the box.
 *
 * The Bloch vector represents the qubit state:
 * - |0⟩ = north pole (0, 0, 1)
 * - |1⟩ = south pole (0, 0, -1)
 * - |+⟩ = (1, 0, 0), |-⟩ = (-1, 0, 0)
 * - |i⟩ = (0, 1, 0), |-i⟩ = (0, -1, 0)
 *
 * The scene itself lives in blochScene.tsx, shared with the public demo's
 * DemoBlochSphere. This component is just the card chrome plus the wiring to
 * circuit context.
 */

import { Canvas } from '@react-three/fiber';

import { useCircuit } from '../../hooks/useCircuit';
import { BlochScene, QUBIT_COLORS } from './blochScene';

export default function BlochSphere() {
  const { simulationResult, stepResult, currentStep, numQubits } = useCircuit();

  // Use step data if in step-through mode
  const result = stepResult ? stepResult.steps[currentStep] : simulationResult;

  return (
    <div className="bg-[#12122a] rounded-xl border border-[#1a1a3e] p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
        Bloch Sphere
      </h3>

      <div className="h-[300px] rounded-lg overflow-hidden bg-[#080818]">
        <Canvas camera={{ position: [2, 1.5, 2], fov: 45 }}>
          <BlochScene coords={result?.bloch_coords ?? null} autoRotate={!result} />
        </Canvas>
      </div>

      {/* Qubit legend */}
      {result && numQubits > 1 && (
        <div className="flex gap-3 mt-3 justify-center">
          {result.bloch_coords.map((coord, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: QUBIT_COLORS[i % QUBIT_COLORS.length] }}
              />
              <span className="quantum-notation text-xs text-gray-400">
                q{coord.qubit} ({coord.x.toFixed(2)}, {coord.y.toFixed(2)}, {coord.z.toFixed(2)})
              </span>
            </div>
          ))}
        </div>
      )}

      {!result && (
        <p className="text-center text-xs text-gray-600 mt-2">
          Run a simulation to see qubit states on the Bloch sphere
        </p>
      )}
    </div>
  );
}
