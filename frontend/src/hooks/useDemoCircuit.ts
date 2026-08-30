/**
 * Circuit state for the public demo.
 *
 * Separate from useCircuit (the CircuitProvider used by the signed-in Lab)
 * for two reasons: that one talks to the backend for every simulation, and it
 * is a React context expecting a provider high in the tree. The demo needs
 * neither — it simulates in the browser and lives inside one section — so
 * this is a plain hook called once by DemoSection and passed down as props.
 *
 * Gate placement is click-to-place rather than drag-and-drop. The Lab's
 * drag-and-drop uses window.prompt() to collect target qubits for multi-qubit
 * gates, which is fine behind a login but would be a jarring first impression
 * on a landing page, and drag-and-drop doesn't work on touch at all.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { simulateSteps } from '../lib/quantumSim';
import type { GateName, GateOperation, SimulationResult } from '../types';
import { GATE_CATALOG } from '../types';

/** Small enough to stay instant and readable; 4 qubits is 16 basis states. */
export const DEMO_MIN_QUBITS = 2;
export const DEMO_MAX_QUBITS = 4;

/** Keeps the circuit diagram legible and the step scrubber a sane length. */
export const DEMO_MAX_GATES = 12;

export interface DemoPreset {
  id: string;
  name: string;
  blurb: string;
  numQubits: number;
  gates: GateOperation[];
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'superposition',
    name: 'Superposition',
    blurb: 'One Hadamard, two equally likely outcomes',
    numQubits: 2,
    gates: [{ gate: 'h', targets: [0] }],
  },
  {
    id: 'bell',
    name: 'Bell Pair',
    blurb: 'Entanglement: both qubits collapse to the centre',
    numQubits: 2,
    gates: [
      { gate: 'h', targets: [0] },
      { gate: 'cx', targets: [0, 1] },
    ],
  },
  {
    id: 'ghz',
    name: 'GHZ State',
    blurb: 'Three-qubit entanglement, |000> or |111>',
    numQubits: 3,
    gates: [
      { gate: 'h', targets: [0] },
      { gate: 'cx', targets: [0, 1] },
      { gate: 'cx', targets: [1, 2] },
    ],
  },
];

/** Milliseconds per gate during step-through playback. */
const PLAYBACK_INTERVAL = 900;

export interface DemoCircuit {
  gates: GateOperation[];
  numQubits: number;

  /** State after every prefix of the circuit; index 0 is |00...0>. */
  steps: SimulationResult[];
  currentStep: number;
  result: SimulationResult;

  /** Gate armed in the palette, waiting for wires to be clicked. */
  armedGate: GateName | null;
  /** Qubits already picked for the armed multi-qubit gate. */
  pendingTargets: number[];
  /** What to ask the visitor for next, or null when nothing is armed. */
  placementHint: string | null;

  isPlaying: boolean;
  isFull: boolean;

  armGate: (gate: GateName) => void;
  cancelPlacement: () => void;
  placeOnQubit: (qubit: number) => void;
  removeGate: (index: number) => void;
  clear: () => void;
  changeQubits: (n: number) => void;
  loadPreset: (preset: DemoPreset) => void;
  setStep: (step: number) => void;
  togglePlayback: () => void;
}

