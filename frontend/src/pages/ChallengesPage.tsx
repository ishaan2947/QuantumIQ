/**
 * Challenges page — browse presets, attempt challenges, view history.
 *
 * Challenges are the structured learning component: each one tests specific
 * quantum concepts and feeds results back to the agent's progress tracking.
 */

import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { api } from '../services/api';
import type { PresetChallenge, ChallengeHistory as ChallengeHistoryType } from '../types';
import { useCircuit } from '../hooks/useCircuit';
import CircuitGrid from '../components/circuit/CircuitGrid';
import GatePalette from '../components/circuit/GatePalette';
import BlochSphere from '../components/bloch/BlochSphere';
import SimulationControls from '../components/circuit/SimulationControls';
import { Trophy, Play, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChallengesPage() {
  const [presets, setPresets] = useState<Record<string, PresetChallenge>>({});
  const [history, setHistory] = useState<ChallengeHistoryType[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeHistoryType | null>(null);
  const { gates, numQubits, loadCircuit } = useCircuit();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [presetsData, historyData] = await Promise.all([
          api.getPresets(),
          api.getChallengeHistory(),
        ]);
        setPresets(presetsData);
        setHistory(historyData);
      } catch (err) {
        console.error('Failed to load challenges:', err);
      }
    };
    fetchData();
  }, []);

  const startChallenge = async (key: string) => {
    try {
      const challenge = await api.startChallenge(key);
      setActiveChallenge(challenge);
      loadCircuit([], presets[key].num_qubits);
      toast.success(`Challenge started: ${challenge.challenge_name}`);
    } catch {
      toast.error('Failed to start challenge');
    }
  };

  const submitChallenge = async () => {
    if (!activeChallenge) return;
    try {
      const result = await api.submitChallenge(activeChallenge.id, gates);
      setActiveChallenge(result);
      setHistory(prev => [result, ...prev.filter(h => h.id !== result.id)]);

      if (result.completed) {
        toast.success(`Challenge completed! Score: ${Math.round((result.score || 0) * 100)}%`);
      } else {
        toast.error(`Score: ${Math.round((result.score || 0) * 100)}% — need 90% to pass. Keep trying!`);
      }
    } catch {
      toast.error('Failed to submit');
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-[calc(100vh-57px)] bg-[#0a0a1a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-7 h-7 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Quantum Challenges</h1>
          </div>

          {/* Active challenge */}
          {activeChallenge && (
            <div className="mb-6 bg-purple-600/10 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{activeChallenge.challenge_name}</h2>
                  <p className="text-sm text-gray-400 mt-1">{activeChallenge.description}</p>
                </div>
                <button
                  onClick={submitChallenge}
                  disabled={gates.length === 0}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Submit Solution
                </button>
              </div>

              {activeChallenge.score !== null && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  activeChallenge.completed
                    ? 'bg-emerald-400/10 text-emerald-300'
                    : 'bg-red-400/10 text-red-300'
                }`}>
                  {activeChallenge.completed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Score: {Math.round((activeChallenge.score || 0) * 100)}%
                </div>
              )}

              {/* Circuit builder for the challenge */}
              <div className="grid grid-cols-12 gap-4 mt-4">
                <div className="col-span-2">
                  <GatePalette />
                </div>
                <div className="col-span-6">
                  <CircuitGrid />
                </div>
                <div className="col-span-4 space-y-4">
                  <SimulationControls />
                  <BlochSphere />
                </div>
              </div>
            </div>
          )}

          {/* Preset challenges grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {Object.entries(presets).map(([key, challenge]) => (
              <div
                key={key}
                className="bg-[#12122a] rounded-xl border border-[#1a1a3e] p-5 hover:border-purple-500/30 transition-colors"
              >
                <h3 className="text-base font-semibold text-white mb-2">{challenge.name}</h3>
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{challenge.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {challenge.concepts.map(c => (
                    <span key={c} className="text-[10px] bg-quantum-600/20 text-quantum-300 px-2 py-0.5 rounded-full">
                      {c.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{challenge.num_qubits} qubits</span>
                  <button
                    onClick={() => startChallenge(key)}
                    className="flex items-center gap-1 text-sm text-purple-300 hover:text-purple-200 font-medium"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Challenge history */}
          {history.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Challenge History</h2>
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="bg-[#12122a] rounded-lg border border-[#1a1a3e] px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {h.completed ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <div>
                        <span className="text-sm text-white">{h.challenge_name}</span>
                        <span className="text-xs text-gray-600 ml-2">
                          {h.challenge_type === 'generated' ? '(AI generated)' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {h.score !== null && (
                        <span className={`text-sm font-mono ${h.completed ? 'text-emerald-300' : 'text-gray-400'}`}>
                          {Math.round((h.score || 0) * 100)}%
                        </span>
                      )}
                      <span className="text-xs text-gray-600">
                        {new Date(h.started_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}
