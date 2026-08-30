/**
 * The rate-limited AI tutor demo.
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
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Bot, Github, Send, Sparkles, User } from 'lucide-react';

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
  'Why is the Bloch vector shorter when qubits are entangled?',
  'How do I make a GHZ state?',
];

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: ChatTurn = {
  role: 'assistant',
  content:
    "Hi — I'm the QuantumIQ tutor. I can see the circuit you've built on the left, so ask me about it: what it does, why the probabilities look like that, or what to try next.",
};

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
          message: 'The demo tutor is offline on this deployment, but the simulator above is fully live.',
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
    <div className="edge-highlight relative flex h-full min-h-[30rem] flex-col overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-900/70 backdrop-blur-sm">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-glow-400/30 bg-glow-400/10">
            <Sparkles className="h-3.5 w-3.5 text-glow-300" />
          </span>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
              AI Tutor
            </h3>
            <p className="text-[11px] text-gray-600">gpt-4o-mini · circuit-aware</p>
          </div>
        </div>

        {backend === 'warming' ? (
          <div className="flex items-center gap-2 rounded-full border border-glow-400/25 bg-glow-400/[0.07] px-3 py-1 text-[11px] font-medium text-glow-200">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-glow-300"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            Waking up
          </div>
        ) : (
          <div
            className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
              exhausted
                ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                : 'border-glow-400/25 bg-glow-400/[0.07] text-glow-200'
            }`}
          >
            {remaining} / {limit} left
          </div>
        )}
      </div>

      {/* ── Transcript ───────────────────────────────────────────── */}
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.map((turn, index) => (
          <motion.div
            key={index}
            initial={index === 0 ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`flex gap-3 ${turn.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <span
              className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border ${
                turn.role === 'user'
                  ? 'border-quantum-500/30 bg-quantum-500/10 text-quantum-300'
                  : 'border-glow-400/25 bg-glow-400/10 text-glow-300'
              }`}
            >
              {turn.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </span>

            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                turn.role === 'user'
                  ? 'bg-quantum-600/20 text-gray-100'
                  : 'bg-ink-800/80 text-gray-300'
              }`}
            >
              {turn.role === 'assistant' ? (
                <div className="prose-demo space-y-2">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="m-0">{children}</p>,
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-100">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code className="quantum-notation rounded bg-ink-950/70 px-1 py-0.5 text-[0.85em] text-glow-200">
                          {children}
                        </code>
                      ),
                      ul: ({ children }) => (
                        <ul className="m-0 list-disc space-y-1 pl-4">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="m-0 list-decimal space-y-1 pl-4">{children}</ol>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-glow-300 underline underline-offset-2"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {turn.content}
                  </ReactMarkdown>
                </div>
              ) : (
                turn.content
              )}
            </div>
          </motion.div>
        ))}

        {backend === 'warming' && messages.length === 1 && (
          <div className="rounded-xl border border-ink-700/70 bg-ink-800/50 px-4 py-3">
            <p className="text-[11px] leading-relaxed text-gray-500">
              The demo backend sleeps when idle to stay on free hosting, so the
              tutor takes up to a minute to wake on the first visit. Everything
              to the left — the circuit, the Bloch sphere, the measurements —
              runs in your browser and works right now.
            </p>
          </div>
        )}

        {backend === 'asleep' && messages.length === 1 && (
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
            <p className="text-[11px] leading-relaxed text-gray-400">
              The tutor backend isn't responding right now. The simulator, Bloch
              sphere and measurements are unaffected — they run entirely in your
              browser. Send a message to retry.
            </p>
          </div>
        )}

        {isSending && (
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-glow-400/25 bg-glow-400/10 text-glow-300">
              <Bot className="h-3.5 w-3.5" />
            </span>
            <div className="rounded-xl bg-ink-800/80 px-3.5 py-3">
              <span className="flex gap-1.5">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-glow-300"
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.18 }}
                  />
                ))}
              </span>
              {showColdStartHint && (
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                  The demo backend sleeps when idle — the first reply can take up to a
                  minute while it wakes.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Limit / error notice ───────────────────────────────── */}
        <AnimatePresence>
          {(exhausted || notice) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`rounded-xl border px-4 py-3.5 ${
                exhausted || notice?.type !== 'error'
                  ? 'border-glow-400/25 bg-glow-400/[0.06]'
                  : 'border-red-400/25 bg-red-400/[0.06]'
              }`}
            >
              <div className="flex gap-3">
                <AlertCircle
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                    exhausted || notice?.type !== 'error' ? 'text-glow-300' : 'text-red-300'
                  }`}
                />
                <div className="text-sm">
                  {exhausted ? (
                    <>
                      <p className="leading-relaxed text-gray-200">
                        You've hit the demo limit — clone the repo and run it with your
                        own OpenAI key for unlimited use.
                      </p>
                      <a
                        href={GITHUB_REPO_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-2.5 inline-flex items-center gap-2 rounded-lg border border-glow-400/30 bg-glow-400/10 px-3 py-1.5 text-xs font-medium text-glow-200 outline-none hover:bg-glow-400/20 focus-visible:ring-2 focus-visible:ring-glow-300"
                      >
                        <Github className="h-3.5 w-3.5" />
                        Clone QuantumIQ on GitHub
                      </a>
                    </>
                  ) : (
                    <p className="leading-relaxed text-gray-300">{notice?.message}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Starter prompts ──────────────────────────────────────── */}
      {messages.length === 1 && !blocked && (
        <div className="flex flex-wrap gap-2 px-5 pb-1">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void send(prompt)}
              disabled={isSending}
              className="rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-1.5 text-[11px] text-gray-400 outline-none transition-colors hover:border-glow-400/40 hover:text-glow-200 focus-visible:ring-1 focus-visible:ring-glow-300 disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* ── Composer ─────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="border-t border-ink-700/60 p-4">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_CHARS))}
              placeholder={
                blocked
                  ? 'Demo limit reached'
                  : backend === 'warming'
                    ? 'Waking the tutor — the simulator works meanwhile…'
                    : 'Ask about your circuit…'
              }
              disabled={blocked || isSending}
              aria-label="Message the AI tutor"
              className="w-full rounded-xl border border-ink-700 bg-ink-950/70 px-4 py-2.5 pr-14 text-sm text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-glow-400/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {input.length > MAX_MESSAGE_CHARS * 0.8 && (
              <span className="quantum-notation absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">
                {input.length}/{MAX_MESSAGE_CHARS}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={blocked || isSending || !input.trim()}
            aria-label="Send message"
            className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-glow-400 to-quantum-500 text-ink-950 outline-none transition-shadow hover:shadow-glow-sm focus-visible:ring-2 focus-visible:ring-glow-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:shadow-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2.5 text-[11px] leading-relaxed text-gray-600">
          {limit} free messages per session, rate limited by IP. The full tutor runs
          the agent loop with tools and persistent memory —{' '}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="text-gray-500 underline underline-offset-2 hover:text-glow-300"
          >
            run it locally
          </a>{' '}
          with your own key.
        </p>
      </form>
    </div>
  );
}
