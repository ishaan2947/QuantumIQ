/**
 * The top rail.
 *
 * Distinct from components/ui/Navbar, which is the signed-in application
 * chrome and calls useAuth for a user it can assume exists.
 *
 * Starts transparent so the photograph runs edge to edge, then takes on a
 * solid panel background once the page scrolls. 48px tall — a rail on a piece
 * of equipment, not a 64px marketing header. The wordmark is the Hadamard
 * keycap plus letterspaced mono: no gradient, no atom icon.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';

import { GITHUB_REPO_URL } from '../../config/env';
import { useAuth } from '../../hooks/useAuth';

const SECTION_LINKS = [
  { href: '#console', index: '01', label: 'Console' },
  { href: '#how', index: '02', label: 'How it works' },
];

export default function LandingNav() {
  // The landing page is the site root for everyone, so a signed-in visitor
  // arriving here should be pointed back into the app rather than at a login
  // form they don't need.
  const { user } = useAuth();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  // Driven off a motion value rather than a scroll listener in state, so this
  // only re-renders on the two frames where it crosses the threshold.
  useMotionValueEvent(scrollY, 'change', (latest) => {
    const next = latest > 24;
    setScrolled((current) => (current === next ? current : next));
  });

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-state ease-instrument ${
        scrolled ? 'border-rule bg-void/92 backdrop-blur-sm' : 'border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-12 max-w-console items-center gap-6 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex flex-shrink-0 items-center gap-2.5">
          <img src="/mark.svg" alt="" aria-hidden className="h-[18px] w-[18px]" />
          <span className="font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink-primary">
            QuantumIQ
          </span>
        </a>

        <div className="hidden flex-1 items-center gap-6 md:flex">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group flex items-baseline gap-1.5 text-small text-ink-tertiary
                         transition-colors duration-state ease-instrument hover:text-ink-primary"
            >
              <span className="font-mono text-[10px] text-copper-600 transition-colors duration-state group-hover:text-copper-400">
                {link.index}
              </span>
              {link.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-5">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden text-small text-ink-tertiary transition-colors duration-state
                       ease-instrument hover:text-ink-primary sm:block"
          >
            GitHub
          </a>

          <Link
            to={user ? '/dashboard' : '/login'}
            className="border-b border-rule-strong pb-0.5 text-small font-medium text-ink-secondary
                       transition-colors duration-state ease-instrument hover:border-copper-400
                       hover:text-copper-200"
          >
            {user ? 'Dashboard' : 'Sign in'}
          </Link>
        </div>
      </nav>

      {/* A hairline progress-free accent at the rail's left edge, present only
          once the rail is solid — it reads as the instrument's power light
          without being an animated dot. */}
      <motion.span
        aria-hidden
        className="absolute bottom-[-1px] left-0 h-px bg-copper-600"
        animate={{ width: scrolled ? 72 : 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
      />
    </header>
  );
}

const EASE_OUT = [0.2, 0, 0, 1] as const;
