/**
 * Footer.
 *
 * Previously this carried a full closing CTA ("Run the whole thing on your own
 * machine" over a gradient button, next to an outlined one) plus seven
 * tech-stack chips. The CTA's job is now done properly by HowItWorks, which
 * answers the question the CTA was asking the reader to take on faith, and the
 * chips said nothing. What remains is what a footer is for: the colophon.
 */

import { Link } from 'react-router-dom';

import { GITHUB_REPO_URL } from '../../config/env';

export default function Footer() {
  return (
    <footer className="border-t border-rule bg-void">
      <div className="mx-auto max-w-console px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 py-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/mark.svg" alt="" aria-hidden className="h-4 w-4" />
            <span className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-ink-secondary">
              QuantumIQ
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-small">
            <a href="#console" className="text-ink-tertiary hover:text-copper-200">
              Console
            </a>
            <a href="#how" className="text-ink-tertiary hover:text-copper-200">
              How it works
            </a>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-ink-tertiary hover:text-copper-200"
            >
              GitHub
            </a>
            <Link to="/register" className="text-ink-tertiary hover:text-copper-200">
              Create an account
            </Link>
          </nav>
        </div>

        <div className="space-y-2 border-t border-rule py-6">
          <p className="max-w-prose text-[11px] leading-relaxed text-ink-tertiary">
            The hosted console is a preview: the simulator runs client-side, and
            the tutor is a single gpt-4o-mini call capped at five messages per
            session. The full project runs the agent loop against gpt-4o with
            Qiskit simulation and persistent progress tracking.
          </p>
          {/* Unsplash doesn't require attribution, but crediting a
              photographer whose work is carrying your opening screen is the
              decent thing to do. */}
          <p className="text-[11px] text-ink-faint">
            Photograph by{' '}
            <a
              href="https://unsplash.com/@planetvolumes"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 hover:text-ink-tertiary"
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
