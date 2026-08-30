/**
 * The three things QuantumIQ actually does, stated plainly.
 *
 * Each card carries a pointer-tracked highlight: a soft radial gradient that
 * follows the cursor within the card. It's driven by CSS custom properties
 * written on the element directly, so hovering never triggers a React render
 * — the alternative (mouse position in state) re-renders the whole grid on
 * every mousemove.
 */

import { useCallback, type MouseEvent } from 'react';
import { CircuitBoard, Globe2, BrainCircuit, type LucideIcon } from 'lucide-react';

import Reveal from './Reveal';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
}

const FEATURES: Feature[] = [
  {
    icon: CircuitBoard,
    title: 'Interactive Circuit Simulator',
    description:
      'Place gates on qubit wires and watch amplitudes, probabilities and measurement counts update as you build.',
    accent: '#22d3ee',
  },
  {
    icon: Globe2,
    title: '3D Bloch Sphere Visualization',
    description:
      'See each qubit as a vector you can orbit in real time — including entangled states that collapse toward the centre.',
    accent: '#5c7cfa',
  },
  {
    icon: BrainCircuit,
    title: 'AI Tutor with Persistent Memory',
    description:
      'A circuit-aware agent that remembers what you have mastered, tracks weak spots, and sets challenges to match.',
    accent: '#a78bfa',
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
    card.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
  }, []);

  return (
    <div
      onMouseMove={handleMouseMove}
      className="edge-highlight group relative h-full overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-800/60 p-7 backdrop-blur-sm transition-colors duration-300 hover:border-glow-400/30"
    >
      {/* Cursor-follow highlight. Sits under the content, above the card fill. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(320px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(34, 211, 238, 0.08), transparent 65%)',
        }}
      />

      <div className="relative">
        <div
          className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105"
          style={{
            borderColor: `${feature.accent}33`,
            backgroundColor: `${feature.accent}14`,
          }}
        >
          <Icon className="h-6 w-6" style={{ color: feature.accent }} />
        </div>

        <h3 className="mb-2.5 text-lg font-semibold text-gray-100">{feature.title}</h3>
        <p className="text-sm leading-relaxed text-gray-400">{feature.description}</p>
      </div>
    </div>
  );
}

export default function FeatureCards() {
  return (
    <section id="features" className="relative scroll-mt-20 border-t border-ink-700/40 bg-ink-950">
      <div aria-hidden className="bg-lab-grid absolute inset-0 opacity-60" />
      {/* Fades the grid out at the edges so it never meets a section boundary
          as a hard line. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(90% 70% at 50% 40%, transparent 20%, #0a0a1a 85%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Built to make the maths{' '}
            <span className="text-gradient-quantum">visible</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-400">
            Quantum mechanics is hard to picture from a textbook. QuantumIQ pairs a
            real Qiskit simulator with a tutor that can see exactly what you built.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.1} className="h-full">
              <FeatureCard feature={feature} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
