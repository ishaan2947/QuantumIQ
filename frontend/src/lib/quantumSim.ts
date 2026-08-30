/**
 * Browser-side statevector simulator for the public demo.
 *
 * Why not just call /api/simulate like the Lab does: the demo is the first
 * thing a stranger touches, and the backend lives on a Render free instance
 * that spins down after 15 minutes idle. Routing the demo simulator through
 * it would mean a ~50s cold start before the first gate does anything —
 * exactly the wrong first impression. Running it here makes the simulator
 * instant, free, and available even when the backend is asleep or down.
 *
 * The authenticated Lab still uses Qiskit on the backend. This is a
 * deliberately small reimplementation for the demo's gate set only, and it
 * matches Qiskit's conventions exactly so results are directly comparable:
 *
 *   - Little-endian qubit order. Amplitude index i has qubit q in bit q,
 *     so bitstring keys read q(n-1)...q1 q0 — "10" means q1=1, q0=0.
 *   - probabilities omits near-zero entries, the same as
 *     Statevector.probabilities_dict().
 *   - Bloch coordinates come from the single-qubit reduced density matrix:
 *     x = 2*Re(rho01), y = -2*Im(rho01), z = rho00 - rho11.
 */

import type { BlochCoords, GateOperation, SimulationResult } from '../types';

/** Below this, a probability is treated as zero — matches Qiskit's filtering. */
const ZERO_TOLERANCE = 1e-10;

/**
 * A single-qubit gate as a flat 2x2 complex matrix:
 * [a.re, a.im, b.re, b.im, c.re, c.im, d.re, d.im] for [[a, b], [c, d]].
 * Flat arrays avoid allocating complex-number objects inside the hot loop.
 */
type Matrix2 = readonly [number, number, number, number, number, number, number, number];

const RT = Math.SQRT1_2;
const COS_PI_4 = Math.cos(Math.PI / 4);
const SIN_PI_4 = Math.sin(Math.PI / 4);

const SINGLE_QUBIT_GATES: Record<string, Matrix2> = {
  //     a                b                c                d
  h: [RT, 0, RT, 0, RT, 0, -RT, 0],
  x: [0, 0, 1, 0, 1, 0, 0, 0],
  y: [0, 0, 0, -1, 0, 1, 0, 0],
  z: [1, 0, 0, 0, 0, 0, -1, 0],
  s: [1, 0, 0, 0, 0, 0, 0, 1],
  t: [1, 0, 0, 0, 0, 0, COS_PI_4, SIN_PI_4],
};

/** Gates the demo simulator understands, and how many qubits each consumes. */
export const DEMO_GATE_ARITY: Record<string, number> = {
  h: 1,
  x: 1,
  y: 1,
  z: 1,
  s: 1,
  t: 1,
  cx: 2,
  ccx: 3,
};

interface State {
  re: Float64Array;
  im: Float64Array;
  n: number;
}

function initialState(numQubits: number): State {
  const size = 1 << numQubits;
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  re[0] = 1; // |00...0>
  return { re, im, n: numQubits };
}

/**
 * Applies a 2x2 unitary to one qubit, in place.
 *
 * Walks every basis index whose q-th bit is 0 and pairs it with its partner
 * (same index with that bit set). Those two amplitudes are the |0> and |1>
 * components for that qubit, holding all other qubits fixed.
 */
function applySingleQubit(state: State, q: number, m: Matrix2): void {
  const { re, im } = state;
  const size = re.length;
  const bit = 1 << q;
  const [aR, aI, bR, bI, cR, cI, dR, dI] = m;

  for (let i = 0; i < size; i++) {
    if (i & bit) continue; // handled as the partner of i

    const j = i | bit;
    const v0R = re[i];
    const v0I = im[i];
    const v1R = re[j];
    const v1I = im[j];

    re[i] = aR * v0R - aI * v0I + bR * v1R - bI * v1I;
    im[i] = aR * v0I + aI * v0R + bR * v1I + bI * v1R;
    re[j] = cR * v0R - cI * v0I + dR * v1R - dI * v1I;
    im[j] = cR * v0I + cI * v0R + dR * v1I + dI * v1R;
  }
}

/**
 * Applies a NOT to `target` on every basis state where all `controls` are 1.
 * Covers both CX (one control) and CCX (two), since both are just a
 * controlled bit flip.
 */
function applyControlledNot(state: State, controls: number[], target: number): void {
  const { re, im } = state;
  const size = re.length;
  const targetBit = 1 << target;
  let controlMask = 0;
  for (const c of controls) controlMask |= 1 << c;

  for (let i = 0; i < size; i++) {
    // Only visit the half where target=0 so each pair is swapped once.
    if (i & targetBit) continue;
    if ((i & controlMask) !== controlMask) continue;

    const j = i | targetBit;
    const tmpR = re[i];
    const tmpI = im[i];
    re[i] = re[j];
    im[i] = im[j];
    re[j] = tmpR;
    im[j] = tmpI;
  }
}

