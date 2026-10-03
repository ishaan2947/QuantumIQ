/**
 * The circuit diagram itself — wires, time axis, playhead, gates.
 *
 * Presentational and state-source agnostic: the public console drives it from
 * useDemoCircuit, the signed-in Lab from the CircuitProvider context. Both get
 * the identical diagram, which is the point — the demo is a sales pitch for
 * the Lab, and they should not be two different drawings of the same thing.
 *
 * Laid out on a fixed row/column grid rather than by spacing gates as a
 * percentage of the wire's width. Fixed columns keep gate spacing constant as
 * gates are added, give multi-qubit gates a real column to draw their
 * control-to-target connector in, and let the time axis above the wires carry
 * honest tick marks.
 */

import { X } from 'lucide-react';

import { GATE_CATALOG, type GateName, type GateOperation } from '../../types';
import { gateStyle } from '../../lib/gateStyles';

/** Grid geometry in pixels. Mirrors the custom properties in index.css. */
export const ROW_H = 52;
export const COL_W = 52;
export const GUTTER_W = 56;
/** Height of the time-axis strip above the first wire. */
export const AXIS_H = 24;

interface GateCellProps {
  gate: GateOperation;
  index: number;
  /** Dimmed when the playhead has not reached it yet. */
  applied: boolean;
  onRemove?: () => void;
}

function GateCell({ gate, index, applied, onRemove }: GateCellProps) {
  const info = GATE_CATALOG[gate.gate];
  const style = gateStyle(info.family);
  const centre = GUTTER_W + index * COL_W + COL_W / 2;

  // For controlled gates the last target is the one that gets flipped;
  // everything before it is a control.
  const isControlled = info.qubits > 1;
  const targetQubit = gate.targets[gate.targets.length - 1];
  const controls = isControlled ? gate.targets.slice(0, -1) : [];

  const minQubit = Math.min(...gate.targets);
  const maxQubit = Math.max(...gate.targets);

  const label = `${info.name} on ${gate.targets.map((t) => `q${t}`).join(', ')}`;

  return (
    <div
      className="transition-opacity"
      style={{
        opacity: applied ? 1 : 0.28,
        transitionDuration: 'var(--t-move)',
        transitionTimingFunction: 'var(--ease)',
      }}
    >
      {/* Connector joining controls to their target. */}
      {isControlled && (
        <span
          aria-hidden
          className="pointer-events-none absolute w-px bg-copper-500"
          style={{
            left: centre,
            top: AXIS_H + minQubit * ROW_H + ROW_H / 2,
            height: (maxQubit - minQubit) * ROW_H,
          }}
        />
      )}

      {controls.map((qubit) => (
        <span
          key={`control-${qubit}`}
          aria-hidden
          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-copper-400"
          style={{
            left: centre,
            top: AXIS_H + qubit * ROW_H + ROW_H / 2,
          }}
        />
      ))}

      <button
        type="button"
        onClick={onRemove}
        disabled={!onRemove}
        title={onRemove ? `${label} — click to remove` : label}
        aria-label={onRemove ? `Remove ${label}` : label}
        className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 disabled:cursor-default"
        style={{ left: centre, top: AXIS_H + targetQubit * ROW_H + ROW_H / 2 }}
      >
        {isControlled ? (
          // Target of a controlled gate: the conventional crossed circle.
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-copper-500 bg-panel">
            <span aria-hidden className="absolute h-px w-[18px] bg-copper-300" />
            <span aria-hidden className="absolute h-[18px] w-px bg-copper-300" />
          </span>
        ) : (
          <span
            className={`relative flex h-9 w-9 items-center justify-center overflow-hidden border
                        font-mono text-readout font-medium ${style.cell}`}
            style={{ borderRadius: '3px' }}
          >
            {info.symbol}
            {/* Phase gates carry a copper baseline rule — the mark that says
                "this is a rotation about Z". */}
            {style.underline && (
              <span aria-hidden className="absolute inset-x-1 bottom-0 h-px bg-copper-400" />
            )}
          </span>
        )}

        {onRemove && (
          <span
            className="pointer-events-none absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center
                       justify-center rounded-tight bg-signal opacity-0 transition-opacity
                       duration-state ease-instrument group-hover:opacity-100
                       group-focus-visible:opacity-100"
          >
            <X className="h-2.5 w-2.5 text-void" strokeWidth={3} />
          </span>
        )}
      </button>
    </div>
  );
}

export interface CircuitCanvasProps {
  gates: GateOperation[];
  numQubits: number;
  /** Gates applied so far. The playhead sits immediately after this column. */
  currentStep: number;
  /** Gate waiting for wires to be clicked, if any. */
  armedGate?: GateName | null;
  /** Wires already chosen for the armed multi-qubit gate. */
  pendingTargets?: number[];
  /** Qubit indices to tie together as entangled, drawn at the label gutter. */
  entangled?: number[];
  onPlaceOnQubit?: (qubit: number) => void;
  onRemoveGate?: (index: number) => void;
  /** Empty columns kept to the right so a fresh circuit isn't a bare line. */
  minColumns?: number;
}

