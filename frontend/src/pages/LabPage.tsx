/**
 * Quantum Lab — the main interactive workspace.
 *
 * Layout: Three-column design
 * - Left: Gate palette + simulation controls
 * - Center: Circuit grid + probability bars + Bloch sphere
 * - Right: AI chat panel
 *
 * The DndProvider wraps everything for drag-and-drop gate placement.
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
      <div className="min-h-[calc(100vh-57px)] bg-[#0a0a1a] p-4">
        <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-4 h-[calc(100vh-89px)]">
          {/* Left column: Gates + Controls */}
          <div className="col-span-2 space-y-4 overflow-y-auto">
            <GatePalette />
            <SimulationControls />
          </div>

          {/* Center column: Circuit + Visualizations */}
          <div className="col-span-6 space-y-4 overflow-y-auto">
            <CircuitGrid />
            <div className="grid grid-cols-2 gap-4">
              <BlochSphere />
              <ProbabilityBars />
            </div>
          </div>

          {/* Right column: AI Chat */}
          <div className="col-span-4">
            <ChatPanel />
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
