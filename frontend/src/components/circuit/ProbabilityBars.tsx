/**
 * Probability bar chart — shows measurement probabilities for each basis state.
 *
 * Animates smoothly between simulation states during step-through mode
 * using CSS transitions. Each bar represents the probability of measuring
 * a particular bitstring (e.g., |00⟩ = 50%, |11⟩ = 50% for a Bell state).
 */

import { useCircuit } from '../../hooks/useCircuit';

export default function ProbabilityBars() {
  const { simulationResult, stepResult, currentStep } = useCircuit();

  // Use step result if in step-through mode, otherwise use full simulation
  const result = stepResult ? stepResult.steps[currentStep] : simulationResult;

  if (!result) {
    return (
      <div className="bg-[#12122a] rounded-xl border border-[#1a1a3e] p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Probabilities</h3>
        <p className="text-gray-600 text-sm text-center py-8">Run a simulation to see probabilities</p>
      </div>
    );
  }

  const probs = result.probabilities;
  const maxProb = Math.max(...Object.values(probs), 0.01);

  // Sort by bitstring for consistent display
  const sortedEntries = Object.entries(probs).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="bg-[#12122a] rounded-xl border border-[#1a1a3e] p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Probabilities</h3>

      <div className="space-y-2">
        {sortedEntries.map(([state, prob]) => (
          <div key={state} className="flex items-center gap-2">
            <span className="quantum-notation text-xs text-quantum-300 w-12 text-right">
              |{state}⟩
            </span>
            <div className="flex-1 bg-[#0a0a1a] rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
                style={{
                  width: `${Math.max((prob / maxProb) * 100, 2)}%`,
                  backgroundColor: prob > 0.5 ? '#5c7cfa' : prob > 0.1 ? '#748ffc' : '#91a7ff',
                }}
              >
                {prob > 0.05 && (
                  <span className="text-[10px] font-mono text-white font-bold">
                    {(prob * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            {prob <= 0.05 && (
              <span className="text-[10px] text-gray-600 w-10">{(prob * 100).toFixed(1)}%</span>
            )}
          </div>
        ))}
      </div>

      {/* Measurement counts */}
      {result.measurement_counts && (
        <div className="mt-4 pt-3 border-t border-[#1a1a3e]">
          <h4 className="text-xs text-gray-500 mb-2">Measurement Samples (1024 shots)</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.measurement_counts)
              .sort(([, a], [, b]) => b - a)
              .map(([state, count]) => (
                <span key={state} className="quantum-notation text-xs bg-[#0a0a1a] px-2 py-1 rounded text-gray-300">
                  |{state}⟩: {count}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
