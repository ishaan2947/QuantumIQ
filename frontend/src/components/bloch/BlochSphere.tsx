/**
 * 3D Bloch Sphere visualization using Three.js via @react-three/fiber.
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
 * @react-three/fiber is the React renderer for Three.js — it lets us write
 * Three.js scenes as React components with hooks, which is dramatically
 * cleaner than imperative Three.js code.
 */

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useCircuit } from '../../hooks/useCircuit';

interface BlochVectorProps {
  x: number;
  y: number;
  z: number;
  color: string;
}

/**
 * Animated Bloch vector — smoothly interpolates to new positions.
 *
 * Uses Three.js's lerp (linear interpolation) for smooth animation.
 * The vector transitions over ~30 frames instead of jumping instantly,
 * which makes gate operations visually intuitive.
 */
function BlochVector({ x, y, z, color }: BlochVectorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetPos = useMemo(() => new THREE.Vector3(x, z, -y), [x, y, z]);
  const currentPos = useRef(new THREE.Vector3(0, 1, 0));
  // State to trigger re-render so Line updates its points each frame
  const [lineEnd, setLineEnd] = useState<THREE.Vector3>(new THREE.Vector3(0, 1, 0));

  useFrame(() => {
    // Smooth interpolation toward target position
    currentPos.current.lerp(targetPos, 0.08);

    if (meshRef.current) {
      meshRef.current.position.copy(currentPos.current);
    }
    // Update line endpoint — clone to create a new Vector3 so React sees it as changed
    setLineEnd(currentPos.current.clone());
  });

  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  return (
    <group>
      {/* Vector line from origin to state point */}
      <Line
        points={[origin, lineEnd]}
        color={color}
        lineWidth={3}
      />
      {/* State point (sphere at tip) */}
      <mesh ref={meshRef} position={[x, z, -y]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/**
 * The Bloch sphere wireframe with axis labels.
 */
function SphereWireframe() {
  return (
    <group>
      {/* Transparent sphere */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#4c6ef5"
          transparent
          opacity={0.08}
          wireframe={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe overlay */}
      <mesh>
        <sphereGeometry args={[1.001, 16, 16]} />
        <meshBasicMaterial color="#2a2a4a" wireframe />
      </mesh>

      {/* Equator circle */}
      <Line
        points={Array.from({ length: 65 }, (_, i) => {
          const angle = (i / 64) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        })}
        color="#3a3a5a"
        lineWidth={1}
      />

      {/* Axes */}
      <Line points={[new THREE.Vector3(-1.3, 0, 0), new THREE.Vector3(1.3, 0, 0)]} color="#ff6b6b" lineWidth={1} />
      <Line points={[new THREE.Vector3(0, -1.3, 0), new THREE.Vector3(0, 1.3, 0)]} color="#51cf66" lineWidth={1} />
      <Line points={[new THREE.Vector3(0, 0, -1.3), new THREE.Vector3(0, 0, 1.3)]} color="#5c7cfa" lineWidth={1} />

      {/* Axis labels */}
      <Text position={[1.5, 0, 0]} fontSize={0.15} color="#ff6b6b">X |+⟩</Text>
      <Text position={[-1.5, 0, 0]} fontSize={0.15} color="#ff6b6b">-X |-⟩</Text>
      <Text position={[0, 1.5, 0]} fontSize={0.15} color="#51cf66">Z |0⟩</Text>
      <Text position={[0, -1.5, 0]} fontSize={0.15} color="#51cf66">-Z |1⟩</Text>
      <Text position={[0, 0, 1.5]} fontSize={0.15} color="#5c7cfa">Y</Text>
    </group>
  );
}

const QUBIT_COLORS = ['#5c7cfa', '#ff6b6b', '#51cf66', '#ffd43b', '#845ef7'];

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
          <ambientLight intensity={0.4} />
          <pointLight position={[5, 5, 5]} intensity={0.6} />

          <SphereWireframe />

          {/* Render a vector for each qubit */}
          {result?.bloch_coords.map((coord, i) => (
            <BlochVector
              key={i}
              x={coord.x}
              y={coord.y}
              z={coord.z}
              color={QUBIT_COLORS[i % QUBIT_COLORS.length]}
            />
          ))}

          {/* Default |0⟩ state when no simulation has run */}
          {!result && (
            <BlochVector x={0} y={0} z={1} color="#5c7cfa" />
          )}

          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={2}
            maxDistance={5}
            autoRotate={!result}
            autoRotateSpeed={0.5}
          />
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
