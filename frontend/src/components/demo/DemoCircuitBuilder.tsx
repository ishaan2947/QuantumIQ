/**
 * Click-to-place circuit builder for the public demo.
 *
 * Laid out on a fixed row/column grid rather than by spacing gates as a
 * percentage of the wire's width (the approach in the Lab's CircuitGrid).
 * Fixed columns keep gate spacing constant as gates are added, and they give
 * multi-qubit gates a real column to draw their control-to-target connector
 * in, so CNOT and Toffoli read the way they do in a textbook diagram.
 */

import { Eraser, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';

import {
  DEMO_MAX_GATES,
  DEMO_MAX_QUBITS,
  DEMO_MIN_QUBITS,
  DEMO_PRESETS,
  type DemoCircuit,
} from '../../hooks/useDemoCircuit';
import { GATE_CATALOG, type GateName, type GateOperation } from '../../types';

/** Grid geometry, in pixels. Shared by the wires and the gate overlay. */
const ROW_HEIGHT = 52;
const COLUMN_WIDTH = 52;
const LABEL_WIDTH = 56;
/** Empty columns kept to the right so a fresh circuit isn't a bare line. */
const MIN_COLUMNS = 5;

const PALETTE: GateName[] = ['h', 'x', 'y', 'z', 's', 't', 'cx', 'ccx'];

function GateColumn({
  gate,
  index,
  onRemove,
}: {
  gate: GateOperation;
  index: number;
  onRemove: () => void;
}) {
  const info = GATE_CATALOG[gate.gate];
  const left = LABEL_WIDTH + index * COLUMN_WIDTH;
  const centre = left + COLUMN_WIDTH / 2;

  // For controlled gates the last target is the one that gets flipped;
  // everything before it is a control.
  const isControlled = info.qubits > 1;
  const targetQubit = gate.targets[gate.targets.length - 1];
  const controls = isControlled ? gate.targets.slice(0, -1) : [];

  const minQubit = Math.min(...gate.targets);
  const maxQubit = Math.max(...gate.targets);

  return (
    <>
      {/* Vertical connector joining controls to their target. */}
      {isControlled && (
        <span
          aria-hidden
          className="pointer-events-none absolute w-px"
          style={{
            left: centre,
            top: minQubit * ROW_HEIGHT + ROW_HEIGHT / 2,
            height: (maxQubit - minQubit) * ROW_HEIGHT,
            backgroundColor: `${info.color}99`,
          }}
        />
      )}

      {controls.map((qubit) => (
        <span
          key={`control-${qubit}`}
          aria-hidden
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: centre,
            top: qubit * ROW_HEIGHT + ROW_HEIGHT / 2,
            backgroundColor: info.color,
            boxShadow: `0 0 8px ${info.color}80`,
          }}
        />
      ))}

      <button
        type="button"
        onClick={onRemove}
        title={`${info.name} on ${gate.targets.map((t) => `q${t}`).join(', ')} — click to remove`}
        aria-label={`Remove ${info.name} on qubit ${gate.targets.join(' and ')}`}
        className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 outline-none focus-visible:ring-2 focus-visible:ring-glow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
        style={{ left: centre, top: targetQubit * ROW_HEIGHT + ROW_HEIGHT / 2 }}
      >
        {isControlled ? (
          // Target of a controlled gate: the conventional crossed circle.
          <span
            className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform duration-200 group-hover:scale-110"
            style={{ borderColor: info.color, backgroundColor: `${info.color}1f` }}
          >
            <span aria-hidden className="absolute h-[2px] w-3.5" style={{ backgroundColor: info.color }} />
            <span aria-hidden className="absolute h-3.5 w-[2px]" style={{ backgroundColor: info.color }} />
          </span>
        ) : (
          <span
            className="quantum-notation flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold transition-transform duration-200 group-hover:scale-110"
            style={{
              borderColor: `${info.color}66`,
              backgroundColor: `${info.color}26`,
              color: info.color,
              boxShadow: `0 0 12px -4px ${info.color}`,
            }}
          >
            {info.symbol}
          </span>
        )}

        {/* Remove affordance, revealed on hover. */}
        <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <X className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        </span>
      </button>
    </>
  );
}

