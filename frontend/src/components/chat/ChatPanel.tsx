/**
 * The Lab's tutor — the user's interface to the agentic backend.
 *
 * Same notebook treatment as the public console's tutor: questions are `>`
 * prompt lines, answers are prose against a copper rule. No avatars, no speech
 * bubbles.
 *
 * What this one adds over the console's is the agent's visible work. It sends
 * the current circuit with every message, and prints the tool calls the agent
 * made before answering — reading the circuit, reading progress, writing a
 * challenge. Those are the difference between an agent and a chat box, so they
 * are printed as a run log rather than hidden behind a spinner.
 */

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send } from 'lucide-react';

import { useCircuit } from '../../hooks/useCircuit';
import { api } from '../../services/api';
import type { ChatMessage } from '../../types';

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "I can see your circuit as you build it, and I keep track of what you've practised. Build something and ask me about it, or ask me to set you a challenge.",
};

export default function ChatPanel() {
  const { gates, numQubits, loadCircuit } = useCircuit();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<Array<{ role: string; content: string }>>([]);

  // Keep the newest message in view without yanking the whole page around.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const question = input;
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setIsLoading(true);

    try {
      // Send circuit state + conversation history for multi-turn context
      const response = await api.chat(
        question,
        gates.length > 0 ? gates : undefined,
        numQubits,
        conversationRef.current.length > 0 ? conversationRef.current : undefined,
      );

      // Track conversation history (keep last 20 turns to avoid token overflow)
      conversationRef.current.push({ role: 'user', content: question });
      conversationRef.current.push({ role: 'assistant', content: response.response });
      if (conversationRef.current.length > 20) {
        conversationRef.current = conversationRef.current.slice(-20);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.response,
          tool_calls: response.tool_calls || undefined,
          challenge: (response.challenge as ChatMessage['challenge']) ?? null,
        },
      ]);

      // If the agent suggested a circuit, load it
      if (response.suggested_circuit) {
        loadCircuit(response.suggested_circuit, numQubits);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I couldn't reach the tutor backend. Check that the API is running and that an OpenAI key is configured — the simulator and the sphere are unaffected either way.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="nameplate">
        <span className="nameplate-label">Tutor</span>
        <span className="font-mono text-readout-sm text-ink-tertiary">
          {gates.length > 0 ? `reading ${gates.length}-gate circuit` : 'circuit-aware'}
        </span>
      </div>

      {/* ── Transcript ─────────────────────────────────────────────────── */}
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        {/* A transcript grows from the bottom; a leading flex-1 spacer keeps the
            greeting near the composer instead of marooned at the top of a tall
            empty column, while leaving the container a normal scroller. */}
        <div aria-hidden className="min-h-0 flex-1" />

        <div className="space-y-4">
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <p
              key={i}
              className="flex gap-2 font-mono text-readout leading-relaxed text-copper-200"
            >
              <span aria-hidden className="select-none text-copper-500">
                &gt;
              </span>
              <span>{msg.content}</span>
            </p>
          ) : (
            <div key={i} className="border-l border-copper-700 pl-3.5">
              {/* The agent's run log: what it actually did before answering. */}
              {msg.tool_calls && msg.tool_calls.length > 0 && (
                <ul className="mb-2.5 space-y-0.5">
                  {msg.tool_calls.map((tc, j) => (
                    <li
                      key={j}
                      className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint"
                    >
                      <span aria-hidden className="text-copper-600">
                        ·{' '}
                      </span>
                      {tc.tool.replace(/_/g, ' ')}
                    </li>
                  ))}
                </ul>
              )}

              <div className="text-small leading-relaxed text-ink-secondary">
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
                    h3: ({ children }) => (
                      <h3 className="mb-1 font-display text-small font-medium text-ink-primary">
                        {children}
                      </h3>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>

              {/* A challenge the agent set, as a labelled card in the log. */}
              {msg.challenge && (
                <div className="readout-well mt-2.5 px-3 py-2.5">
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-copper-300">
                    Challenge
                  </span>
                  <p className="mt-1 text-small font-medium text-ink-primary">
                    {msg.challenge.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-tertiary">
                    {msg.challenge.description}
                  </p>
                </div>
              )}
            </div>
          ),
        )}

        {isLoading && (
          <div className="border-l border-copper-700 pl-3.5">
            <span aria-hidden className="relative block h-px w-16 overflow-hidden bg-rule-strong">
              <span className="absolute inset-y-0 w-4 animate-sweep bg-copper-400" />
            </span>
            <span className="sr-only">The tutor is working…</span>
          </div>
        )}
        </div>
      </div>

      {/* ── Composer ───────────────────────────────────────────────────── */}
      <div className="border-t border-rule bg-panel-raised px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="readout-well flex flex-1 items-center gap-2 px-3 py-2 focus-within:border-copper-500">
            <span aria-hidden className="select-none font-mono text-readout text-copper-500">
              &gt;
            </span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="ask about your circuit or a concept"
              aria-label="Ask the tutor"
              className="w-full bg-transparent font-mono text-readout text-ink-primary outline-none
                         placeholder:text-ink-faint"
            />
          </div>

          <button
            type="button"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            aria-label="Send"
            className="keycap h-[38px] w-[38px] border-copper-600 text-copper-200
                       hover:border-copper-400 hover:bg-copper-900
                       disabled:cursor-not-allowed disabled:border-rule-strong disabled:text-ink-faint"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
