/**
 * The console — the whole product, operable, at the top of the page.
 *
 * This section replaces both the old feature-card grid and the old demo
 * section. The reasoning is in DESIGN.md §2: three cards describing the
 * simulator were a worse version of the simulator sitting 200px below them,
 * so the cards are gone and their job is done by four short annotations
 * printed on the panels themselves.
 *
 * The four panels are laid out as one faceplate with hairline seams — a
 * `gap-px` grid over a `bg-rule` ground, so the gaps between panels *are* the
 * 1px rules. Parts of an instrument butt together; they don't float apart with
 * shadows between them.
 *
 * All four share one useDemoCircuit instance, which is what lets the tutor
 * answer questions about the circuit the visitor just built.
 *
 * Order differs by breakpoint on purpose. On desktop the tutor sits in its own
 * full-height column beside the readouts. Stacked on a phone it goes last:
 * the readouts belong next to the circuit they describe, and a visitor
 * scrolling a 375px screen should meet the sphere and the measurements before
 * a chat composer.
 */

import { useMemo } from 'react';

import DemoBlochSphere from '../demo/DemoBlochSphere';
import DemoCircuitBuilder from '../demo/DemoCircuitBuilder';
import DemoProbabilities from '../demo/DemoProbabilities';
import DemoTutor from '../demo/DemoTutor';
import { useDemoCircuit } from '../../hooks/useDemoCircuit';

/** Below this vector length a qubit's reduced state is mixed, i.e. entangled. */
const PURITY_THRESHOLD = 0.99;

export default function DemoSection() {
  const circuit = useDemoCircuit();

  // Which qubits are entangled right now, derived from the same Bloch
  // coordinates the sphere draws. Passed to the diagram so entanglement shows
  // up as a tie between wires the moment the state stops factorising —
  // DESIGN.md §7: entanglement should be visible, not inferred.
  const entangled = useMemo(
    () =>
      circuit.result.bloch_coords
        .filter((c) => Math.hypot(c.x, c.y, c.z) < PURITY_THRESHOLD)
        .map((c) => c.qubit),
    [circuit.result],
  );

  return (
    <section id="console" className="scroll-mt-12 border-t border-rule bg-void-lift">
      <div className="mx-auto max-w-console px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* A thin header rail rather than a centred headline and grey
            subtitle. It reads as the instrument's own label strip. */}
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule pb-3">
          <h2 className="font-display text-h3 font-medium text-ink-primary">
            The console
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Statevector · 4 qubits · 1024 shots · running in this tab
          </p>
        </div>

        <div className="overflow-hidden rounded-panel border border-rule-strong">
          <div className="grid gap-px bg-rule lg:grid-cols-3">
            <div className="min-w-0 bg-panel lg:col-span-2 lg:order-1">
              <DemoCircuitBuilder circuit={circuit} entangled={entangled} />
            </div>

            {/* The tutor runs the full height of both rows: it is the one
                panel whose content is prose and needs the vertical room. */}
            <div className="order-last min-w-0 bg-panel lg:order-2 lg:row-span-2">
              <DemoTutor gates={circuit.gates} numQubits={circuit.numQubits} />
            </div>

            <div className="min-w-0 bg-panel lg:order-3">
              <DemoBlochSphere coords={circuit.result.bloch_coords} />
            </div>

            <div className="min-w-0 bg-panel lg:order-4">
              <DemoProbabilities result={circuit.result} numQubits={circuit.numQubits} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
