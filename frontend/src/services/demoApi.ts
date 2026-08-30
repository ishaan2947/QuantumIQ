/**
 * HTTP client for the public demo endpoints.
 *
 * Uses fetch directly rather than the shared axios instance in api.ts, which
 * attaches a JWT and redirects to /login on any 401. The demo is anonymous by
 * definition, and a stray auth redirect from a landing page a stranger is
 * reading would be a bad bug to ship.
 */

import { API_BASE, GITHUB_REPO_URL } from '../config/env';
import type { GateOperation } from '../types';

export interface DemoChatResult {
  response: string;
  messages_used: number;
  messages_remaining: number;
  limit: number;
}

export interface DemoStatus {
  enabled: boolean;
  messages_used: number;
  messages_remaining: number;
  limit: number;
  repo_url: string;
}

/**
 * Which limit the backend rejected on. 'session' is the friendly
 * five-message cap; the rest indicate abuse protection or an outage, and the
 * UI phrases them differently.
 */
export type DemoLimitType =
  | 'session'
  | 'burst'
  | 'ip'
  | 'global'
  | 'upstream'
  | 'disabled'
  | 'unconfigured';

export class DemoLimitError extends Error {
  constructor(
    message: string,
    readonly limitType: DemoLimitType,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'DemoLimitError';
  }
}

/** Anything else: network failure, cold start timeout, 5xx. */
export class DemoRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoRequestError';
  }
}

interface ErrorPayload {
  detail?: { message?: string; limit_type?: DemoLimitType } | string;
}

async function readError(response: Response): Promise<{ message: string; limitType?: DemoLimitType }> {
  try {
    const body = (await response.json()) as ErrorPayload;

    if (typeof body.detail === 'string') return { message: body.detail };
    if (body.detail?.message) {
      return { message: body.detail.message, limitType: body.detail.limit_type };
    }
  } catch {
    /* Non-JSON error body (a proxy error page, say) — fall through. */
  }

  return { message: `Request failed (${response.status}).` };
}

export async function sendDemoMessage(params: {
  message: string;
  sessionId: string;
  circuit: GateOperation[];
  numQubits: number;
  history: Array<{ role: string; content: string }>;
  signal?: AbortSignal;
}): Promise<DemoChatResult> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/demo/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: params.signal,
      body: JSON.stringify({
        message: params.message,
        session_id: params.sessionId,
        circuit_data: params.circuit,
        num_qubits: params.numQubits,
        history: params.history,
      }),
    });
  } catch {
    throw new DemoRequestError(
      "Couldn't reach the tutor. The demo backend sleeps when idle — give it a moment and try again.",
    );
  }

  if (response.status === 429 || response.status === 503) {
    const { message, limitType } = await readError(response);
    const retryAfter = Number(response.headers.get('Retry-After')) || undefined;
    throw new DemoLimitError(message, limitType ?? 'session', retryAfter);
  }

  if (!response.ok) {
    const { message } = await readError(response);
    throw new DemoRequestError(message);
  }

  return (await response.json()) as DemoChatResult;
}

/**
 * Re-syncs the message counter with the server after a reload, so a visitor
 * who refreshes doesn't see "5 left" and then get refused on the first send.
 * Failure is silent: the client-side count is a good enough starting point.
 */
export async function fetchDemoStatus(sessionId: string): Promise<DemoStatus | null> {
  try {
    const response = await fetch(
      `${API_BASE}/demo/status?session_id=${encodeURIComponent(sessionId)}`,
    );
    if (!response.ok) return null;
    return (await response.json()) as DemoStatus;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget ping to wake a sleeping Render free instance.
 *
 * Render spins the service down after 15 minutes of inactivity and takes
 * roughly 50 seconds to come back. Firing this when the landing page mounts
 * means the wake-up overlaps with the visitor reading the hero and playing
 * with the simulator, so the tutor is usually warm by the time they reach it.
 */
export function warmUpBackend(): void {
  fetch(`${API_BASE}/health`, { method: 'GET', mode: 'cors' }).catch(() => {
    /* Expected while the instance is still booting. */
  });
}

export { GITHUB_REPO_URL };
