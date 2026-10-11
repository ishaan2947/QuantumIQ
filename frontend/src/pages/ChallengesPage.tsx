/**
 * Challenges — browse presets, attempt one, review history.
 *
 * Each challenge tests specific concepts and feeds its result back into the
 * agent's progress tracking, which is why the history shows the score rather
 * than just a tick: the number is what the tutor reads.
 *
 * The active challenge opens the instrument inline — keypad, circuit, state —
 * rather than sending the user to the Lab and back, so the brief stays on
 * screen while they build against it.
 */

import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Check, Play, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '../services/api';
import type { PresetChallenge, ChallengeHistory as ChallengeHistoryType } from '../types';
import { useCircuit } from '../hooks/useCircuit';
import CircuitGrid from '../components/circuit/CircuitGrid';
import GatePalette from '../components/circuit/GatePalette';
import BlochSphere from '../components/bloch/BlochSphere';
import SimulationControls from '../components/circuit/SimulationControls';

export default function ChallengesPage() {
  const [presets, setPresets] = useState<Record<string, PresetChallenge>>({});
  const [history, setHistory] = useState<ChallengeHistoryType[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeHistoryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { gates, loadCircuit } = useCircuit();

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
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const startChallenge = async (key: string) => {
    try {
      const challenge = await api.startChallenge(key);
      setActiveChallenge(challenge);
      loadCircuit([], presets[key].num_qubits);
      toast.success(`Started: ${challenge.challenge_name}`);
    } catch {
      toast.error('Could not start the challenge');
    }
  };

  const submitChallenge = async () => {
    if (!activeChallenge) return;
    try {
      const result = await api.submitChallenge(activeChallenge.id, gates);
      setActiveChallenge(result);
      setHistory((prev) => [result, ...prev.filter((h) => h.id !== result.id)]);

      if (result.completed) {
        toast.success(`Passed — ${Math.round((result.score || 0) * 100)}%`);
      } else {
        toast.error(`${Math.round((result.score || 0) * 100)}% — 90% needed to pass`);
      }
    } catch {
      toast.error('Could not submit');
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-void">
        <div className="mx-auto max-w-console px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule pb-4">
            <h1 className="font-display text-h2 font-medium text-ink-primary">Challenges</h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              {Object.keys(presets).length} presets · 90% to pass
            </p>
          </div>

          {/* ── Active challenge ─────────────────────────────────────── */}
          {activeChallenge && (
            <div className="mb-4 overflow-hidden rounded-panel border border-copper-600">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule bg-panel-raised px-4 py-3">
                <div className="min-w-0">
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-copper-300">
                    In progress
                  </span>
                  <h2 className="mt-1 font-display text-h3 font-medium text-ink-primary">
                    {activeChallenge.challenge_name}
                  </h2>
                  {activeChallenge.description && (
                    <p className="mt-1 max-w-prose text-small leading-relaxed text-ink-secondary">
                      {activeChallenge.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {activeChallenge.score !== null && (
                    <span
                      className={`flex items-center gap-1.5 font-mono text-readout ${
                        activeChallenge.completed ? 'text-copper-200' : 'text-signal'
                      }`}
                    >
                      {activeChallenge.completed ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      {Math.round((activeChallenge.score || 0) * 100)}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={submitChallenge}
                    disabled={gates.length === 0}
                    className="btn-primary"
                  >
                    Submit solution
                  </button>
                </div>
              </div>

              <div className="grid min-w-0 gap-px bg-rule lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="grid min-w-0 gap-px bg-rule">
                  <div className="min-w-0 bg-panel">
                    <GatePalette />
                  </div>
                  <div className="min-w-0 bg-panel">
                    <CircuitGrid />
                  </div>
                </div>
                <div className="grid min-w-0 gap-px bg-rule">
                  <div className="min-w-0 bg-panel">
                    <SimulationControls />
                  </div>
                  <div className="min-w-0 bg-panel">
                    <BlochSphere />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Presets ──────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-panel border border-rule-strong">
            <div className="grid gap-px bg-rule md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(presets).map(([key, challenge]) => (
                <div key={key} className="flex flex-col bg-panel px-4 py-4">
                  <h3 className="font-display text-h3 font-medium text-ink-primary">
                    {challenge.name}
                  </h3>
                  <p className="mt-1.5 flex-1 text-small leading-relaxed text-ink-secondary">
                    {challenge.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                    {challenge.concepts.map((c) => (
                      <span
                        key={c}
                        className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-tertiary"
                      >
                        {c.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-rule pt-3">
                    <span className="font-mono text-readout-sm text-ink-faint">
                      {challenge.num_qubits} qubits
                    </span>
                    <button
                      type="button"
                      onClick={() => startChallenge(key)}
                      className="btn-control"
                    >
                      <Play className="h-3 w-3" />
                      Start
                    </button>
                  </div>
                </div>
              ))}

              {!isLoading && Object.keys(presets).length === 0 && (
                <p className="bg-panel px-4 py-5 text-small text-ink-tertiary">
                  Could not load the challenge list — check that the API is running.
                </p>
              )}

              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-panel px-4 py-4">
                    <span className="block h-3 w-1/2 rounded-tight bg-rule" />
                    <span className="mt-3 block h-2 w-full rounded-tight bg-rule" />
                    <span className="mt-2 block h-2 w-4/5 rounded-tight bg-rule" />
                  </div>
                ))}
            </div>
          </div>

          {/* ── History ──────────────────────────────────────────────── */}
          {history.length > 0 && (
            <div className="panel mt-4">
              <div className="nameplate">
                <span className="nameplate-label">History</span>
                <span className="font-mono text-readout-sm text-ink-faint">
                  {history.filter((h) => h.completed).length}/{history.length} passed
                </span>
              </div>

              <div className="divide-y divide-rule">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5"
                  >
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                        h.completed ? 'bg-copper-400' : 'bg-signal-dim'
                      }`}
                    />
                    <span className="text-small text-ink-secondary">{h.challenge_name}</span>
                    {h.challenge_type === 'generated' && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                        agent-written
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-4">
                      {h.score !== null && (
                        <span
                          className={`font-mono text-readout-sm ${
                            h.completed ? 'text-copper-200' : 'text-ink-tertiary'
                          }`}
                        >
                          {Math.round((h.score || 0) * 100)}%
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-ink-faint">
                        {new Date(h.started_at).toLocaleDateString()}
                      </span>
                    </span>
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
