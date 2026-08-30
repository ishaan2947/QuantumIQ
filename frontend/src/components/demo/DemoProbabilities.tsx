/**
 * Measurement outcome panel for the public demo.
 *
 * Shows the two things a learner needs to hold side by side: the exact
 * probability the statevector predicts, and the sampled counts a real device
 * would actually hand back after 1024 shots. Seeing 512/512 come back as
 * 497/527 is the point.
 *
 * Every basis state is listed, including the zero-probability ones, so bars
 * don't reflow as gates are added — the rows stay put and only their widths
 * change, which is much easier to follow during step-through playback.
 */

import { motion } from 'framer-motion';

import type { SimulationResult } from '../../types';

const SHOTS = 1024;

function allBasisStates(numQubits: number): string[] {
  return Array.from({ length: 1 << numQubits }, (_, i) =>
    i.toString(2).padStart(numQubits, '0'),
  );
}

interface DemoProbabilitiesProps {
  result: SimulationResult;
  numQubits: number;
}

export default function DemoProbabilities({ result, numQubits }: DemoProbabilitiesProps) {
  const states = allBasisStates(numQubits);
  const counts = result.measurement_counts ?? {};

  return (
    <div className="edge-highlight relative overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-900/70 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
          Measurement
        </h3>
        <span className="text-[11px] text-gray-600">{SHOTS} shots</span>
      </div>

      <div className="space-y-2.5 px-5 py-4">
        {states.map((state) => {
          const probability = result.probabilities[state] ?? 0;
          const count = counts[state] ?? 0;
          const percent = probability * 100;

          return (
            <div key={state} className="flex items-center gap-3">
              <span
                className={`quantum-notation w-14 flex-shrink-0 text-right text-xs ${
                  probability > 0.001 ? 'text-glow-200' : 'text-gray-700'
                }`}
              >
                |{state}⟩
              </span>

              <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-ink-950/80">
                <motion.div
                  className="h-full rounded-md bg-gradient-to-r from-quantum-500 to-glow-400"
                  initial={false}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  style={{ boxShadow: percent > 0 ? '0 0 14px -4px #22d3ee' : undefined }}
                />
              </div>

              <span
                className={`quantum-notation w-12 flex-shrink-0 text-right text-[11px] ${
                  probability > 0.001 ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                {percent.toFixed(1)}%
              </span>

              <span
                className={`quantum-notation hidden w-14 flex-shrink-0 text-right text-[11px] sm:block ${
                  count > 0 ? 'text-gray-500' : 'text-gray-700'
                }`}
                title="Sampled measurement counts"
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <p className="border-t border-ink-700/60 px-5 py-3 text-[11px] leading-relaxed text-gray-600">
        Exact probabilities on the left, sampled counts on the right — the gap
        between them is measurement noise, the same thing you'd see on real
        hardware.
      </p>
    </div>
  );
}
