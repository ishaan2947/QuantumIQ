/**
 * The console's circuit panel: program selector, keypad, diagram, transport.
 *
 * Gate placement is click-to-place (or key-to-place) rather than
 * drag-and-drop: the Lab's drag interaction doesn't work on touch at all, and
 * this is the first thing a stranger's thumb touches.
 *
 * The diagram, keypad and transport are the shared components in
 * components/circuit, so the demo and the signed-in Lab are the same
 * instrument rather than two drawings of one.
 */

import { Eraser } from 'lucide-react';

import CircuitCanvas from '../circuit/CircuitCanvas';
import GateKeypad from '../circuit/GateKeypad';
import Transport from '../circuit/Transport';
import {
  DEMO_MAX_GATES,
  DEMO_MAX_QUBITS,
  DEMO_MIN_QUBITS,
  DEMO_PRESETS,
  type DemoCircuit,
  type DemoPreset,
} from '../../hooks/useDemoCircuit';
import type { GateOperation } from '../../types';

const QUBIT_OPTIONS = Array.from(
  { length: DEMO_MAX_QUBITS - DEMO_MIN_QUBITS + 1 },
  (_, i) => DEMO_MIN_QUBITS + i,
);

/** Identity of a circuit, for matching the loaded program against a preset. */
function signature(gates: GateOperation[], numQubits: number): string {
  return `${numQubits}:${gates.map((g) => `${g.gate}.${g.targets.join('-')}`).join('|')}`;
}

/**
 * A segmented control — the instrument's selector switch.
 *
 * Used for both the program bank and the qubit count: one bordered group with
 * hairline-divided segments, the selected one filled copper. Square, no pills.
 */
function Selector<T>({
  label,
  options,
  isActive,
  onSelect,
  getKey,
  getLabel,
  getTitle,
}: {
  label: string;
  options: T[];
  isActive: (option: T) => boolean;
  onSelect: (option: T) => void;
  getKey: (option: T) => string;
  getLabel: (option: T) => string;
  getTitle?: (option: T) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </span>
      <div className="flex divide-x divide-rule overflow-hidden rounded-panel border border-rule-strong">
        {options.map((option) => {
          const active = isActive(option);
          return (
            <button
              key={getKey(option)}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={active}
              title={getTitle?.(option)}
              className={`px-2.5 py-1 font-mono text-readout-sm transition-colors duration-state
                          ease-instrument ${
                            active
                              ? 'bg-copper-400 text-void'
                              : 'bg-panel-raised text-ink-tertiary hover:bg-copper-900 hover:text-copper-200'
                          }`}
            >
              {getLabel(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DemoCircuitBuilderProps {
  circuit: DemoCircuit;
  /** Qubits whose reduced state is mixed — drawn as a tie on the diagram. */
  entangled: number[];
}

export default function DemoCircuitBuilder({ circuit, entangled }: DemoCircuitBuilderProps) {
  const {
    gates,
    numQubits,
    steps,
    currentStep,
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
  } = circuit;

  const current = signature(gates, numQubits);

  return (
    <div className="flex h-full flex-col">
      {/* ── Nameplate ──────────────────────────────────────────────────── */}
      <div className="nameplate">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-micro text-copper-400">01</span>
          <span className="nameplate-label">Circuit</span>
        </div>
        <button
          type="button"
          onClick={clear}
          disabled={gates.length === 0}
          className="btn-control hover:border-signal hover:bg-signal/10 hover:text-signal"
        >
          <Eraser className="h-3 w-3" />
          Clear
        </button>
      </div>

      {/* The annotation that replaces a feature card: how to read the panel,
          not what it does for you. */}
      <p className="border-b border-rule px-4 py-2.5 text-small text-ink-secondary">
        Each row is a qubit, each column a time step. The copper playhead marks
        how far through the circuit the state has been evolved.
      </p>

      {/* ── Program + qubits ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-rule px-4 py-3">
        <Selector<DemoPreset>
          label="Program"
          options={DEMO_PRESETS}
          isActive={(preset) => signature(preset.gates, preset.numQubits) === current}
          onSelect={loadPreset}
          getKey={(preset) => preset.id}
          getLabel={(preset) => preset.name}
          getTitle={(preset) => preset.blurb}
        />

        <Selector<number>
          label="Qubits"
          options={QUBIT_OPTIONS}
          isActive={(n) => numQubits === n}
          onSelect={changeQubits}
          getKey={(n) => String(n)}
          getLabel={(n) => String(n)}
        />
      </div>

      {/* ── Keypad ─────────────────────────────────────────────────────── */}
      <div className="border-b border-rule px-4 py-4">
        <GateKeypad
          armedGate={armedGate}
          onArm={armGate}
          numQubits={numQubits}
          isFull={isFull}
          maxGates={DEMO_MAX_GATES}
        />

        {/* Placement prompt, which doubles as the cancel affordance. Fixed
            height so arming a gate doesn't shift the diagram below it. */}
        <div className="mt-3.5 flex min-h-[1.875rem] items-center">
          {placementHint ? (
            <div className="flex w-full items-center justify-between gap-3 rounded-panel border border-copper-600 bg-copper-900 px-3 py-1.5">
              <span className="font-mono text-readout-sm text-copper-100">{placementHint}</span>
              <button
                type="button"
                onClick={cancelPlacement}
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-tertiary hover:text-copper-200"
              >
                Esc
              </button>
            </div>
          ) : (
            <p className="font-mono text-[10px] text-ink-faint">
              {isFull
                ? `Circuit is full at ${DEMO_MAX_GATES} gates — remove one to keep building`
                : 'Press a gate key or click one, then pick a wire'}
            </p>
          )}
        </div>
      </div>

      {/* ── Diagram ────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4">
        <CircuitCanvas
          gates={gates}
          numQubits={numQubits}
          currentStep={currentStep}
          armedGate={armedGate}
          pendingTargets={pendingTargets}
          entangled={entangled}
          onPlaceOnQubit={placeOnQubit}
          onRemoveGate={removeGate}
        />
      </div>

      {/* ── Transport ──────────────────────────────────────────────────── */}
      <Transport
        gates={gates}
        currentStep={currentStep}
        stepCount={steps.length}
        isPlaying={isPlaying}
        onStep={setStep}
        onTogglePlay={togglePlayback}
      />
    </div>
  );
}
