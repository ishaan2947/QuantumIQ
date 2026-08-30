/**
 * Client-side bookkeeping for the demo tutor's message allowance.
 *
 * sessionStorage rather than localStorage on purpose: "per session" should
 * mean per browser tab, so a returning visitor gets a fresh five messages
 * rather than being locked out forever by a value written weeks ago.
 *
 * This counter exists for responsiveness, not enforcement — it lets the UI
 * disable the composer the instant the fifth message is sent instead of
 * waiting for a round trip. The backend keeps its own count and is the
 * authority; see backend/app/core/rate_limit.py.
 */

const STORAGE_KEY = 'quantumiq.demo.session';

export interface DemoSessionState {
  id: string;
  used: number;
}

function createId(): string {
  // randomUUID needs a secure context; the fallback keeps the demo working on
  // plain-HTTP local network testing.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function read(): DemoSessionState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<DemoSessionState>;
    if (typeof parsed?.id !== 'string' || typeof parsed?.used !== 'number') return null;

    return { id: parsed.id, used: Math.max(0, parsed.used) };
  } catch {
    // Storage disabled, quota exceeded, or corrupt JSON — fall back to a
    // fresh in-memory session rather than breaking the demo.
    return null;
  }
}

function write(state: DemoSessionState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Non-fatal: the backend still enforces the real limit. */
  }
}

/** Returns the current session, creating and persisting one if needed. */
export function loadDemoSession(): DemoSessionState {
  const existing = read();
  if (existing) return existing;

  const fresh: DemoSessionState = { id: createId(), used: 0 };
  write(fresh);
  return fresh;
}

export function saveDemoUsed(id: string, used: number): void {
  write({ id, used });
}
