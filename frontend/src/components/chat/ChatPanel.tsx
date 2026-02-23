/**
 * Chat panel — the user's interface to the agentic AI tutor.
 *
 * Sends the user's current circuit state along with every message so
 * the agent is always circuit-aware. Displays tool call indicators
 * so users can see the agent "thinking" and taking actions — this
 * transparency builds trust and helps users understand agency.
 */

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useCircuit } from '../../hooks/useCircuit';
import { api } from '../../services/api';
import type { ChatMessage } from '../../types';
import { Send, Bot, User, Wrench, Lightbulb } from 'lucide-react';

export default function ChatPanel() {
  const { gates, numQubits, loadCircuit } = useCircuit();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Welcome to QuantumIQ! I'm your AI quantum computing tutor. I can see your circuit in real time and track your learning progress. Try building a circuit, then ask me about it — or ask me to teach you something new!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<Array<{ role: string; content: string }>>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Send circuit state + conversation history for multi-turn context
      const response = await api.chat(
        input,
        gates.length > 0 ? gates : undefined,
        numQubits,
        conversationRef.current.length > 0 ? conversationRef.current : undefined,
      );

      // Track conversation history (keep last 20 turns to avoid token overflow)
      conversationRef.current.push({ role: 'user', content: input });
      conversationRef.current.push({ role: 'assistant', content: response.response });
      if (conversationRef.current.length > 20) {
        conversationRef.current = conversationRef.current.slice(-20);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        tool_calls: response.tool_calls || undefined,
        challenge: (response.challenge as ChatMessage['challenge']) ?? null,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If the agent suggested a circuit, offer to load it
      if (response.suggested_circuit) {
        loadCircuit(response.suggested_circuit, numQubits);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure the backend is running and your API key is configured.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#12122a] rounded-xl border border-[#1a1a3e] flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-[#1a1a3e]">
        <Bot className="w-5 h-5 text-quantum-400" />
        <h3 className="text-sm font-semibold text-gray-300">AI Tutor</h3>
        <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full ml-auto">
          Circuit-aware
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-quantum-600/30' : 'bg-purple-600/30'
            }`}>
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-quantum-300" />
              ) : (
                <Bot className="w-4 h-4 text-purple-300" />
              )}
            </div>

            <div className={`max-w-[85%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              {/* Tool call indicators — shows what the agent "did" */}
              {msg.tool_calls && msg.tool_calls.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {msg.tool_calls.map((tc, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 text-[10px] bg-amber-400/10 text-amber-300 px-2 py-0.5 rounded-full"
                    >
                      <Wrench className="w-3 h-3" />
                      {tc.tool.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}

              {/* Message content */}
              <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-quantum-600/20 text-quantum-100'
                  : 'bg-[#0a0a1a] text-gray-300'
              }`}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="text-quantum-200 font-semibold">{children}</strong>,
                      code: ({ children }) => (
                        <code className="bg-[#1a1a3e] text-purple-300 px-1.5 py-0.5 rounded text-xs">{children}</code>
                      ),
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                      h3: ({ children }) => <h3 className="text-quantum-300 font-semibold mb-1">{children}</h3>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>

              {/* Challenge card */}
              {msg.challenge && (
                <div className="mt-2 bg-purple-600/10 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="w-4 h-4 text-purple-300" />
                    <span className="text-sm font-medium text-purple-200">
                      {msg.challenge.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{msg.challenge.description}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-600/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-purple-300" />
            </div>
            <div className="bg-[#0a0a1a] rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-quantum-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-quantum-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-quantum-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#1a1a3e]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about your circuit or a quantum concept..."
            className="flex-1 bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-quantum-500"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-quantum-600 hover:bg-quantum-700 disabled:bg-gray-700 text-white p-2.5 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {gates.length > 0 && (
          <p className="text-[10px] text-gray-600 mt-1.5">
            The AI can see your {gates.length}-gate circuit in real time
          </p>
        )}
      </div>
    </div>
  );
}
