/**
 * The live demo.
 *
 * Two halves with very different cost profiles, and the UI says so rather
 * than hiding it:
 *
 *   - The simulator, Bloch sphere and measurement panel run entirely in the
 *     browser (src/lib/quantumSim.ts). Unlimited, instant, works with the
 *     backend asleep.
 *   - The tutor is a real model call, so it gets five messages per session
 *     and per-IP limits on top.
 *
 * All four panels share one useDemoCircuit instance, which is why the tutor
 * can answer questions about the circuit the visitor just built.
 */

import { Cpu, Infinity as InfinityIcon } from 'lucide-react';

import DemoBlochSphere from '../demo/DemoBlochSphere';
import DemoCircuitBuilder from '../demo/DemoCircuitBuilder';
import DemoProbabilities from '../demo/DemoProbabilities';
import DemoTutor from '../demo/DemoTutor';
import Reveal from './Reveal';
import { useDemoCircuit } from '../../hooks/useDemoCircuit';

export default function DemoSection() {
  const circuit = useDemoCircuit();

  return (
    <section
      id="demo"
      className="relative scroll-mt-16 border-t border-ink-700/40 bg-ink-950"
    >
      {/* A cyan wash bleeding down from the section's top edge, echoing the
          hero's lighting so the page reads as one environment. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96"
        style={{
          background:
            'radial-gradient(70% 100% at 50% 0%, rgba(34, 211, 238, 0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-glow-400/25 bg-glow-400/[0.07] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-glow-200">
            <Cpu className="h-3.5 w-3.5" />
            Live demo
          </span>

          <h2 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Build a circuit. <span className="text-gradient-quantum">Ask about it.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-400">
            Everything below is running for real. Place gates, scrub through the
            circuit step by step, and watch the state evolve — then ask the tutor
            what just happened.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
              <DemoCircuitBuilder circuit={circuit} />
            </div>

            <div className="lg:col-start-1 lg:row-start-2">
              <DemoBlochSphere coords={circuit.result.bloch_coords} />
            </div>

            <div className="lg:col-start-2 lg:row-start-2">
              <DemoProbabilities result={circuit.result} numQubits={circuit.numQubits} />
            </div>

            <div className="lg:col-start-3 lg:row-span-2 lg:row-start-1">
              <DemoTutor gates={circuit.gates} numQubits={circuit.numQubits} />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-gray-600">
            <InfinityIcon className="h-3.5 w-3.5 text-glow-500" />
            Simulator, Bloch sphere and measurements are unlimited — they run in your
            browser, not on a server.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
