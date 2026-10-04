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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { simulateSteps } from '../lib/quantumSim';
import type { GateName, GateOperation, SimulationResult } from '../types';
import { GATE_BY_KEY, GATE_CATALOG } from '../types';

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
  /**
   * Opens on Superposition rather than the Bell pair.
   *
   * The Bell pair is the more impressive circuit, but it is a bad *opening*
   * state: both qubits are maximally entangled, so both Bloch vectors have
   * length zero and sit at the origin, and the sphere panel greets a first-time
   * visitor looking empty and broken. One Hadamard puts q0 on the equator at
   * |+⟩ and leaves q1 at |0⟩ — two clearly visible vectors, two probability
   * bars, every panel demonstrably alive. The Bell pair is then one click away,
   * and arriving at it *by pressing it* is what makes the vectors visibly
   * collapse, which is the lesson the State panel's annotation promises.
   */
  const OPENING_PRESET = DEMO_PRESETS[0];

  const [gates, setGates] = useState<GateOperation[]>(OPENING_PRESET.gates);
  const [numQubits, setNumQubits] = useState(OPENING_PRESET.numQubits);
  const [armedGate, setArmedGate] = useState<GateName | null>(null);
  const [pendingTargets, setPendingTargets] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(OPENING_PRESET.gates.length);
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * Latest values for the global keydown handler.
   *
   * The handler is bound once for the life of the component rather than
   * re-bound whenever a gate is armed or a step changes — a window listener
   * that detaches and reattaches on every state change is both wasteful and a
   * source of dropped keystrokes. It reads through these refs instead, which
   * are refreshed below on every render.
   */
  const armedGateRef = useRef<GateName | null>(null);
  const numQubitsRef = useRef(numQubits);
  const stepCountRef = useRef(1);
  const armGateRef = useRef<(gate: GateName) => void>(() => {});
  const placeOnQubitRef = useRef<(qubit: number) => void>(() => {});
  const togglePlaybackRef = useRef<() => void>(() => {});

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

  /**
   * Keyboard control for the console.
   *
   * The instrument is meant to be playable without a mouse, so the keypad's
   * engraved shortcuts are real: h/x/y/z/s/t arm a gate, 2 and 3 arm CX and
   * CCX, 0-3 place the armed gate on a wire, arrow keys scrub the transport,
   * space plays, escape cancels a placement in progress.
   *
   * Guarded against firing while the visitor is typing a question to the
   * tutor, which sits in the same section: a global 'h' handler that eats
   * every h typed into a text field would be a genuinely bad bug.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Leave browser and OS shortcuts alone.
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Escape') {
        cancelPlacement();
        return;
      }

      // Scrubbing. Shift jumps to either end of the circuit.
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setIsPlaying(false);
        setCurrentStep((step) => (event.shiftKey ? 0 : Math.max(0, step - 1)));
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setIsPlaying(false);
        setCurrentStep((step) =>
          event.shiftKey ? stepCountRef.current - 1 : Math.min(stepCountRef.current - 1, step + 1),
        );
        return;
      }

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        togglePlaybackRef.current();
        return;
      }

      const lower = event.key.toLowerCase();

      // Digits place the armed gate on a wire. Checked before the gate
      // shortcuts because '2' and '3' mean both things, and placing beats
      // arming while a gate is already waiting for its targets.
      if (armedGateRef.current && /^[0-9]$/.test(lower)) {
        const qubit = Number(lower);
        if (qubit < numQubitsRef.current) {
          event.preventDefault();
          placeOnQubitRef.current(qubit);
          return;
        }
      }

      const gate = GATE_BY_KEY[lower];
      if (gate) {
        event.preventDefault();
        armGateRef.current(gate);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelPlacement]);

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

  armedGateRef.current = armedGate;
  numQubitsRef.current = numQubits;
  stepCountRef.current = steps.length;
  armGateRef.current = armGate;
  placeOnQubitRef.current = placeOnQubit;
  togglePlaybackRef.current = togglePlayback;

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
