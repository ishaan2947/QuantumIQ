/**
 * How it works — what the hosted console is, and what the local project is.
 *
 * Replaces the old closing CTA block ("Run the whole thing on your own
 * machine" over a gradient button) and the footer's row of tech-stack chips.
 * Both were decoration standing in for information: "Qiskit · React ·
 * Three.js" tells a reader nothing they can act on, while *which* simulator
 * runs *where*, and what it costs, is the genuinely interesting fact about
 * this project's architecture.
 *
 * Two spec panels rather than a three-column table, so the comparison survives
 * a 375px screen by stacking instead of scrolling sideways.
 */

import { GITHUB_REPO_URL } from '../../config/env';

interface Spec {
  label: string;
  value: string;
}

const IN_THIS_TAB: Spec[] = [
  { label: 'Simulator', value: 'TypeScript statevector' },
  { label: 'Qubits', value: 'up to 4' },
  { label: 'Tutor', value: 'gpt-4o-mini, one call' },
  { label: 'Allowance', value: '5 messages / session' },
  { label: 'Memory', value: 'none' },
  { label: 'Needs', value: 'nothing' },
];

const ON_YOUR_MACHINE: Spec[] = [
  { label: 'Simulator', value: 'Qiskit + Aer' },
  { label: 'Qubits', value: 'up to 5' },
  { label: 'Tutor', value: 'gpt-4o, 6-tool agent loop' },
  { label: 'Allowance', value: 'your key, no cap' },
  { label: 'Memory', value: 'PostgreSQL progress + plan' },
  { label: 'Needs', value: 'Docker + an OpenAI key' },
];

function SpecPanel({
  index,
  title,
  note,
  specs,
  accent,
}: {
  index: string;
  title: string;
  note: string;
  specs: Spec[];
  /** The hosted side is the one running right now, so it carries the accent. */
  accent?: boolean;
}) {
  return (
    <div className="panel flex flex-col">
      <div className="nameplate">
        <div className="flex items-baseline gap-2.5">
          <span
            className={`font-mono text-micro ${accent ? 'text-copper-400' : 'text-ink-faint'}`}
          >
            {index}
          </span>
          <span className="nameplate-label">{title}</span>
        </div>
        {accent && (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-copper-300">
            live
          </span>
        )}
      </div>

      <dl className="divide-y divide-rule">
        {specs.map((spec) => (
          <div key={spec.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              {spec.label}
            </dt>
            <dd
              className={`text-right font-mono text-readout-sm ${
                accent ? 'text-copper-200' : 'text-ink-secondary'
              }`}
            >
              {spec.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-auto border-t border-rule px-4 py-3 text-[11px] leading-relaxed text-ink-tertiary">
        {note}
      </p>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-12 border-t border-rule bg-void">
      <div className="mx-auto max-w-console px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule pb-3">
          <h2 className="font-display text-h3 font-medium text-ink-primary">How it works</h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Two environments, one gate set
          </p>
        </div>

        <p className="mb-7 max-w-prose text-body leading-relaxed text-ink-secondary">
          The console above runs its own statevector simulator in your browser,
          so it is instant, unmetered, and keeps working while the demo backend
          is asleep. Only the tutor is a real model call, and only the tutor is
          capped. The full project swaps the browser simulator for Qiskit and
          the single call for an agent that reads your circuit, tracks what
          you've mastered, and writes challenges against your weak spots.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <SpecPanel
            index="01"
            title="In this tab"
            accent
            specs={IN_THIS_TAB}
            note="No account, no server round trip. Close the tab and nothing is kept."
          />
          <SpecPanel
            index="02"
            title="On your machine"
            specs={ON_YOUR_MACHINE}
            note="One command brings up the API, the database and the frontend together."
          />
        </div>

        {/* The command, printed like a label on the back of the instrument. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule pt-5">
          <code className="readout-well overflow-x-auto whitespace-nowrap px-3 py-2 font-mono text-readout-sm text-ink-secondary">
            <span className="select-none text-copper-500">$ </span>
            git clone {GITHUB_REPO_URL.replace(/^https:\/\//, '')} &amp;&amp; docker compose up
          </code>

          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-quiet"
          >
            Read the setup guide
          </a>
        </div>
      </div>
    </section>
  );
}
