/**
 * The signed-in application rail.
 *
 * Deliberately the same 48px rail as the landing page's, with the same
 * wordmark and the same numbered section links — signing in should feel like
 * getting more of the instrument, not like arriving at a different product.
 * The active route is marked with a copper underline on the rail's bottom edge
 * rather than a filled tab, because a filled tab is the only thing on this
 * page that would read as a button and not be one.
 */

import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';

const NAV_LINKS = [
  { path: '/dashboard', index: '01', label: 'Dashboard' },
  { path: '/lab', index: '02', label: 'Lab' },
  { path: '/challenges', index: '03', label: 'Challenges' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-void/92 backdrop-blur-sm">
      <nav className="mx-auto flex h-12 max-w-[100rem] items-center gap-6 px-4 sm:px-6">
        <Link to="/dashboard" className="flex flex-shrink-0 items-center gap-2.5">
          <img src="/mark.svg" alt="" aria-hidden className="h-[18px] w-[18px]" />
          <span className="font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink-primary">
            QuantumIQ
          </span>
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto sm:gap-5">
          {NAV_LINKS.map(({ path, index, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-baseline gap-1.5 whitespace-nowrap px-2 py-3.5
                            text-small transition-colors duration-state ease-instrument sm:px-0 ${
                              active
                                ? 'text-ink-primary'
                                : 'text-ink-tertiary hover:text-ink-primary'
                            }`}
              >
                <span
                  className={`font-mono text-[10px] transition-colors duration-state ${
                    active ? 'text-copper-400' : 'text-copper-600 group-hover:text-copper-400'
                  }`}
                >
                  {index}
                </span>
                {label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-[-1px] h-px bg-copper-400"
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <span className="hidden font-mono text-readout-sm text-ink-tertiary sm:inline">
            {user?.username}
          </span>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="text-ink-tertiary transition-colors duration-state ease-instrument hover:text-signal"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>
    </header>
  );
}
