/**
 * The transport — the control that moves the playhead through the circuit.
 *
 * This is the surviving idea from the "scroll is time" concept (DESIGN.md §1):
 * a circuit diagram shows the gates but cannot show the state moving through
 * them, and the transport is the mechanism that makes that visible. Operated
 * deliberately rather than bound to scroll position, so it stays reachable
 * from the keyboard and does not fight the page.
 *
 * Arrow keys scrub and space plays; the hint strip says so, because an
 * instrument that can be played by keyboard should admit it.
 */

import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';

import { GATE_CATALOG, type GateOperation } from '../../types';

interface TransportProps {
  gates: GateOperation[];
  currentStep: number;
  /** Total positions, i.e. gates + 1 (the initial state counts). */
  stepCount: number;
  isPlaying: boolean;
  onStep: (step: number) => void;
  onTogglePlay: () => void;
  /** Shows the keyboard hint. Off inside the Lab, which has its own chrome. */
  showHint?: boolean;
}

export default function Transport({
  gates,
  currentStep,
  stepCount,
  isPlaying,
  onStep,
  onTogglePlay,
  showHint = true,
}: TransportProps) {
  const empty = gates.length === 0;
  // currentStep counts gates applied, so the gate *being* applied at this
  // position is the one before it.
  const activeGate = currentStep > 0 ? gates[currentStep - 1] : null;

  const readout = empty
    ? 'no gates'
    : activeGate
      ? `${GATE_CATALOG[activeGate.gate].symbol}(${activeGate.targets
          .map((t) => `q${t}`)
          .join(',')})`
      : 'initial state';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule bg-panel-raised px-4 py-2.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          aria-label="Previous step"
          className="btn-control px-2"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          disabled={empty}
          aria-label={isPlaying ? 'Pause playback' : 'Play the circuit step by step'}
          className={`btn-control px-2 ${
            isPlaying ? 'border-copper-400 bg-copper-900 text-copper-200' : ''
          }`}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => onStep(Math.min(stepCount - 1, currentStep + 1))}
          disabled={currentStep >= stepCount - 1}
          aria-label="Next step"
          className="btn-control px-2"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
      </div>

      <input
        type="range"
        className="transport min-w-[6rem] flex-1"
        min={0}
        max={Math.max(0, stepCount - 1)}
        value={currentStep}
        onChange={(event) => onStep(Number(event.target.value))}
        disabled={empty}
        aria-label="Circuit step"
        aria-valuetext={
          empty ? 'no gates' : `step ${currentStep} of ${gates.length}, ${readout}`
        }
      />

      {/* Tabular numerals, so the counter does not shift width mid-playback. */}
      <span className="flex items-baseline gap-2 font-mono text-readout-sm">
        <span className="text-copper-300">
          t{currentStep}
        </span>
        <span className="text-ink-tertiary">{readout}</span>
        <span className="text-ink-faint">
          {currentStep}/{gates.length}
        </span>
      </span>

      {showHint && (
        <span className="hidden w-full font-mono text-[10px] text-ink-faint lg:block">
          ←/→ step · shift+←/→ jump to either end · space play
        </span>
      )}
    </div>
  );
}
