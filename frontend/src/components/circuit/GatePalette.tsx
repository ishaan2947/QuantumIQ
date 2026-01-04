/**
 * Gate palette — the toolbar where users pick gates to drag onto the circuit.
 *
 * Uses react-dnd for drag-and-drop. Each gate is a draggable item that
 * carries its gate type as the drag payload. The CircuitGrid is the drop target.
 */

import { useDrag } from 'react-dnd';
import { GATE_CATALOG, type GateName } from '../../types';

interface DraggableGateProps {
  gateName: GateName;
}

function DraggableGate({ gateName }: DraggableGateProps) {
  const gate = GATE_CATALOG[gateName];

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: 'GATE',
    item: { gate: gateName },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={dragRef}
      className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-40 scale-95' : 'hover:scale-105'
      }`}
      style={{
        borderColor: gate.color + '40',
        backgroundColor: gate.color + '10',
      }}
      title={gate.description}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-lg"
        style={{ backgroundColor: gate.color + '30', color: gate.color }}
      >
        {gate.symbol}
      </div>
      <span className="text-xs text-gray-400">{gate.name}</span>
      <span className="text-[10px] text-gray-600">
        {gate.qubits === 1 ? '1 qubit' : `${gate.qubits} qubits`}
      </span>
    </div>
  );
}

export default function GatePalette() {
  const gateNames: GateName[] = ['h', 'x', 'y', 'z', 'cx', 'ccx', 's', 't'];

  return (
    <div className="bg-[#12122a] rounded-xl border border-[#1a1a3e] p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Gates</h3>
      <div className="grid grid-cols-4 gap-2">
        {gateNames.map(name => (
          <DraggableGate key={name} gateName={name} />
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-3 text-center">
        Drag gates onto qubit wires to build your circuit
      </p>
    </div>
  );
}
