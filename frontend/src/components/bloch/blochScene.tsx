/**
 * Shared Three.js pieces of the Bloch sphere.
 *
 * Extracted so the signed-in Lab (BlochSphere.tsx, which reads circuit state
 * from context) and the public console (DemoBlochSphere.tsx, which takes
 * props) render the same scene instead of maintaining two copies of the
 * geometry.
 *
 * Coordinate mapping, which is easy to get wrong: Three.js is Y-up, the Bloch
 * convention is Z-up, so the Bloch vector (x, y, z) is placed at the scene
 * position (x, z, -y). |0⟩ ends up at the top of the screen, which is what a
 * reader expects from every textbook diagram.
 *
 * Styling follows DESIGN.md: a fine drawn wireframe of real meridians and
 * parallels rather than a triangulated THREE wireframe (which reads as noise),
 * copper state vectors, and axis labels for the four states a learner actually
 * needs to locate.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Line, OrbitControls, Text } from '@react-three/drei';
import type { Line2 } from 'three-stdlib';
import * as THREE from 'three';

import type { BlochCoords } from '../../types';

/**
 * Per-qubit vector colours.
 *
 * Distinguished by brightness and by copper-versus-steel rather than by hue —
 * the palette has exactly two chromatic values and a rainbow of qubit colours
 * is precisely what this redesign removed. Four entries covers the console's
 * cap; the Lab cycles for more.
 */
export const QUBIT_COLORS = ['#D28E4E', '#D6D0C6', '#8A531F', '#60594F'];

/** Scene furniture. */
const C_WIRE = '#4A4237'; // meridians and parallels
const C_EQUATOR = '#7A5428'; // the equator — warmer and brighter than the rest
const C_AXIS = '#5C5448'; // axis rules
const C_LABEL_BASIS = '#E2A871'; // |0⟩ and |1⟩ — the measurement basis
const C_LABEL_SUPER = '#9D968A'; // |+⟩, |−⟩ and the imaginary axis

/**
 * Camera framing, shared by both panels so they frame the sphere identically.
 *
 * Deliberately generous. OrbitControls owns the camera once it mounts, and
 * between its distance clamping and the panel's aspect ratio the effective
 * field of view is not reliably the one this position and fov imply — an
 * earlier, tighter framing computed to fit on paper and clipped the |0⟩ and
 * |1⟩ labels in practice. A clipped label is a bug; a sphere that sits a
 * little smaller in its panel is a preference, and the viewer can zoom.
 */
export const BLOCH_CAMERA = { position: [2.3, 1.75, 2.3] as [number, number, number], fov: 45 };

/** How far the vector moves toward its target each frame. */
const LERP_RATE = 0.12;

/**
 * Two qubits can occupy the same point on (or in) the sphere, and when they do
 * the drawing shows fewer vectors than the circuit has qubits:
 *
 *   - Three qubits all in |0⟩ draw three identical lines to the north pole,
 *     and you see one.
 *   - A maximally entangled state has every vector at length zero, so a
 *     finished Bell pair or GHZ state draws nothing at all.
 *
 * Both are the physically honest picture and both are confusing. The fix is a
 * stack of concentric markers at any shared point — innermost solid, the rest
 * hollow rings — so the number of markers always equals the number of qubits
 * there. Nothing is displaced and no position is faked; only the marker that
 * annotates the position changes.
 */
/** Positions closer together than this are treated as the same point. */
const COINCIDENT_EPS = 0.06;
/** Base marker radius, and how much each additional qubit's ring grows by. */
const MARKER_R = 0.045;
const MARKER_STEP = 0.038;

/**
 * Read once at module scope rather than through useReducedMotion, because
 * this is consumed inside useFrame where a hook subscription would be
 * re-evaluated 60 times a second.
 */
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A circle of `segments` points on the given plane, radius 1. */
function circle(plane: 'xz' | 'xy' | 'yz', segments = 96): THREE.Vector3[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    if (plane === 'xz') return new THREE.Vector3(c, 0, s);
    if (plane === 'xy') return new THREE.Vector3(c, s, 0);
    return new THREE.Vector3(0, c, s);
  });
}

/** A parallel (line of constant latitude) at the given height. */
function parallel(height: number, segments = 96): THREE.Vector3[] {
  const radius = Math.sqrt(Math.max(0, 1 - height * height));
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, height, Math.sin(a) * radius);
  });
}

interface BlochVectorProps {
  x: number;
  y: number;
  z: number;
  color: string;
  /**
   * How many qubits already occupy this point. 0 draws a solid tip; 1 and up
   * draw successively larger hollow rings around it, so a shared point reports
   * how many qubits are at it.
   */
  stack?: number;
}

/**
 * The state vector, animated toward its target rather than snapping.
 *
 * Both the tip mesh and the line are updated imperatively inside useFrame.
 * The obvious alternative — holding the line's endpoint in React state — costs
 * a full re-render on every animation frame for every qubit on screen, which
 * on the landing page would run for as long as the section is mounted.
 *
 * The rotation is the motion that explains the physics, so it lerps; under
 * prefers-reduced-motion it snaps instead.
 */