export function useDemoCircuit(): DemoCircuit {
  const [gates, setGates] = useState<GateOperation[]>(DEMO_PRESETS[1].gates);
  const [numQubits, setNumQubits] = useState(DEMO_PRESETS[1].numQubits);
  const [armedGate, setArmedGate] = useState<GateName | null>(null);
  const [pendingTargets, setPendingTargets] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(DEMO_PRESETS[1].gates.length);
  const [isPlaying, setIsPlaying] = useState(false);

  // Cheap enough to recompute on every edit: at most 12 gates over 16
  // amplitudes. Memoised only to keep the sampled measurement counts stable
  // between unrelated re-renders, which would otherwise reshuffle the bars.
  const steps = useMemo(() => simulateSteps(gates, numQubits), [gates, numQubits]);

  // Any structural edit should show the finished circuit, not leave the
  // scrubber parked mid-way through a circuit that no longer exists.
  const gateCount = gates.length;
  useEffect(() => {
    setCurrentStep(gateCount);
    setIsPlaying(false);
  }, [gateCount, numQubits]);

  // Playback advances one step per timeout rather than running an interval,
  // so the stop condition lives in the effect body and the state updater
  // stays pure — a setState call inside another setState's updater fires
  // twice under StrictMode.
  useEffect(() => {
    if (!isPlaying) return;

    if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => setCurrentStep((step) => step + 1), PLAYBACK_INTERVAL);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps.length]);

  const cancelPlacement = useCallback(() => {
    setArmedGate(null);
    setPendingTargets([]);
  }, []);

  // Escape cancels an in-progress placement — expected of any modal-ish
  // interaction, and the only way out for keyboard users.
  useEffect(() => {
    if (!armedGate) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelPlacement();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [armedGate, cancelPlacement]);

  const isFull = gates.length >= DEMO_MAX_GATES;

  const armGate = useCallback(
    (gate: GateName) => {
      setPendingTargets([]);
      // Clicking the armed gate again disarms it.
      setArmedGate((current) => (current === gate ? null : gate));
    },
    [],
  );

  const placeOnQubit = useCallback(
    (qubit: number) => {
      if (!armedGate) return;

      const arity = GATE_CATALOG[armedGate].qubits;

      // A gate can't target the same wire twice — ignore the click rather
      // than resetting, so a misclick doesn't lose the qubits already chosen.
      if (pendingTargets.includes(qubit)) return;

      const targets = [...pendingTargets, qubit];

      if (targets.length < arity) {
        setPendingTargets(targets);
        return;
      }

      setGates((current) =>
        current.length >= DEMO_MAX_GATES
          ? current
          : [...current, { gate: armedGate, targets, step: current.length }],
      );
      setArmedGate(null);
      setPendingTargets([]);
    },
    [armedGate, pendingTargets],
  );

  const removeGate = useCallback((index: number) => {
    setGates((current) => current.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => {
    setGates([]);
    cancelPlacement();
  }, [cancelPlacement]);

  const changeQubits = useCallback(
    (n: number) => {
      const next = Math.min(DEMO_MAX_QUBITS, Math.max(DEMO_MIN_QUBITS, n));
      setNumQubits(next);
      // Drop gates that pointed at wires which no longer exist, rather than
      // silently skipping them at simulation time.
      setGates((current) => current.filter((g) => g.targets.every((t) => t < next)));
      cancelPlacement();
    },
    [cancelPlacement],
  );

  const loadPreset = useCallback(
    (preset: DemoPreset) => {
      setNumQubits(preset.numQubits);
      setGates(preset.gates.map((g, i) => ({ ...g, step: i })));
      cancelPlacement();
    },
    [cancelPlacement],
  );

  const setStep = useCallback((step: number) => {
    setIsPlaying(false);
    setCurrentStep(step);
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    // Nothing to play through on an empty circuit.
    if (steps.length <= 1) return;

    // Pressing play while parked at the end should replay from |00...0>,
    // otherwise it would render one frame and immediately stop.
    if (currentStep >= steps.length - 1) setCurrentStep(0);
    setIsPlaying(true);
  }, [isPlaying, currentStep, steps.length]);

  const placementHint = useMemo(() => {
    if (!armedGate) return null;

    const info = GATE_CATALOG[armedGate];
    const remaining = info.qubits - pendingTargets.length;

    if (info.qubits === 1) return `Click a qubit wire to place ${info.symbol}`;
    if (info.qubits === 2) {
      return pendingTargets.length === 0
        ? `${info.symbol}: click the control qubit`
        : `${info.symbol}: click the target qubit`;
    }

    if (pendingTargets.length === 0) return `${info.symbol}: click the first control qubit`;
    if (pendingTargets.length === 1) return `${info.symbol}: click the second control qubit`;
    return `${info.symbol}: click the target qubit (${remaining} left)`;
  }, [armedGate, pendingTargets]);

  const safeStep = Math.min(currentStep, steps.length - 1);

  return {
    gates,
    numQubits,
    steps,
    currentStep: safeStep,
    result: steps[safeStep],
    armedGate,
    pendingTargets,
    placementHint,
    isPlaying,
    isFull,
    armGate,
    cancelPlacement,
    placeOnQubit,
    removeGate,
    clear,
    changeQubits,
    loadPreset,
    setStep,
    togglePlayback,
  };
}
