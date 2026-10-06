/**
 * The rate-limited AI tutor.
 *
 * Presented as the lab notebook attached to the instrument rather than a chat
 * widget: no avatars, no speech bubbles. A question is a `>` prompt line in
 * mono; an answer is prose set against a copper rule. The remaining-message
 * allowance is a segmented meter in the nameplate, because that is how an
 * instrument reports a finite resource.
 *
 * Message accounting happens twice, on purpose:
 *
 *   - Here, in sessionStorage, so the composer locks the instant the fifth
 *     message is sent rather than after a round trip.
 *   - In the backend (app/routes/demo.py), which is the authority. Clearing
 *     sessionStorage gets you a fresh client-side counter and nothing else —
 *     the server still refuses, and the per-IP limiter behind it catches the
 *     obvious next move of scripting new session ids.
 *
 * The counter shown to the visitor is always the server's number when we have
 * one, so the two can't drift apart visibly.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send } from 'lucide-react';

import {
  DemoLimitError,
  DemoRequestError,
  ensureBackendAwake,
  fetchDemoStatus,
  sendDemoMessage,
  type BackendState,
  type DemoLimitType,
} from '../../services/demoApi';
import { loadDemoSession, saveDemoUsed } from '../../lib/demoSession';
import { GITHUB_REPO_URL } from '../../config/env';
import type { GateOperation } from '../../types';

const MAX_MESSAGE_CHARS = 500;
/** Matches DEMO_HISTORY_TURNS on the backend; anything more is trimmed there. */
const HISTORY_TURNS = 6;
/** How long a pending request runs before we blame Render's cold start. */
const COLD_START_HINT_MS = 4000;

const STARTER_PROMPTS = [
  'What does my circuit do?',
  'Why do the Bloch vectors shrink when qubits are entangled?',
  'How do I build a GHZ state?',
];

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: ChatTurn = {
  role: 'assistant',
  content:
    "I can see the circuit on the left, gate by gate. Ask me what it does, why the probabilities came out that way, or what to try next.",
};

/**
 * The allowance meter: one segment per message, spent segments going dark.
 * An instrument reports a finite resource as a gauge, not as a badge.
 */
