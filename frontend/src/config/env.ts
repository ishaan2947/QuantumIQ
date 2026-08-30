/**
 * Deployment-dependent values, resolved once at build time.
 *
 * Local dev and production reach the backend differently:
 *   - Local: vite.config.ts proxies /api -> http://localhost:8000, so a
 *     relative base works and there's no CORS involved.
 *   - Vercel: static hosting with no proxy, so requests need the absolute
 *     Render origin and the backend must allow this origin via CORS_ORIGINS.
 *
 * Leaving VITE_PUBLIC_API_URL unset gives the relative base, which is what we
 * want locally. Setting it in the Vercel dashboard switches to absolute.
 *
 * Note the name: VITE_API_URL is already taken by docker-compose, where it is
 * the *server-side* proxy target (http://backend:8000, a hostname that only
 * resolves inside the Docker network). Vite exposes every VITE_-prefixed
 * variable to the browser, so reading that one here would point the browser
 * at an unreachable host. This is the browser-facing origin, and separate.
 */

const rawApiUrl = import.meta.env.VITE_PUBLIC_API_URL?.trim() ?? '';

/** Backend origin without a trailing slash, or '' for same-origin/proxied. */
export const API_ORIGIN = rawApiUrl.replace(/\/+$/, '');

/** Prefix for every API call, e.g. '/api' or 'https://api.example.com/api'. */
export const API_BASE = `${API_ORIGIN}/api`;

export const GITHUB_REPO_URL =
  import.meta.env.VITE_GITHUB_REPO_URL?.trim() || 'https://github.com/ishaan2947/QuantumIQ';
