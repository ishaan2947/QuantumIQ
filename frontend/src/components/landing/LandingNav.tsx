/**
 * Public top bar for the landing page.
 *
 * Distinct from components/ui/Navbar, which is the signed-in application
 * chrome and calls useAuth — it can't render for a logged-out stranger.
 *
 * Starts transparent so the hero photograph runs edge to edge, then fades in
 * a frosted background once the page scrolls, which keeps the links legible
 * over the paler sections below.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Atom, Github } from 'lucide-react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';

import { GITHUB_REPO_URL } from '../../config/env';
import { useAuth } from '../../hooks/useAuth';

const SECTION_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#demo', label: 'Live Demo' },
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
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled
          ? 'border-ink-700/70 bg-ink-950/80 backdrop-blur-md'
          : 'border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a href="#top" className="flex items-center gap-2.5 text-lg font-bold outline-none">
          <Atom className="h-6 w-6 text-glow-400" />
          <span className="text-gradient-quantum">QuantumIQ</span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 outline-none hover:bg-white/5 hover:text-gray-100 focus-visible:ring-2 focus-visible:ring-glow-400/50"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="QuantumIQ on GitHub"
            className="rounded-lg p-2.5 text-gray-400 outline-none hover:bg-white/5 hover:text-gray-100 focus-visible:ring-2 focus-visible:ring-glow-400/50"
          >
            <Github className="h-[18px] w-[18px]" />
          </a>

          <Link
            to={user ? '/dashboard' : '/login'}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-200 outline-none hover:border-glow-400/40 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-glow-400/50"
          >
            {user ? 'Dashboard' : 'Sign in'}
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
