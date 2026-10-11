/**
 * Sign in.
 *
 * Framed as the instrument's access panel: a single bordered faceplate with a
 * nameplate, on the same warm black as everything else. No centred gradient
 * wordmark over an atom icon.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      toast.error('That email and password did not match');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4 py-12">
      <div className="w-full max-w-[26rem]">
        <Link to="/" className="mb-6 flex items-center gap-2.5">
          <img src="/mark.svg" alt="" aria-hidden className="h-[18px] w-[18px]" />
          <span className="font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink-primary">
            QuantumIQ
          </span>
        </Link>

        <form onSubmit={handleSubmit} className="panel">
          <div className="nameplate">
            <span className="nameplate-label">Sign in</span>
          </div>

          <div className="space-y-4 px-4 py-5">
            <div>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                required
              />
            </div>

            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                required
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>

          <p className="border-t border-rule px-4 py-3 text-small text-ink-tertiary">
            No account?{' '}
            <Link to="/register" className="text-copper-300 underline underline-offset-2">
              Create one
            </Link>
            {' · '}
            <Link to="/" className="text-ink-tertiary underline underline-offset-2 hover:text-copper-300">
              Try the console without signing in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