export function BlochVector({ x, y, z, color, stack = 0 }: BlochVectorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lineRef = useRef<Line2>(null);

  const target = useMemo(() => new THREE.Vector3(x, z, -y), [x, y, z]);
  const current = useRef(new THREE.Vector3(0, 1, 0));

  useFrame(() => {
    current.current.lerp(target, prefersReducedMotion ? 1 : LERP_RATE);
    const { x: cx, y: cy, z: cz } = current.current;

    if (groupRef.current) {
      groupRef.current.position.set(cx, cy, cz);
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
        lineWidth={2}
      />
      <group ref={groupRef} position={[x, z, -y]}>
        {stack === 0 ? (
          <mesh>
            <sphereGeometry args={[MARKER_R, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
        ) : (
          <Billboard>
            <mesh>
              <ringGeometry
                args={[
                  MARKER_R + stack * MARKER_STEP - 0.011,
                  MARKER_R + stack * MARKER_STEP,
                  32,
                ]}
              />
              <meshBasicMaterial color={color} side={THREE.DoubleSide} />
            </mesh>
          </Billboard>
        )}
      </group>
    </group>
  );
}

/** The sphere: drawn wireframe, equator, axes and the four basis labels. */
export function SphereWireframe() {
  const meridians = useMemo(
    () => [
      // Three meridians at 60° intervals, rotated about the vertical axis.
      { points: circle('xy'), rotation: [0, 0, 0] as const },
      { points: circle('xy'), rotation: [0, Math.PI / 3, 0] as const },
      { points: circle('xy'), rotation: [0, (2 * Math.PI) / 3, 0] as const },
    ],
    [],
  );

  const parallels = useMemo(() => [parallel(0.5), parallel(-0.5)], []);
  const equator = useMemo(() => circle('xz'), []);

  return (
    <group>
      {/* A barely-there fill so the far side of the wireframe reads as
          "behind glass" rather than tangled with the near side. Warm neutral,
          not the blue tint this replaced. */}
      <mesh>
        <sphereGeometry args={[0.995, 48, 48]} />
        <meshBasicMaterial
          color="#12100D"
          transparent
          opacity={0.55}
          side={THREE.BackSide}
        />
      </mesh>

      {meridians.map((meridian, i) => (
        <group key={`m${i}`} rotation={meridian.rotation as unknown as THREE.Euler}>
          <Line points={meridian.points} color={C_WIRE} lineWidth={1} />
        </group>
      ))}

      {parallels.map((points, i) => (
        <Line key={`p${i}`} points={points} color={C_WIRE} lineWidth={1} />
      ))}

      <Line points={equator} color={C_EQUATOR} lineWidth={1} />

      {/* Axes, extending just past the surface. */}
      <Line points={[[-1.04, 0, 0], [1.04, 0, 0]]} color={C_AXIS} lineWidth={1} />
      <Line points={[[0, -1.04, 0], [0, 1.04, 0]]} color={C_AXIS} lineWidth={1} />
      <Line points={[[0, 0, -1.04], [0, 0, 1.04]]} color={C_AXIS} lineWidth={1} />

      {/* Labels. The computational basis is brighter than the rest: |0⟩ and
          |1⟩ are what a measurement actually returns, and a learner locating
          themselves on the sphere looks for the poles first.

          Set at 1.26 rather than tight to the surface so a full marker stack
          (four concentric rings, reaching 0.159) sitting on a pole cannot
          overlap that pole's label. */}
      <Text position={[0, 1.26, 0]} fontSize={0.13} color={C_LABEL_BASIS} anchorX="center">
        |0&#10217;
      </Text>
      <Text position={[0, -1.26, 0]} fontSize={0.13} color={C_LABEL_BASIS} anchorX="center">
        |1&#10217;
      </Text>
      <Text position={[1.26, 0, 0]} fontSize={0.12} color={C_LABEL_SUPER} anchorX="center">
        |+&#10217;
      </Text>
      <Text position={[-1.26, 0, 0]} fontSize={0.12} color={C_LABEL_SUPER} anchorX="center">
        |&#8722;&#10217;
      </Text>
      <Text position={[0, 0, 1.24]} fontSize={0.1} color={C_LABEL_SUPER} anchorX="center">
        |i&#10217;
      </Text>
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
  // Which qubits share a point, and in what order. Computed from the Bloch
  // coordinates rather than the animated positions, so the marker stack is
  // stable during a transition instead of reshuffling mid-lerp.
  const stacks = useMemo(() => {
    const placed: THREE.Vector3[] = [];

    return (coords ?? []).map((c) => {
      const p = new THREE.Vector3(c.x, c.z, -c.y);
      const stack = placed.reduce(
        (n, q) => (q.distanceTo(p) < COINCIDENT_EPS ? n + 1 : n),
        0,
      );
      placed.push(p);
      return stack;
    });
  }, [coords]);

  return (
    <>
      {/* Flat materials throughout, so no lighting rig is needed beyond a
          fill that keeps the Text components legible. */}
      <ambientLight intensity={1} />

      <SphereWireframe />

      {coords?.map((coord, i) => (
        <BlochVector
          key={coord.qubit}
          x={coord.x}
          y={coord.y}
          z={coord.z}
          color={colors[coord.qubit % colors.length]}
          stack={stacks[i] ?? 0}
        />
      ))}

      {/* Resting |0⟩ state so the sphere is never empty. */}
      {!coords?.length && <BlochVector x={0} y={0} z={1} color={colors[0]} />}

      <OrbitControls
        enableZoom
        enablePan={false}
        // Declared rather than left to the default, so the sphere is centred on
        // the origin by intent and not by whatever the controls happened to
        // initialise to.
        target={[0, 0, 0]}
        minDistance={2.4}
        maxDistance={5}
        autoRotate={autoRotate && !prefersReducedMotion}
        autoRotateSpeed={0.4}
      />
    </>
  );
}
