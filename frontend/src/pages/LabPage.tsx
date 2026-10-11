/**
 * The Lab — the signed-in workspace.
 *
 * Laid out as one instrument rather than six floating cards: nested grids with
 * `gap-px` over a `bg-rule` ground, so every gap between panels *is* a 1px
 * seam. Same construction as the public console, which is deliberate — a
 * visitor who signs up should arrive at the machine they were just using, with
 * more of it rather than a different one.
 *
 * Viewport-locked from lg up, where a workspace that scrolls as a whole is
 * worse than panels that scroll individually. Below lg it reverts to normal
 * document flow, because a locked 100vh layout on a phone is a trap.
 *
 * DndProvider wraps everything so gates can be dragged from the keypad onto a
 * wire; clicking a key and then a wire does the same job without a pointer.
 */

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import GatePalette from '../components/circuit/GatePalette';
import CircuitGrid from '../components/circuit/CircuitGrid';
import SimulationControls from '../components/circuit/SimulationControls';
import ProbabilityBars from '../components/circuit/ProbabilityBars';
import BlochSphere from '../components/bloch/BlochSphere';
import ChatPanel from '../components/chat/ChatPanel';

export default function LabPage() {
  return (
    <DndProvider backend={HTML5Backend}>
      {/* 49px = the rail's 48px plus its 1px bottom border. */}
      <div className="bg-void p-3 sm:p-4 lg:h-[calc(100vh-49px)]">
        <div className="mx-auto h-full max-w-[100rem] overflow-hidden rounded-panel border border-rule-strong">
          <div className="grid h-full gap-px bg-rule lg:grid-cols-[minmax(0,1fr)_23rem]">
            {/* ── Work area ─────────────────────────────────────────────
                Rows: controls, circuit, then the two readouts. The circuit
                takes the slack so the diagram always has room. */}
            <div className="grid min-h-0 min-w-0 gap-px bg-rule lg:grid-rows-[auto_auto_minmax(0,1fr)]">
              <div className="grid min-w-0 gap-px bg-rule sm:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="min-w-0 bg-panel">
                  <GatePalette />
                </div>
                <div className="bg-panel">
                  <SimulationControls />
                </div>
              </div>

              <div className="min-w-0 bg-panel">
                <CircuitGrid />
              </div>

              <div className="grid min-h-0 min-w-0 gap-px bg-rule md:grid-cols-2">
                <div className="min-h-0 min-w-0 overflow-y-auto bg-panel">
                  <BlochSphere />
                </div>
                <div className="min-h-0 min-w-0 overflow-y-auto bg-panel">
                  <ProbabilityBars />
                </div>
              </div>
            </div>

            {/* ── Tutor ─────────────────────────────────────────────────
                Full height of the instrument, scrolling internally. */}
            <div className="min-h-0 min-w-0 bg-panel">
              <ChatPanel />
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
