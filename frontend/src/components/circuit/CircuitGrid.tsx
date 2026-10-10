/**
 * The Lab's circuit panel.
 *
 * Renders the shared CircuitCanvas — identical geometry, wires, playhead and
 * gate rendering to the public console — and adds the drop target for
 * drag-and-drop placement.
 *
 * The drop target is a single region covering the diagram rather than one per
 * wire, because react-dnd's hooks cannot be called in a loop. The dropped
 * qubit is derived from the pointer's Y offset within the canvas, which is
 * exact: the grid is a fixed 52px row pitch, shared with the CSS through
 * ROW_H. Dropping arms the gate and places its first target, so a dropped CNOT
 * sets its control and then asks for the target by click — the same flow as
 * clicking a key.
 *
 * This replaces the window.prompt() chain that used to collect target qubits
 * ("Which qubit? (0-1)", three times over for a Toffoli).
 */

import { useCallback, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { Eraser, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import CircuitCanvas, { AXIS_H, ROW_H } from './CircuitCanvas';
import { useCircuit } from '../../hooks/useCircuit';
import { api } from '../../services/api';
import type { GateName } from '../../types';

const QUBIT_OPTIONS = [1, 2, 3, 4, 5];

export default function CircuitGrid() {
  const {
    gates,
    numQubits,
    setNumQubits,
    removeGate,
    clearCircuit,
    armedGate,
    pendingTargets,
    armGate,
    placeOnQubit,
    stepResult,
    currentStep,
    simulationResult,
  } = useCircuit();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [circuitName, setCircuitName] = useState('My Circuit');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await api.saveCircuit(circuitName, gates, numQubits);
      toast.success(`Saved — share link: ${window.location.origin}/share/${saved.share_token}`);
    } catch {
      toast.error('Could not save the circuit');
    } finally {
      setIsSaving(false);
    }
  };

  /** Which wire the pointer is over, from its position inside the canvas. */
  const qubitAtClientY = useCallback(
    (clientY: number): number | null => {
      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!bounds) return null;

      const qubit = Math.floor((clientY - bounds.top - AXIS_H) / ROW_H);
      return qubit >= 0 && qubit < numQubits ? qubit : null;
    },
    [numQubits],
  );

  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: 'GATE',
      drop: (item: { gate: GateName }, monitor) => {
        const offset = monitor.getClientOffset();
        if (!offset) return;

        const qubit = qubitAtClientY(offset.y);
        if (qubit === null) return;

        // Arm first, then place: a single-qubit gate lands immediately, and a
        // multi-qubit one takes this wire as its first target and waits for
        // the rest.
        armGate(item.gate);
        placeOnQubit(qubit);
      },
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [qubitAtClientY, armGate, placeOnQubit],
  );

  // Without step-through running, the whole circuit has been applied — so the
  // playhead parks at the end rather than dimming every gate on the diagram.
  const playhead = stepResult ? currentStep : gates.length;

  // Which qubits are entangled, from the same Bloch coordinates the sphere
  // draws, so the diagram ties the wires whose state no longer factorises.
  const result = stepResult ? stepResult.steps[currentStep] : simulationResult;
  const entangled = (result?.bloch_coords ?? [])
    .filter((c) => Math.hypot(c.x, c.y, c.z) < 0.99)
    .map((c) => c.qubit);

  return (
    <div className="flex flex-col">
      <div className="nameplate">
        <span className="nameplate-label">Circuit</span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
              Qubits
            </span>
            <div className="flex divide-x divide-rule overflow-hidden rounded-panel border border-rule-strong">
              {QUBIT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumQubits(n)}
                  aria-pressed={numQubits === n}
                  className={`px-2 py-1 font-mono text-readout-sm transition-colors duration-state
                              ease-instrument ${
                                numQubits === n
                                  ? 'bg-copper-400 text-void'
                                  : 'bg-panel-raised text-ink-tertiary hover:bg-copper-900 hover:text-copper-200'
                              }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={clearCircuit}
            disabled={gates.length === 0}
            className="btn-control hover:border-signal hover:bg-signal/10 hover:text-signal"
          >
            <Eraser className="h-3 w-3" />
            Clear
          </button>
        </div>
      </div>

      <div
        ref={dropRef}
        className={`px-4 py-4 transition-colors duration-state ease-instrument ${
          isOver ? 'bg-copper-900/50' : ''
        }`}
      >
        <div ref={canvasRef}>
          <CircuitCanvas
            gates={gates}
            numQubits={numQubits}
            currentStep={playhead}
            armedGate={armedGate}
            pendingTargets={pendingTargets}
            entangled={entangled}
            onPlaceOnQubit={placeOnQubit}
            onRemoveGate={removeGate}
            minColumns={8}
          />
        </div>

        {gates.length === 0 && (
          <p className="mt-3 font-mono text-[10px] text-ink-faint">
            Empty circuit — every qubit is in |0⟩
          </p>
        )}
      </div>

      {/* ── Save ───────────────────────────────────
          An operation on the circuit, so it sits with the circuit. */}
      <div className="mt-auto flex items-center gap-2 border-t border-rule px-4 py-3">
        <label htmlFor="circuit-name" className="sr-only">
          Circuit name
        </label>
        <input
          id="circuit-name"
          type="text"
          value={circuitName}
          onChange={(e) => setCircuitName(e.target.value)}
          className="field max-w-[18rem] font-mono text-readout"
          placeholder="Circuit name"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={gates.length === 0 || isSaving}
          className="btn-control py-2"
        >
          <Save className="h-3 w-3" />
          {isSaving ? 'Saving' : 'Save'}
        </button>
      </div>
    </div>
  );
}
