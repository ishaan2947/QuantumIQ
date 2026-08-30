/**
 * Shared Three.js pieces of the Bloch sphere.
 *
 * Extracted so the signed-in Lab (BlochSphere.tsx, which reads circuit state
 * from context) and the public demo (DemoBlochSphere.tsx, which takes props)
 * render the same scene instead of maintaining two copies of the geometry.
 *
 * Coordinate mapping, which is easy to get wrong: Three.js is Y-up, the Bloch
 * convention is Z-up, so the Bloch vector (x, y, z) is placed at the scene
 * position (x, z, -y). |0> ends up at the top of the screen, which is what a
 * reader expects from every textbook diagram.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, OrbitControls, Text } from '@react-three/drei';
import type { Line2 } from 'three-stdlib';
import * as THREE from 'three';

import type { BlochCoords } from '../../types';

/** Lab palette. Unchanged from the original BlochSphere so the signed-in
 *  view keeps the colours its users already know. */
export const QUBIT_COLORS = ['#5c7cfa', '#ff6b6b', '#51cf66', '#ffd43b', '#845ef7'];

/** Landing-page palette, tuned to the hero photograph's cyan/blue range. */
export const DEMO_QUBIT_COLORS = ['#22d3ee', '#5c7cfa', '#a78bfa', '#f472b6'];

/** How far the vector moves toward its target each frame. */
const LERP_RATE = 0.08;

interface BlochVectorProps {
  x: number;
  y: number;
  z: number;
  color: string;
}

/**
 * The state vector, animated toward its target rather than snapping.
 *
 * Both the tip mesh and the line are updated imperatively inside useFrame.
 * The obvious alternative — holding the line's endpoint in React state — costs
 * a full re-render on every animation frame for every qubit on screen, which
 * on the landing page would run for as long as the section is mounted.
 */
export function BlochVector({ x, y, z, color }: BlochVectorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<Line2>(null);

  const target = useMemo(() => new THREE.Vector3(x, z, -y), [x, y, z]);
  const current = useRef(new THREE.Vector3(0, 1, 0));

  useFrame(() => {
    current.current.lerp(target, LERP_RATE);
    const { x: cx, y: cy, z: cz } = current.current;

    if (meshRef.current) {
      meshRef.current.position.set(cx, cy, cz);
    }

    // LineGeometry rebuilds its interleaved buffers on setPositions, so no
    // needsUpdate flag is required. Guarded because the ref is null on the
    // first frame before the line mounts.
    const geometry = lineRef.current?.geometry;
    if (geometry) {
      geometry.setPositions([0, 0, 0, cx, cy, cz]);
    }
  });

  return (
    <group>
      <Line
        ref={lineRef}
        points={[
          [0, 0, 0],
          [x, z, -y],
        ]}
        color={color}
        lineWidth={3}
      />
      <mesh ref={meshRef} position={[x, z, -y]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/** The translucent sphere, its wireframe, equator, axes and labels. */
export function SphereWireframe() {
  const equator = useMemo(
    () =>
      Array.from({ length: 65 }, (_, i) => {
        const angle = (i / 64) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      }),
    [],
  );

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#4c6ef5"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.001, 16, 16]} />
        <meshBasicMaterial color="#2a2a4a" wireframe />
      </mesh>

      <Line points={equator} color="#3a3a5a" lineWidth={1} />

      <Line
        points={[
          [-1.3, 0, 0],
          [1.3, 0, 0],
        ]}
        color="#ff6b6b"
        lineWidth={1}
      />
      <Line
        points={[
          [0, -1.3, 0],
          [0, 1.3, 0],
        ]}
        color="#51cf66"
        lineWidth={1}
      />
      <Line
        points={[
          [0, 0, -1.3],
          [0, 0, 1.3],
        ]}
        color="#5c7cfa"
        lineWidth={1}
      />

      <Text position={[1.5, 0, 0]} fontSize={0.15} color="#ff6b6b">X |+⟩</Text>
      <Text position={[-1.5, 0, 0]} fontSize={0.15} color="#ff6b6b">-X |-⟩</Text>
      <Text position={[0, 1.5, 0]} fontSize={0.15} color="#51cf66">Z |0⟩</Text>
      <Text position={[0, -1.5, 0]} fontSize={0.15} color="#51cf66">-Z |1⟩</Text>
      <Text position={[0, 0, 1.5]} fontSize={0.15} color="#5c7cfa">Y</Text>
    </group>
  );
}

interface BlochSceneProps {
  coords: BlochCoords[] | null;
  /** Slowly spins the camera when there's nothing to look at yet. */
  autoRotate?: boolean;
  /** Per-qubit vector colours, cycled if there are more qubits than entries. */
  colors?: readonly string[];
}

/** Everything inside the <Canvas>. Callers own the canvas and its sizing. */
export function BlochScene({ coords, autoRotate = false, colors = QUBIT_COLORS }: BlochSceneProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.6} />

      <SphereWireframe />

      {coords?.map((coord) => (
        <BlochVector
          key={coord.qubit}
          x={coord.x}
          y={coord.y}
          z={coord.z}
          color={colors[coord.qubit % colors.length]}
        />
      ))}

      {/* Resting |0> state so the sphere is never empty. */}
      {!coords?.length && <BlochVector x={0} y={0} z={1} color={colors[0]} />}

      <OrbitControls
        enableZoom
        enablePan={false}
        minDistance={2}
        maxDistance={5}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
      />
    </>
  );
}
