/**
 * The measurement table: exact probability against sampled counts.
 *
 * The signature detail of this interface. The **bar** is the sampled result
 * from 1,024 shots — what a real device would hand back — and the **tick** on
 * it is the exact probability the statevector predicts. The gap between the
 * two is shot noise, made visible rather than described. Seeing a perfect
 * 50/50 come back as 497/527 is the whole lesson, and no amount of prose
 * teaches it as fast as a tick sitting a few pixels off the end of a bar.
 *
 * Every basis state is listed, including the zero-probability ones (Qiskit's
 * probabilities_dict omits them), so rows never reflow as gates are added —
 * they stay put and only widths change, which is what makes one basis state
 * trackable across a whole playback.
 *
 * Marked up as a real table: this is tabular data, and a screen reader should
 * get the row and column relationship rather than a pile of divs.
 */

export const SHOTS = 1024;

function allBasisStates(numQubits: number): string[] {
  return Array.from({ length: 1 << numQubits }, (_, i) =>
    i.toString(2).padStart(numQubits, '0'),
  );
}

interface MeasurementReadoutProps {
  probabilities: Record<string, number>;
  counts?: Record<string, number>;
  numQubits: number;
  /** Hides the shots column where the panel is too narrow for four columns. */
  compact?: boolean;
}

export default function MeasurementReadout({
  probabilities,
  counts = {},
  numQubits,
  compact = false,
}: MeasurementReadoutProps) {
  const states = allBasisStates(numQubits);
  const hasCounts = Object.keys(counts).length > 0;

  return (
    <table className="w-full border-collapse">
      <caption className="sr-only">
        Measurement outcomes: exact probability and sampled counts for each basis state
      </caption>
      <thead>
        <tr className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
          <th scope="col" className="w-14 pb-2 text-left font-medium">
            State
          </th>
          <th scope="col" className="pb-2 text-left font-medium">
            {hasCounts ? 'Sampled' : 'Probability'}
          </th>
          {/* With no sampled counts the bar already *is* the exact
              probability, so this column is its unit rather than a second
              quantity to compare against. */}
          <th scope="col" className="w-14 pb-2 text-right font-medium">
            {hasCounts ? 'Exact' : '%'}
          </th>
          {hasCounts && !compact && (
            <th scope="col" className="hidden w-12 pb-2 text-right font-medium sm:table-cell">
              Shots
            </th>
          )}
        </tr>
      </thead>
      <tbody className="motion-keep">
        {states.map((state) => {
          const probability = probabilities[state] ?? 0;
          const count = counts[state] ?? 0;
          const exactPercent = probability * 100;
          // With no sampled data the bar shows the exact value instead, so the
          // panel reads correctly either way.
          const barPercent = hasCounts ? (count / SHOTS) * 100 : exactPercent;
          const live = probability > 0.001 || count > 0;

          return (
            <tr key={state}>
              <th
                scope="row"
                className={`py-1 pr-2 text-left font-mono text-readout-sm font-normal ${
                  live ? 'text-copper-200' : 'text-ink-faint'
                }`}
              >
                |{state}⟩
              </th>

              <td className="py-1">
                <div className="relative h-4 w-full overflow-hidden rounded-tight bg-panel-sunk">
                  {/* Flat copper, no gradient. */}
                  <div
                    className="h-full rounded-tight bg-copper-500"
                    style={{
                      width: `${barPercent}%`,
                      transition: 'width var(--t-move) var(--ease)',
                    }}
                  />
                  {/* The exact probability, as a bright hairline at the
                      position theory predicts. Drawn only when there are
                      sampled counts to compare it against, and only above
                      zero, so empty rows stay genuinely empty. */}
                  {hasCounts && probability > 0.001 && (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 w-px bg-copper-100"
                      style={{
                        left: `calc(${exactPercent}% - 0.5px)`,
                        transition: 'left var(--t-move) var(--ease)',
                      }}
                    />
                  )}
                </div>
              </td>

              <td
                className={`py-1 pl-2 text-right font-mono text-readout-sm ${
                  live ? 'text-ink-primary' : 'text-ink-faint'
                }`}
              >
                {exactPercent.toFixed(1)}%
              </td>

              {hasCounts && !compact && (
                <td
                  className={`hidden py-1 pl-2 text-right font-mono text-readout-sm sm:table-cell ${
                    live ? 'text-ink-tertiary' : 'text-ink-faint'
                  }`}
                >
                  {count}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Legend for the bar and the tick, so neither is ever a mystery mark. */
export function MeasurementLegend() {
  return (
    <div className="flex items-center gap-4">
      <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-tertiary">
        <span aria-hidden className="h-2 w-4 rounded-tight bg-copper-500" />
        sampled
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-tertiary">
        <span aria-hidden className="h-3 w-px bg-copper-100" />
        exact
      </span>
    </div>
  );
}