function applyGate(state: State, op: GateOperation): void {
  const name = op.gate.toLowerCase();
  const targets = op.targets;

  // Silently skip gates that reference qubits outside the register. The demo
  // builder can't produce these, but a circuit loaded from a preset after the
  // qubit count shrank could, and a thrown error there would blank the panel.
  if (targets.some((t) => t < 0 || t >= state.n)) return;
  if (new Set(targets).size !== targets.length) return;

  const single = SINGLE_QUBIT_GATES[name];
  if (single) {
    applySingleQubit(state, targets[0], single);
    return;
  }

  if (name === 'cx' && targets.length >= 2) {
    applyControlledNot(state, [targets[0]], targets[1]);
    return;
  }

  if (name === 'ccx' && targets.length >= 3) {
    applyControlledNot(state, [targets[0], targets[1]], targets[2]);
  }
}

/** Basis-state index -> bitstring, most significant qubit first (Qiskit order). */
function indexToBitstring(index: number, numQubits: number): string {
  let out = '';
  for (let q = numQubits - 1; q >= 0; q--) {
    out += (index >> q) & 1;
  }
  return out;
}

function probabilitiesOf(state: State): Record<string, number> {
  const probs: Record<string, number> = {};

  for (let i = 0; i < state.re.length; i++) {
    const p = state.re[i] * state.re[i] + state.im[i] * state.im[i];
    if (p > ZERO_TOLERANCE) {
      probs[indexToBitstring(i, state.n)] = p;
    }
  }

  return probs;
}

/**
 * Bloch vector per qubit, via the reduced density matrix.
 *
 * For a pure state, tracing out every other qubit reduces to summing over the
 * "rest" indices with qubit q pinned to 0 or 1:
 *   rho00 = sum |psi[q=0]|^2, rho11 = sum |psi[q=1]|^2
 *   rho01 = sum psi[q=0] * conj(psi[q=1])
 *
 * An entangled qubit produces a vector shorter than 1 — it sits inside the
 * sphere rather than on it, which is the visual the Bloch panel is for.
 */
function blochCoordinatesOf(state: State): BlochCoords[] {
  const coords: BlochCoords[] = [];
  const size = state.re.length;

  for (let q = 0; q < state.n; q++) {
    const bit = 1 << q;
    let rho00 = 0;
    let rho11 = 0;
    let rho01Re = 0;
    let rho01Im = 0;

    for (let i = 0; i < size; i++) {
      if (i & bit) continue;

      const j = i | bit;
      const aR = state.re[i];
      const aI = state.im[i];
      const bR = state.re[j];
      const bI = state.im[j];

      rho00 += aR * aR + aI * aI;
      rho11 += bR * bR + bI * bI;

      // a * conj(b)
      rho01Re += aR * bR + aI * bI;
      rho01Im += aI * bR - aR * bI;
    }

    const clamp = (v: number) => Math.min(1, Math.max(-1, v));

    coords.push({
      qubit: q,
      x: clamp(2 * rho01Re),
      y: clamp(-2 * rho01Im),
      z: clamp(rho00 - rho11),
    });
  }

  return coords;
}

/**
 * Samples `shots` measurements from the state, mirroring what the backend
 * gets from AerSimulator. Sampling rather than reporting exact probabilities
 * is the point: it shows learners that a real device returns counts, not
 * amplitudes.
 */
function sampleMeasurements(
  probs: Record<string, number>,
  shots: number,
): Record<string, number> {
  const entries = Object.entries(probs);
  if (entries.length === 0) return {};

  const counts: Record<string, number> = {};

  for (let s = 0; s < shots; s++) {
    let r = Math.random();
    let picked = entries[entries.length - 1][0];

    for (const [bitstring, p] of entries) {
      r -= p;
      if (r <= 0) {
        picked = bitstring;
        break;
      }
    }

    counts[picked] = (counts[picked] ?? 0) + 1;
  }

  return counts;
}

function toResult(state: State, shots: number): SimulationResult {
  const probabilities = probabilitiesOf(state);
  const statevector: [number, number][] = [];

  for (let i = 0; i < state.re.length; i++) {
    statevector.push([state.re[i], state.im[i]]);
  }

  return {
    statevector,
    probabilities,
    bloch_coords: blochCoordinatesOf(state),
    measurement_counts: sampleMeasurements(probabilities, shots),
  };
}

/** Runs a circuit to completion and returns its final state. */
export function simulateCircuit(
  gates: GateOperation[],
  numQubits: number,
  shots = 1024,
): SimulationResult {
  const state = initialState(numQubits);
  for (const gate of gates) applyGate(state, gate);
  return toResult(state, shots);
}

/**
 * Every intermediate state, starting from |00...0> before any gate.
 *
 * Returns gates.length + 1 entries so step 0 is the initial state and step k
 * is the state after k gates — the indexing the step-through scrubber expects.
 * Cheap enough to recompute on every circuit edit at demo sizes (<= 4 qubits,
 * so at most 16 amplitudes per step).
 */
export function simulateSteps(
  gates: GateOperation[],
  numQubits: number,
  shots = 1024,
): SimulationResult[] {
  const state = initialState(numQubits);
  // toResult only reads the state and copies what it needs, so the running
  // state can be mutated in place between snapshots.
  const steps: SimulationResult[] = [toResult(state, shots)];

  for (const gate of gates) {
    applyGate(state, gate);
    steps.push(toResult(state, shots));
  }

  return steps;
}