function AllowanceMeter({ used, limit }: { used: number; limit: number }) {
  // Guard against a server-side limit large enough to turn the nameplate into
  // a barcode; past a handful of segments the number carries it alone.
  if (limit > 10) {
    return (
      <span className="font-mono text-readout-sm text-ink-tertiary">
        {Math.max(0, limit - used)} / {limit} left
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2" title={`${Math.max(0, limit - used)} of ${limit} messages left`}>
      <span aria-hidden className="flex gap-[3px]">
        {Array.from({ length: limit }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-1 rounded-tight transition-colors duration-state ease-instrument ${
              i < limit - used ? 'bg-copper-400' : 'bg-rule-strong'
            }`}
          />
        ))}
      </span>
      <span className="font-mono text-readout-sm text-ink-tertiary">
        {Math.max(0, limit - used)}/{limit}
      </span>
    </span>
  );
}

/** A status strip: honest, inline, styled as a readout rather than an alert. */
function StatusStrip({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warn' | 'error';
  children: React.ReactNode;
}) {
  const border =
    tone === 'error'
      ? 'border-signal-dim'
      : tone === 'warn'
        ? 'border-copper-600'
        : 'border-rule-strong';

  return (
    <div className={`readout-well border-l-2 ${border} px-3.5 py-2.5`}>
      <div className="text-small leading-relaxed text-ink-secondary">{children}</div>
    </div>
  );
}

interface DemoTutorProps {
  gates: GateOperation[];
  numQubits: number;
}

export default function DemoTutor({ gates, numQubits }: DemoTutorProps) {
  const [messages, setMessages] = useState<ChatTurn[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showColdStartHint, setShowColdStartHint] = useState(false);

  // Render's free instance sleeps after 15 minutes idle and takes ~50s to
  // wake. Tracking that explicitly means the panel can say so, rather than
  // offering a composer whose first message appears to hang.
  const [backend, setBackend] = useState<BackendState>('warming');

  const [sessionId, setSessionId] = useState('');
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(5);

  /** Non-null once a limit or error needs explaining inline. */
  const [notice, setNotice] = useState<{ type: DemoLimitType | 'error'; message: string } | null>(
    null,
  );

  const listRef = useRef<HTMLDivElement>(null);

  // ── Session bootstrap ───────────────────────────────────────────────
  useEffect(() => {
    const session = loadDemoSession();
    setSessionId(session.id);
    setUsed(session.used);

    let cancelled = false;

    // Shares the landing page's warm-up ping rather than firing a second one.
    ensureBackendAwake().then((awake) => {
      if (cancelled) return;
      setBackend(awake ? 'awake' : 'asleep');
    });

    // Reconcile with the server, which is authoritative — a reload shouldn't
    // hand back messages the backend has already counted.
    fetchDemoStatus(session.id).then((status) => {
      if (cancelled || !status) return;

      setLimit(status.limit);
      setUsed(status.messages_used);
      saveDemoUsed(session.id, status.messages_used);

      if (!status.enabled) {
        setNotice({
          type: 'unconfigured',
          message:
            'The tutor is offline on this deployment. Everything to the left runs in your browser and is unaffected.',
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the newest message in view without yanking the whole page around.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages, isSending, notice]);

  const remaining = Math.max(0, limit - used);
  const exhausted = remaining === 0;
  const blocked = exhausted || notice?.type === 'unconfigured' || notice?.type === 'disabled';

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending || blocked || !sessionId) return;

      setInput('');
      setNotice(null);
      setMessages((current) => [...current, { role: 'user', content: trimmed }]);
      setIsSending(true);

      const coldStartTimer = setTimeout(() => setShowColdStartHint(true), COLD_START_HINT_MS);

      // Drop the canned greeting from what we send — it isn't something the
      // model said, and paying to feed it back every turn is waste.
      const history = messages
        .filter((turn) => turn !== GREETING)
        .slice(-HISTORY_TURNS)
        .map((turn) => ({ role: turn.role, content: turn.content }));

      try {
        const result = await sendDemoMessage({
          message: trimmed,
          sessionId,
          circuit: gates,
          numQubits,
          history,
        });

        setMessages((current) => [...current, { role: 'assistant', content: result.response }]);
        setUsed(result.messages_used);
        setLimit(result.limit);
        saveDemoUsed(sessionId, result.messages_used);
      } catch (error) {
        if (error instanceof DemoLimitError) {
          setNotice({ type: error.limitType, message: error.message });

          // A session rejection means our local count was behind the server's.
          if (error.limitType === 'session') {
            setUsed(limit);
            saveDemoUsed(sessionId, limit);
          }
        } else if (error instanceof DemoRequestError) {
          setNotice({ type: 'error', message: error.message });
        } else {
          setNotice({ type: 'error', message: 'Something went wrong. Please try again.' });
        }
      } finally {
        clearTimeout(coldStartTimer);
        setShowColdStartHint(false);
        setIsSending(false);
      }
    },
    [blocked, gates, isSending, limit, messages, numQubits, sessionId],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <div className="flex h-full min-h-[32rem] flex-col">
      {/* ── Nameplate ──────────────────────────────────────────────────── */}
      <div className="nameplate">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-micro text-copper-400">04</span>
          <span className="nameplate-label">Tutor</span>
        </div>

        {backend === 'warming' ? (
          <span className="font-mono text-readout-sm text-ink-tertiary">waking…</span>
        ) : (
          <AllowanceMeter used={used} limit={limit} />
        )}
      </div>

      <p className="border-b border-rule px-4 py-2.5 text-small text-ink-secondary">
        It receives the circuit you just built, gate by gate — so "what does
        this do?" is a question about <em className="not-italic text-ink-primary">your</em> circuit.
      </p>

      {/* ── Transcript ───────────────────────────────────────────────────
          A notebook, not a chat log: questions are `>` prompt lines, answers
          are prose against a copper rule. */}
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4"
      >
        {/* A transcript grows from the bottom. Without this spacer the panel —
            which runs the full height of the console on desktop — opens with
            one greeting marooned at the top of a tall empty column. A leading
            flex-1 spacer pushes content to the bottom while keeping the
            container a normal scroller once the conversation outgrows it;
            `justify-end` alone breaks scrolling in some engines. */}
        <div aria-hidden className="min-h-0 flex-1" />

        <div className="space-y-4">
        {messages.map((turn, index) =>
          turn.role === 'user' ? (
            <p
              key={index}
              className="flex gap-2 font-mono text-readout leading-relaxed text-copper-200"
            >
              <span aria-hidden className="select-none text-copper-500">
                &gt;
              </span>
              <span>{turn.content}</span>
            </p>
          ) : (
            <div
              key={index}
              className="border-l border-copper-700 pl-3.5 text-small leading-relaxed text-ink-secondary"
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-medium text-ink-primary">{children}</strong>
                  ),
                  code: ({ children }) => (
                    <code className="font-mono text-[0.9em] text-copper-200">{children}</code>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-copper-300 underline underline-offset-2"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {turn.content}
              </ReactMarkdown>
            </div>
          ),
        )}

        {/* ── Honest states ──────────────────────────────────────────────
            Each one says what is down, what still works, and what to do. */}
        {backend === 'warming' && messages.length === 1 && (
          <StatusStrip>
            The tutor's backend sleeps when idle to stay on free hosting, so the
            first reply can take up to a minute. The circuit, the sphere and the
            measurements run in your browser and work right now.
          </StatusStrip>
        )}

        {backend === 'asleep' && messages.length === 1 && (
          <StatusStrip tone="warn">
            The tutor isn't responding. Everything else on this console is
            unaffected — it runs entirely in your browser. Send a message to retry.
          </StatusStrip>
        )}

        {isSending && (
          <div className="border-l border-copper-700 pl-3.5">
            {/* A sweep rather than bouncing dots: the instrument is busy. */}
            <span
              aria-hidden
              className="relative block h-px w-16 overflow-hidden bg-rule-strong"
            >
              <span className="absolute inset-y-0 w-4 animate-sweep bg-copper-400" />
            </span>
            <span className="sr-only">The tutor is thinking…</span>
            {showColdStartHint && (
              <p className="mt-2.5 text-small leading-relaxed text-ink-tertiary">
                Still waking the backend — the first reply after an idle period can
                take up to a minute.
              </p>
            )}
          </div>
        )}

        {(exhausted || notice) && (
          <StatusStrip tone={notice?.type === 'error' ? 'error' : 'warn'}>
            {exhausted ? (
              <>
                <p>
                  That's the {limit}-message demo allowance. Clone the repo and run
                  it with your own key for the full agent — tool calling, progress
                  tracking, no cap.
                </p>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-quiet mt-2.5"
                >
                  Clone QuantumIQ
                </a>
              </>
            ) : (
              notice?.message
            )}
          </StatusStrip>
        )}
        </div>
      </div>

      {/* ── Starter prompts ──────────────────────────────────────────────
          Understated text links, not a row of bordered chips. */}
      {messages.length === 1 && !blocked && (
        <div className="flex flex-col items-start gap-1.5 border-t border-rule px-4 py-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
            Try asking
          </span>
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void send(prompt)}
              disabled={isSending}
              className="text-left text-small text-ink-secondary underline decoration-rule-strong
                         underline-offset-4 transition-colors duration-state ease-instrument
                         hover:decoration-copper-400 hover:text-copper-200 disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* ── Composer ─────────────────────────────────────────────────────
          A prompt line: the `>` lives inside the well, so typing a question
          looks like typing into a terminal rather than filling in a form. */}
      <form onSubmit={handleSubmit} className="border-t border-rule bg-panel-raised px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="readout-well flex flex-1 items-center gap-2 px-3 py-2 focus-within:border-copper-500">
            <span aria-hidden className="select-none font-mono text-readout text-copper-500">
              &gt;
            </span>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_CHARS))}
              placeholder={
                blocked
                  ? 'allowance spent'
                  : backend === 'warming'
                    ? 'waking the tutor…'
                    : 'ask about your circuit'
              }
              disabled={blocked || isSending}
              aria-label="Ask the tutor about your circuit"
              className="w-full bg-transparent font-mono text-readout text-ink-primary outline-none
                         placeholder:text-ink-faint disabled:cursor-not-allowed"
            />
            {input.length > MAX_MESSAGE_CHARS * 0.8 && (
              <span className="font-mono text-[10px] text-ink-faint">
                {input.length}/{MAX_MESSAGE_CHARS}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={blocked || isSending || !input.trim()}
            aria-label="Send"
            className="keycap h-[38px] w-[38px] border-copper-600 text-copper-200
                       hover:border-copper-400 hover:bg-copper-900
                       disabled:cursor-not-allowed disabled:border-rule-strong disabled:text-ink-faint"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-tertiary">
          {limit} messages per session, rate limited by IP.{' '}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-rule-strong underline-offset-2 hover:text-copper-300"
          >
            Run it locally
          </a>{' '}
          for the full agent loop with tools and persistent memory.
        </p>
      </form>
    </div>
  );
}
