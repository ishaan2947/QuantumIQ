/**
 * The console's measurement panel.
 *
 * Panel chrome and the reading annotation; the table itself is the shared
 * MeasurementReadout, so the Lab shows the identical readout.
 */

import MeasurementReadout, {
  MeasurementLegend,
  SHOTS,
} from '../circuit/MeasurementReadout';
import type { SimulationResult } from '../../types';

interface DemoProbabilitiesProps {
  result: SimulationResult;
  numQubits: number;
}

export default function DemoProbabilities({ result, numQubits }: DemoProbabilitiesProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="nameplate">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-micro text-copper-400">03</span>
          <span className="nameplate-label">Measurement</span>
        </div>
        <span className="font-mono text-readout-sm text-ink-faint">{SHOTS} shots</span>
      </div>

      <p className="border-b border-rule px-4 py-2.5 text-small text-ink-secondary">
        Bars are sampled shots. The tick on each bar is the exact probability —
        the gap between them is measurement noise.
      </p>

      <div className="flex-1 px-4 py-3.5">
        <MeasurementReadout
          probabilities={result.probabilities}
          counts={result.measurement_counts}
          numQubits={numQubits}
        />
      </div>

      <div className="border-t border-rule px-4 py-2.5">
        <MeasurementLegend />
      </div>
    </div>
  );
}
