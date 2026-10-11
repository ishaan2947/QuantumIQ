/**
 * Dashboard — what the agent knows about you.
 *
 * The three gradient "quick action" tiles are gone. Two of them were
 * navigation that the rail already provides, and the third was a statistic
 * wearing a tile's clothing. What replaces them is a readout strip of the
 * numbers themselves, and then the actual content: the plan the agent wrote,
 * the mastery it tracked, and the circuits you saved.
 *
 * Mastery bars use the single accent at three weights rather than the old
 * red/amber/green traffic light — a learner at 30% on a concept is not in an
 * error state, and colouring them as though they were is both inaccurate and
 * inaccessible to anyone who can't separate the hues.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import type { ProgressEntry, LearningPlan, Circuit } from '../types';

/** A labelled value in the readout strip. */
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-4 py-3.5">
      <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-tertiary">
        {label}
      </span>
      <span className="mt-1.5 block font-display text-h2 font-medium leading-none text-ink-primary">
        {value}
      </span>
      {sub && <span className="mt-1.5 block text-[11px] text-ink-tertiary">{sub}</span>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prog, planData, circuitData] = await Promise.all([
          api.getProgress(),
          api.getLearningPlan(),
          api.listCircuits(),
        ]);
        setProgress(prog);
        setPlan(planData);
        setCircuits(circuitData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const avgMastery =
    progress.length > 0
      ? progress.reduce((sum, p) => sum + p.mastery_level, 0) / progress.length
      : 0;

  return (
    <div className="min-h-screen bg-void">
      <div className="mx-auto max-w-console px-4 py-10 sm:px-6 lg:px-8">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule pb-4">
          <h1 className="font-display text-h2 font-medium text-ink-primary">
            {user?.username}
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            {user?.skill_level ?? 'beginner'} · {progress.length} concepts tracked
          </p>
        </div>

        {/* ── Readout strip ──────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-panel border border-rule-strong">
          <div className="grid gap-px bg-rule sm:grid-cols-3">
            <div className="bg-panel">
              <Stat
                label="Average mastery"
                value={`${Math.round(avgMastery * 100)}%`}
                sub={progress.length === 0 ? 'nothing practised yet' : 'across tracked concepts'}
              />
            </div>
            <div className="bg-panel">
              <Stat
                label="Circuits saved"
                value={String(circuits.length)}
                sub={circuits.length === 0 ? 'build one in the Lab' : undefined}
              />
            </div>
            <div className="bg-panel">
              <Stat
                label="Current focus"
                value={
                  plan?.current_topic ? plan.current_topic.replace(/_/g, ' ') : '—'
                }
                sub={plan?.current_topic ? 'set by the tutor' : 'ask the tutor for a plan'}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* ── Learning plan ────────────────────────────────────────── */}
          <div className="panel flex flex-col">
            <div className="nameplate">
              <span className="nameplate-label">Learning plan</span>
              {plan?.plan_data?.length ? (
                <span className="font-mono text-readout-sm text-ink-faint">
                  {plan.plan_data.filter((i) => i.completed).length}/{plan.plan_data.length} done
                </span>
              ) : null}
            </div>

            <div className="divide-y divide-rule">
              {(plan?.plan_data || []).map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                      item.completed ? 'bg-copper-400' : 'bg-rule-strong'
                    }`}
                  />
                  <span
                    className={`flex-1 text-small ${
                      item.completed ? 'text-ink-tertiary line-through' : 'text-ink-secondary'
                    }`}
                  >
                    {item.topic.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono text-readout-sm text-ink-faint">
                    {Math.round(item.target_mastery * 100)}%
                  </span>
                </div>
              ))}

              {!isLoading && !plan?.plan_data?.length && (
                <p className="px-4 py-4 text-small leading-relaxed text-ink-tertiary">
                  No plan yet. Ask the tutor in the{' '}
                  <Link to="/lab" className="text-copper-300 underline underline-offset-2">
                    Lab
                  </Link>{' '}
                  what you should learn next and it will write one.
                </p>
              )}

              {isLoading && <LoadingRows rows={4} />}
            </div>
          </div>

          {/* ── Concept mastery ──────────────────────────────────────── */}
          <div className="panel flex flex-col">
            <div className="nameplate">
              <span className="nameplate-label">Concept mastery</span>
            </div>

            <div className="divide-y divide-rule">
              {progress.map((p, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-small text-ink-secondary">
                      {p.concept.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-readout-sm text-ink-tertiary">
                      {Math.round(p.mastery_level * 100)}%
                    </span>
                  </div>
                  {/* One accent, three weights — not a traffic light. */}
                  <div className="h-1.5 w-full overflow-hidden rounded-tight bg-panel-sunk">
                    <div
                      className={`h-full rounded-tight ${
                        p.mastery_level > 0.7
                          ? 'bg-copper-400'
                          : p.mastery_level > 0.4
                            ? 'bg-copper-500'
                            : 'bg-copper-700'
                      }`}
                      style={{
                        width: `${Math.max(p.mastery_level * 100, 1.5)}%`,
                        transition: 'width var(--t-move) var(--ease)',
                      }}
                    />
                  </div>
                  <span className="mt-1 block font-mono text-[10px] text-ink-faint">
                    {p.practice_count} practised · {p.error_count} missed
                  </span>
                </div>
              ))}

              {!isLoading && progress.length === 0 && (
                <p className="px-4 py-4 text-small leading-relaxed text-ink-tertiary">
                  Nothing tracked yet. Mastery is recorded as you build circuits
                  and answer the tutor.
                </p>
              )}

              {isLoading && <LoadingRows rows={4} />}
            </div>
          </div>

          {/* ── Saved circuits ───────────────────────────────────────── */}
          <div className="panel lg:col-span-2">
            <div className="nameplate">
              <span className="nameplate-label">Saved circuits</span>
              <Link
                to="/lab"
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-tertiary hover:text-copper-200"
              >
                Open the Lab
              </Link>
            </div>

            {circuits.length > 0 ? (
              <div className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
                {circuits.slice(0, 6).map((c) => (
                  <div key={c.id} className="bg-panel px-4 py-3">
                    <h3 className="truncate text-small font-medium text-ink-primary">{c.name}</h3>
                    <p className="mt-1 font-mono text-[10px] text-ink-tertiary">
                      {c.circuit_data.length} gates · {c.num_qubits} qubits
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-faint">
                      {new Date(c.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-4 text-small text-ink-tertiary">
                {isLoading ? 'Loading…' : 'No circuits saved yet.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading placeholders shaped like the rows they will become, rather than a
 * centred spinner that resolves into a different layout.
 */
function LoadingRows({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rule-strong" />
          <span className="h-2 flex-1 rounded-tight bg-rule" style={{ maxWidth: `${70 - i * 8}%` }} />
        </div>
      ))}
    </>
  );
}
