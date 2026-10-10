/**
 * The Lab's gate panel.
 *
 * Thin wrapper over the shared GateKeypad: the keys, their family grouping and
 * their pressed states are identical to the public console, because they are
 * the same component. What the Lab adds is drag-and-drop — each key is also a
 * react-dnd source, so a gate can be dragged straight onto a wire as well as
 * armed and clicked.
 *
 * Shortcuts are hidden here: the Lab has a chat composer in the same view and
 * no global key handler listening, so engraving shortcuts that don't fire
 * would be a lie on the keycap.
 */

import { useDrag } from 'react-dnd';

import GateKeypad from './GateKeypad';
import { useCircuit } from '../../hooks/useCircuit';
import { GATE_CATALOG, type GateName } from '../../types';

/**
 * Makes the whole keypad draggable by delegating to a single drag source that
 * reads which key the pointer went down on.
 *
 * One `useDrag` for the panel rather than one per key: hooks cannot be called
 * in a loop whose length depends on a filter, and a single source that carries
 * the armed gate is both simpler and matches how the keypad already works.
 */
function useKeypadDrag(armedGate: GateName | null) {
  return useDrag(
    () => ({
      type: 'GATE',
      item: armedGate ? { gate: armedGate } : null,
      canDrag: () => armedGate !== null,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [armedGate],
  );
}

export default function GatePalette() {
  const { armedGate, armGate, placementHint, cancelPlacement, numQubits } = useCircuit();
  const [{ isDragging }, dragRef] = useKeypadDrag(armedGate);

  return (
    <div className="flex flex-col">
      <div className="nameplate">
        <span className="nameplate-label">Gates</span>
        {armedGate && (
          <span className="font-mono text-readout-sm text-copper-300">
            {GATE_CATALOG[armedGate].symbol} armed
          </span>
        )}
      </div>

      <div ref={dragRef} className={`px-4 py-4 ${isDragging ? 'opacity-60' : ''}`}>
        <GateKeypad
          armedGate={armedGate}
          onArm={armGate}
          numQubits={numQubits}
          showShortcuts={false}
        />

        <div className="mt-3.5 flex min-h-[1.875rem] items-center">
          {placementHint ? (
            <div className="flex w-full items-center justify-between gap-3 rounded-panel border border-copper-600 bg-copper-900 px-3 py-1.5">
              <span className="font-mono text-readout-sm text-copper-100">{placementHint}</span>
              <button
                type="button"
                onClick={cancelPlacement}
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-tertiary hover:text-copper-200"
              >
                Esc
              </button>
            </div>
          ) : (
            <p className="font-mono text-[10px] leading-relaxed text-ink-faint">
              Pick a gate, then click a wire — or drag it onto one
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