export default function CircuitCanvas({
  gates,
  numQubits,
  currentStep,
  armedGate = null,
  pendingTargets = [],
  entangled = [],
  onPlaceOnQubit,
  onRemoveGate,
  minColumns = 6,
}: CircuitCanvasProps) {
  const columns = Math.max(gates.length + 1, minColumns);
  const gridWidth = GUTTER_W + columns * COL_W;
  const playheadX = GUTTER_W + currentStep * COL_W;

  // An entangled pair is drawn as a bracket spanning the wires it joins. One
  // bracket for the whole set rather than per pair: entanglement across three
  // qubits is one fact, not three.
  const tieTop = entangled.length > 1 ? Math.min(...entangled) : null;
  const tieBottom = entangled.length > 1 ? Math.max(...entangled) : null;

  return (
    <div className="readout-well overflow-x-auto">
      <div
        className="relative"
        style={{ minWidth: gridWidth, height: AXIS_H + numQubits * ROW_H + 8 }}
      >
        {/* ── Time axis ──────────────────────────────────────────────────
            Honest tick marks, one per time step, numbered from t0. This is
            the thing a static circuit diagram cannot show and the playhead
            reads against. */}
        <div aria-hidden className="absolute inset-x-0 top-0" style={{ height: AXIS_H }}>
          {Array.from({ length: columns }).map((_, i) => {
            const reached = i < currentStep;
            return (
              <span
                key={i}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: GUTTER_W + i * COL_W, width: COL_W }}
              >
                <span
                  className={`font-mono text-[9px] leading-none tracking-wider ${
                    reached ? 'text-copper-300' : 'text-ink-faint'
                  }`}
                >
                  t{i + 1}
                </span>
                <span
                  className={`mt-1 h-1.5 w-px ${reached ? 'bg-copper-500' : 'bg-rule-strong'}`}
                />
              </span>
            );
          })}
        </div>

        {/* ── Playhead ───────────────────────────────────────────────────
            The clock. Sweeps between time steps as the transport advances,
            and is the single piece of substantial motion on the page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute z-20 w-px bg-copper-400"
          style={{
            left: playheadX,
            top: AXIS_H - 6,
            height: numQubits * ROW_H + 6,
            transition: 'left var(--t-move) var(--ease)',
          }}
        >
          <span className="absolute -left-[3px] -top-1 h-2 w-[7px] bg-copper-400" />
        </div>

        {/* ── Entanglement tie ───────────────────────────────────────────
            A copper bracket at the label gutter joining qubits whose state
            no longer factorises. Drawn the moment the state stops being
            separable, so entanglement is visible on the diagram and not only
            in the Bloch readout. */}
        {tieTop !== null && tieBottom !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1 border-y border-l border-copper-600"
            style={{
              top: AXIS_H + tieTop * ROW_H + ROW_H / 2 - 9,
              height: (tieBottom - tieTop) * ROW_H + 18,
              width: 5,
              transition: 'opacity var(--t-move) var(--ease)',
            }}
          />
        )}

        {/* ── Wires ──────────────────────────────────────────────────────
            Each wire is a button when a gate is armed, so placement is one
            click. When nothing is armed it is inert and not focusable, which
            keeps eight dead tab stops out of the keyboard path. */}
        {Array.from({ length: numQubits }).map((_, qubit) => {
          const isPending = pendingTargets.includes(qubit);
          const isTied = entangled.includes(qubit);

          return (
            <button
              key={qubit}
              type="button"
              onClick={() => onPlaceOnQubit?.(qubit)}
              disabled={!armedGate || !onPlaceOnQubit}
              tabIndex={armedGate && onPlaceOnQubit ? 0 : -1}
              aria-label={`Place ${armedGate ? GATE_CATALOG[armedGate].name : 'gate'} on qubit ${qubit}`}
              className={`absolute inset-x-0 flex items-center text-left transition-colors
                          duration-state ease-instrument ${
                            armedGate && onPlaceOnQubit
                              ? 'cursor-pointer hover:bg-copper-900/60'
                              : 'cursor-default'
                          } ${isPending ? 'bg-copper-900' : ''}`}
              style={{ top: AXIS_H + qubit * ROW_H, height: ROW_H }}
            >
              <span
                className={`w-gutter flex-shrink-0 pl-3 font-mono text-readout-sm ${
                  isPending
                    ? 'text-copper-100'
                    : isTied
                      ? 'text-copper-300'
                      : 'text-ink-tertiary'
                }`}
              >
                |q{qubit}⟩
              </span>
              {/* The wire. Copper to the left of the playhead — the part of
                  the circuit that has already run. */}
              <span className="relative h-px flex-1 bg-rule-strong">
                <span
                  className="absolute inset-y-0 left-0 bg-copper-700"
                  style={{
                    width: `${Math.max(0, playheadX - GUTTER_W)}px`,
                    transition: 'width var(--t-move) var(--ease)',
                  }}
                />
              </span>
            </button>
          );
        })}

        {gates.map((gate, index) => (
          <GateCell
            key={`${gate.gate}-${index}-${gate.targets.join('-')}`}
            gate={gate}
            index={index}
            applied={index < currentStep}
            onRemove={onRemoveGate ? () => onRemoveGate(index) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
