/**
 * The Lab's run controls: simulate, step through, save.
 *
 * Unlike the public console — which simulates in the browser on every edit and
 * so needs no run button at all — the Lab's simulation is a Qiskit call on the
 * backend, so running is explicit. The panel says which mode it is in rather
 * than leaving the reader to infer it from whether a slider appeared.
 *
 * The transport is the shared component, so scrubbing a circuit feels the same
 * here as it does on the landing page.
 *
 * Saving lives in the Circuit panel rather than here: it is an operation on the
 * circuit, not on the run, and keeping it here made this panel half again as
 * tall as the keypad beside it, leaving a dead strip of faceplate in the Gates
 * panel.
 */

import { Play, SquareDashedBottomCode } from 'lucide-react';

import Transport from './Transport';
import { useCircuit } from '../../hooks/useCircuit';

export default function SimulationControls() {
  const {
    gates,
    isSimulating,
    isSteppingThrough,
    stepResult,
    simulationResult,
    currentStep,
    runSimulation,
    runStepThrough,
    setCurrentStep,
    playStepThrough,
    stopStepThrough,
  } = useCircuit();
  const empty = gates.length === 0;

  return (
    <div className="flex flex-col">
      <div className="nameplate">
        <span className="nameplate-label">Run</span>
        {/* An honest mode indicator rather than an inferred one. */}
        <span className="font-mono text-readout-sm text-ink-tertiary">
          {isSimulating
            ? 'simulating…'
            : stepResult
              ? 'step mode'
              : simulationResult
                ? 'simulated'
                : 'idle'}
        </span>
      </div>

      <div className="space-y-2.5 px-4 py-4">
        <button
          type="button"
          onClick={runSimulation}
          disabled={empty || isSimulating}
          className="btn-primary w-full"
        >
          <Play className="h-3.5 w-3.5" />
          {isSimulating ? 'Simulating…' : 'Run circuit'}
        </button>

        <button
          type="button"
          onClick={runStepThrough}
          disabled={empty || isSimulating}
          className="btn-control w-full justify-center py-2"
        >
          <SquareDashedBottomCode className="h-3.5 w-3.5" />
          Step through
        </button>

        {empty && (
          <p className="pt-1 font-mono text-[10px] leading-relaxed text-ink-faint">
            Place a gate to enable the simulator
          </p>
        )}
      </div>

      {/* Transport appears only in step mode, where there is something to
          scrub. Hint suppressed: the Lab has no global key handler. */}
      {stepResult && (
        <Transport
          gates={gates}
          currentStep={currentStep}
          stepCount={stepResult.steps.length}
          isPlaying={isSteppingThrough}
          onStep={setCurrentStep}
          onTogglePlay={isSteppingThrough ? stopStepThrough : playStepThrough}
          showHint={false}
        />
      )}

    </div>
  );
}
