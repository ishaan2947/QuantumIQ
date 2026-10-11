/**
 * Create an account.
 *
 * Same access panel as the sign-in page. The note at the bottom is honest
 * about what an account is actually for: the browser console needs nothing,
 * and an account is what makes progress persist.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(email, username, password);
      toast.success('Account created');
      navigate('/dashboard');
    } catch {
      toast.error('That email or username is already taken');
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
            <span className="nameplate-label">Create account</span>
          </div>

          <div className="space-y-4 px-4 py-5">
            <div>
              <label className="field-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="field"
                required
              />
            </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                required
                minLength={6}
              />
              <p className="mt-1.5 font-mono text-[10px] text-ink-faint">At least 6 characters</p>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </div>

          <p className="border-t border-rule px-4 py-3 text-small leading-relaxed text-ink-tertiary">
            An account is what makes progress persist — the tutor remembers what
            you've practised between sessions. The{' '}
            <Link to="/" className="text-copper-300 underline underline-offset-2">
              browser console
            </Link>{' '}
            needs no account at all.
          </p>

          <p className="border-t border-rule px-4 py-3 text-small text-ink-tertiary">
            Already have one?{' '}
            <Link to="/login" className="text-copper-300 underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
