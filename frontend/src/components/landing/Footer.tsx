/**
 * Landing page footer — closing call to action plus the honest technical
 * footnote about what the hosted demo is and isn't.
 */

import { Link } from 'react-router-dom';
import { Atom, ArrowRight, Github } from 'lucide-react';

import Reveal from './Reveal';
import { GITHUB_REPO_URL } from '../../config/env';

const STACK = ['FastAPI', 'Qiskit', 'React', 'TypeScript', 'Three.js', 'Tailwind', 'OpenAI'];

export default function Footer() {
  return (
    <footer className="relative border-t border-ink-700/40 bg-ink-950">
      <div aria-hidden className="bg-lab-grid absolute inset-0 opacity-40" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(80% 90% at 50% 0%, transparent 10%, #0a0a1a 80%)' }}
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        {/* ── Closing CTA ──────────────────────────────────────────── */}
        <Reveal className="border-b border-ink-700/40 py-20 text-center">
          <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Run the whole thing{' '}
            <span className="text-gradient-quantum">on your own machine</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-gray-400">
            Clone the repo, add an OpenAI key, and you get the full agent — tool
            calling, progress tracking, generated challenges — with no message limit.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-glow-400 to-quantum-500 px-6 py-3 text-sm font-semibold text-ink-950 shadow-glow-md outline-none transition-shadow hover:shadow-glow-lg focus-visible:ring-2 focus-visible:ring-glow-300"
            >
              <Github className="h-4 w-4" />
              Clone the repo
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-gray-200 outline-none hover:border-glow-400/40 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-glow-300"
            >
              Create an account
            </Link>
          </div>
        </Reveal>

        {/* ── Meta ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Atom className="h-5 w-5 text-glow-400" />
            <span className="text-gradient-quantum text-base font-bold">QuantumIQ</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {STACK.map((item) => (
              <span
                key={item}
                className="rounded-md border border-ink-700/70 bg-ink-800/50 px-2 py-1 text-[11px] text-gray-500"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-ink-700/30 py-6">
          <p className="text-[11px] leading-relaxed text-gray-600">
            The hosted demo is a preview: the simulator runs client-side, and the tutor
            is a single gpt-4o-mini call capped at five messages per session. The full
            project runs the agent loop against gpt-4o with Qiskit simulation and
            persistent progress tracking.
          </p>
          {/* Unsplash doesn't require attribution, but crediting a photographer
              whose work is carrying your hero is the decent thing to do. */}
          <p className="text-[11px] text-gray-700">
            Hero photograph by{' '}
            <a
              href="https://unsplash.com/@planetvolumes"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 hover:text-gray-500"
            >
              Planet Volumes
            </a>{' '}
            on Unsplash.
          </p>
        </div>
      </div>
    </footer>
  );
}
