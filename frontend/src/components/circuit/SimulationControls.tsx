/**
 * Simulation controls — run, step-through, play/pause, save circuit.
 */

import { useState } from 'react';
import { useCircuit } from '../../hooks/useCircuit';
import { api } from '../../services/api';
import { Play, SkipForward, Pause, Save, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SimulationControls() {
  const {
    gates, numQubits, isSimulating, isSteppingThrough, stepResult, currentStep,
    runSimulation, runStepThrough, setCurrentStep, playStepThrough, stopStepThrough,
  } = useCircuit();
  const [circuitName, setCircuitName] = useState('My Circuit');

  const handleSave = async () => {
    try {
      const circuit = await api.saveCircuit(circuitName, gates, numQubits);
      toast.success(`Saved! Share link: ${window.location.origin}/share/${circuit.share_token}`);
    } catch {
      toast.error('Failed to save circuit');
    }
  };

  return (
    <div className="bg-[#12122a] rounded-xl border border-[#1a1a3e] p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Controls</h3>

      <div className="space-y-3">
        {/* Run simulation */}
        <button
          onClick={runSimulation}
          disabled={gates.length === 0 || isSimulating}
          className="w-full flex items-center justify-center gap-2 bg-quantum-600 hover:bg-quantum-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          <Play className="w-4 h-4" />
          {isSimulating ? 'Simulating...' : 'Run Circuit'}
        </button>

        {/* Step-through mode */}
        <div className="flex gap-2">
          <button
            onClick={runStepThrough}
            disabled={gates.length === 0 || isSimulating}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600/20 border border-purple-500/30 hover:border-purple-400/50 text-purple-300 font-medium py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            <SkipForward className="w-4 h-4" />
            Step Mode
          </button>

          {stepResult && (
            <button
              onClick={isSteppingThrough ? stopStepThrough : playStepThrough}
              className="flex items-center justify-center gap-2 px-4 bg-emerald-600/20 border border-emerald-500/30 hover:border-emerald-400/50 text-emerald-300 font-medium py-2 rounded-lg transition-colors"
            >
              {isSteppingThrough ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Step slider */}
        {stepResult && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Step {currentStep} / {stepResult.steps.length - 1}</span>
              <span>{currentStep === 0 ? 'Initial |0⟩' : `After ${gates[currentStep - 1]?.gate.toUpperCase()}`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={stepResult.steps.length - 1}
              value={currentStep}
              onChange={e => setCurrentStep(parseInt(e.target.value))}
              className="w-full accent-quantum-500"
            />
          </div>
        )}

        {/* Save */}
        <div className="flex gap-2">
          <input
            type="text"
            value={circuitName}
            onChange={e => setCircuitName(e.target.value)}
            className="flex-1 bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg px-3 py-2 text-sm text-white"
            placeholder="Circuit name"
          />
          <button
            onClick={handleSave}
            disabled={gates.length === 0}
            className="flex items-center gap-1 px-3 py-2 bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg text-sm text-gray-300 hover:text-white hover:border-quantum-500 transition-colors disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