export default function DemoCircuitBuilder({ circuit }: { circuit: DemoCircuit }) {
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

  const columns = Math.max(gates.length + 1, MIN_COLUMNS);
  const gridWidth = LABEL_WIDTH + columns * COLUMN_WIDTH;

  // currentStep is a count of gates applied, so the gate *being* applied at
  // this step is the one before it.
  const activeGate = currentStep > 0 ? gates[currentStep - 1] : null;

  return (
    <div className="edge-highlight relative overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-900/70 backdrop-blur-sm">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700/60 px-5 py-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
          Circuit
        </h3>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Qubits</span>
            <div className="flex overflow-hidden rounded-lg border border-ink-700">
              {Array.from(
                { length: DEMO_MAX_QUBITS - DEMO_MIN_QUBITS + 1 },
                (_, i) => DEMO_MIN_QUBITS + i,
              ).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => changeQubits(n)}
                  aria-pressed={numQubits === n}
                  className={`px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-glow-300 ${
                    numQubits === n
                      ? 'bg-glow-400/15 text-glow-200'
                      : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={clear}
            disabled={gates.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 outline-none hover:bg-white/5 hover:text-red-300 focus-visible:ring-1 focus-visible:ring-glow-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500"
          >
            <Eraser className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* ── Presets ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-700/40 px-5 py-3">
        <span className="text-xs text-gray-500">Try:</span>
        {DEMO_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => loadPreset(preset)}
            title={preset.blurb}
            className="rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-1.5 text-xs font-medium text-gray-300 outline-none transition-colors hover:border-glow-400/40 hover:bg-glow-400/[0.07] hover:text-glow-200 focus-visible:ring-1 focus-visible:ring-glow-300"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* ── Gate palette ─────────────────────────────────────────── */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {PALETTE.map((name) => {
            const info = GATE_CATALOG[name];
            const tooWide = info.qubits > numQubits;
            const disabled = tooWide || isFull;
            const armed = armedGate === name;

            return (
              <button
                key={name}
                type="button"
                onClick={() => armGate(name)}
                disabled={disabled}
                title={
                  tooWide
                    ? `${info.name} needs ${info.qubits} qubits`
                    : isFull
                      ? `Demo circuits are capped at ${DEMO_MAX_GATES} gates`
                      : `${info.name} — ${info.description}`
                }
                className={`quantum-notation flex h-11 items-center justify-center rounded-lg border text-sm font-bold outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-glow-300 ${
                  disabled ? 'cursor-not-allowed opacity-30' : 'hover:-translate-y-0.5'
                }`}
                style={{
                  borderColor: armed ? info.color : `${info.color}40`,
                  backgroundColor: armed ? `${info.color}33` : `${info.color}12`,
                  color: info.color,
                  boxShadow: armed ? `0 0 18px -4px ${info.color}` : undefined,
                }}
              >
                {info.symbol}
              </button>
            );
          })}
        </div>

        {/* Placement prompt, which doubles as the cancel affordance. */}
        <div className="mt-3 flex min-h-[1.75rem] items-center">
          {placementHint ? (
            <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-glow-400/25 bg-glow-400/[0.07] px-3 py-1.5">
              <span className="text-xs font-medium text-glow-200">{placementHint}</span>
              <button
                type="button"
                onClick={cancelPlacement}
                className="rounded px-1.5 py-0.5 text-[11px] text-gray-400 outline-none hover:text-gray-200 focus-visible:ring-1 focus-visible:ring-glow-300"
              >
                Esc to cancel
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-600">
              {isFull
                ? `Circuit is full (${DEMO_MAX_GATES} gates). Remove one to keep building.`
                : 'Pick a gate, then click a qubit wire to place it.'}
            </p>
          )}
        </div>
      </div>

      {/* ── Wires ────────────────────────────────────────────────── */}
      <div className="overflow-x-auto px-5 pb-2">
        <div
          className="relative"
          style={{ minWidth: gridWidth, height: numQubits * ROW_HEIGHT }}
        >
          {Array.from({ length: numQubits }).map((_, qubit) => {
            const isPending = pendingTargets.includes(qubit);

            return (
              <button
                key={qubit}
                type="button"
                onClick={() => placeOnQubit(qubit)}
                disabled={!armedGate}
                aria-label={`Place gate on qubit ${qubit}`}
                className={`absolute inset-x-0 flex items-center rounded-lg outline-none transition-colors focus-visible:ring-1 focus-visible:ring-glow-300 ${
                  armedGate
                    ? 'cursor-pointer hover:bg-glow-400/[0.06]'
                    : 'cursor-default'
                } ${isPending ? 'bg-glow-400/[0.09]' : ''}`}
                style={{ top: qubit * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                <span
                  className={`quantum-notation w-14 flex-shrink-0 text-left text-xs ${
                    isPending ? 'text-glow-200' : 'text-quantum-300'
                  }`}
                >
                  |q{qubit}⟩
                </span>
                <span
                  className={`h-px flex-1 ${
                    armedGate ? 'bg-glow-400/40' : 'bg-ink-600'
                  }`}
                />
              </button>
            );
          })}

          {gates.map((gate, index) => (
            <div
              key={`${gate.gate}-${index}-${gate.targets.join('-')}`}
              // Gates beyond the current step are dimmed so the scrubber
              // reads as "how far through the circuit am I".
              className={`transition-opacity duration-300 ${
                index < currentStep ? 'opacity-100' : 'opacity-25'
              }`}
            >
              <GateColumn gate={gate} index={index} onRemove={() => removeGate(index)} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Step-through ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border-t border-ink-700/60 px-5 py-3.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            aria-label="Previous step"
            className="rounded-lg p-1.5 text-gray-400 outline-none hover:bg-white/5 hover:text-gray-100 focus-visible:ring-1 focus-visible:ring-glow-300 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={togglePlayback}
            disabled={gates.length === 0}
            aria-label={isPlaying ? 'Pause playback' : 'Play circuit step by step'}
            className="rounded-lg border border-glow-400/30 bg-glow-400/10 p-1.5 text-glow-200 outline-none hover:bg-glow-400/20 focus-visible:ring-1 focus-visible:ring-glow-300 disabled:opacity-30"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep >= steps.length - 1}
            aria-label="Next step"
            className="rounded-lg p-1.5 text-gray-400 outline-none hover:bg-white/5 hover:text-gray-100 focus-visible:ring-1 focus-visible:ring-glow-300 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(0, steps.length - 1)}
          value={currentStep}
          onChange={(event) => setStep(Number(event.target.value))}
          disabled={gates.length === 0}
          aria-label="Circuit step"
          className="h-1 min-w-[6rem] flex-1 cursor-pointer appearance-none rounded-full bg-ink-600 accent-glow-400 disabled:opacity-40"
        />

        <span className="quantum-notation min-w-[7.5rem] text-right text-xs text-gray-500">
          {gates.length === 0
            ? 'empty circuit'
            : activeGate
              ? `${GATE_CATALOG[activeGate.gate].symbol}(${activeGate.targets
                  .map((t) => `q${t}`)
                  .join(',')}) · ${currentStep}/${gates.length}`
              : `initial · 0/${gates.length}`}
        </span>
      </div>
    </div>
  );
}
