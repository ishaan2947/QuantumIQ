/**
 * CircuitGrid — the main circuit diagram where gates live on qubit wires.
 *
 * Each qubit is a horizontal wire. Gates are rendered as blocks on the wire.
 * The grid is a drop target for gates dragged from the GatePalette.
 *
 * For multi-qubit gates (CNOT, Toffoli), we prompt the user for target qubits.
 * In a production version, you'd have a more sophisticated wire-to-wire
 * drag interaction, but the prompt approach keeps the implementation clean.
 */

import { useDrop } from 'react-dnd';
import { useCircuit } from '../../hooks/useCircuit';
import { GATE_CATALOG, type GateName } from '../../types';
import { Trash2 } from 'lucide-react';

export default function CircuitGrid() {
  const { gates, numQubits, setNumQubits, addGate, removeGate, clearCircuit } = useCircuit();

  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: 'GATE',
    drop: (item: { gate: GateName }) => handleGateDrop(item.gate),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const handleGateDrop = (gateName: GateName) => {
    const gateInfo = GATE_CATALOG[gateName];

    if (gateInfo.qubits === 1) {
      // Single-qubit: pick which qubit wire to place it on
      const qubit = parseInt(prompt(`Which qubit? (0-${numQubits - 1})`) || '0');
      if (qubit >= 0 && qubit < numQubits) {
        addGate(gateName, [qubit]);
      }
    } else if (gateInfo.qubits === 2) {
      // Two-qubit: need control and target
      const control = parseInt(prompt(`Control qubit (0-${numQubits - 1}):`) || '0');
      const target = parseInt(prompt(`Target qubit (0-${numQubits - 1}):`) || '1');
      if (control !== target && control >= 0 && target >= 0 && control < numQubits && target < numQubits) {
        addGate(gateName, [control, target]);
      }
    } else if (gateInfo.qubits === 3) {
      // Three-qubit: two controls + target
      const c1 = parseInt(prompt(`First control qubit (0-${numQubits - 1}):`) || '0');
      const c2 = parseInt(prompt(`Second control qubit (0-${numQubits - 1}):`) || '1');
      const target = parseInt(prompt(`Target qubit (0-${numQubits - 1}):`) || '2');
      if (new Set([c1, c2, target]).size === 3 && [c1, c2, target].every(q => q >= 0 && q < numQubits)) {
        addGate(gateName, [c1, c2, target]);
      }
    }
  };

  return (
    <div className="bg-[#12122a] rounded-xl border border-[#1a1a3e] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Circuit</h3>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400">
            Qubits:
            <select
              value={numQubits}
              onChange={e => setNumQubits(parseInt(e.target.value))}
              className="ml-2 bg-[#0a0a1a] border border-[#2a2a4a] rounded px-2 py-1 text-white text-xs"
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            onClick={clearCircuit}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      {/* Circuit diagram */}
      <div
        ref={dropRef}
        className={`relative min-h-[200px] rounded-lg border-2 border-dashed transition-colors p-4 ${
          isOver ? 'border-quantum-400 bg-quantum-500/5' : 'border-[#2a2a4a]'
        }`}
      >
        {/* Qubit wires */}
        {Array.from({ length: numQubits }).map((_, qubitIdx) => (
          <div key={qubitIdx} className="flex items-center h-14 relative">
            {/* Qubit label */}
            <span className="quantum-notation text-xs text-quantum-300 w-10 flex-shrink-0">
              |q{qubitIdx}⟩
            </span>

            {/* Wire */}
            <div className="flex-1 relative h-[2px] bg-[#2a2a4a] mx-2">
              {/* Gates on this wire */}
              {gates.map((gate, gateIdx) => {
                if (!gate.targets.includes(qubitIdx)) return null;

                const gateInfo = GATE_CATALOG[gate.gate];
                const isControl = gate.targets.length > 1 && gate.targets.indexOf(qubitIdx) < gate.targets.length - 1;

                return (
                  <div
                    key={gateIdx}
                    className="absolute top-1/2 -translate-y-1/2 flex items-center"
                    style={{ left: `${(gateIdx / Math.max(gates.length, 1)) * 85 + 5}%` }}
                  >
                    {isControl ? (
                      // Control dot for multi-qubit gates
                      <div
                        className="w-4 h-4 rounded-full border-2"
                        style={{ borderColor: gateInfo.color, backgroundColor: gateInfo.color }}
                      />
                    ) : (
                      // Gate box
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: gateInfo.color + '30', color: gateInfo.color, border: `1px solid ${gateInfo.color}50` }}
                        onClick={() => removeGate(gateIdx)}
                        title={`${gateInfo.name} — click to remove`}
                      >
                        {gateInfo.symbol}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {gates.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm pointer-events-none">
            Drag gates here to build your circuit
          </div>
        )}
      </div>

      {/* Gate list for easy reference */}
      {gates.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {gates.map((gate, i) => {
            const info = GATE_CATALOG[gate.gate];
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer hover:opacity-70"
                style={{ backgroundColor: info.color + '20', color: info.color }}
                onClick={() => removeGate(i)}
                title="Click to remove"
              >
                {info.symbol}({gate.targets.join(',')})
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
