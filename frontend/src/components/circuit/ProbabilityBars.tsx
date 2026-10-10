/**
 * The Lab's measurement panel.
 *
 * Same readout as the public console — exact probability as a tick against
 * sampled counts as a bar — driven from circuit context instead of props.
 *
 * In step-through mode it reads the current step's result, so the bars
 * redistribute as the playhead advances.
 */

import MeasurementReadout, { MeasurementLegend, SHOTS } from './MeasurementReadout';
import { useCircuit } from '../../hooks/useCircuit';

export default function ProbabilityBars() {
  const { simulationResult, stepResult, currentStep, numQubits } = useCircuit();

  // Step data wins while stepping through; otherwise the full simulation.
  const result = stepResult ? stepResult.steps[currentStep] : simulationResult;

  return (
    <div className="flex h-full flex-col">
      <div className="nameplate">
        <span className="nameplate-label">Measurement</span>
        {result && (
          <span className="font-mono text-readout-sm text-ink-faint">{SHOTS} shots</span>
        )}
      </div>

      {result ? (
        <>
          <div className="flex-1 px-4 py-3.5">
            <MeasurementReadout
              probabilities={result.probabilities}
              counts={result.measurement_counts}
              numQubits={numQubits}
              compact
            />
          </div>
          <div className="border-t border-rule px-4 py-2.5">
            <MeasurementLegend />
          </div>
        </>
      ) : (
        /* An empty state that matches the real layout rather than a line of
           grey text floating in the middle of a box: the table's own columns
           are drawn, with every outcome at zero, so the panel does not change
           shape when the first result lands. */
        <>
          <div className="flex-1 px-4 py-3.5 opacity-40">
            <MeasurementReadout probabilities={{}} numQubits={numQubits} compact />
          </div>
          <p className="border-t border-rule px-4 py-2.5 font-mono text-[10px] text-ink-tertiary">
            Run the circuit to measure
          </p>
        </>
      )}
    </div>
  );
}
