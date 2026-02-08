"""
Quantum circuit simulation service using Qiskit.

Why Qiskit over a custom simulator: Qiskit is IBM's production quantum SDK
with mathematically verified gate implementations. Writing our own unitary
matrix math would be error-prone and unverifiable. Qiskit gives us correct
statevectors, Bloch coordinates, and measurement sampling out of the box.

The tradeoff: Qiskit is heavy (~200MB). For a lightweight learning platform,
we could use a minimal statevector simulator, but Qiskit's correctness
guarantees and ecosystem (noise models, real hardware access) make it worth it.
"""

import numpy as np
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Statevector, partial_trace, DensityMatrix


# Gate name -> Qiskit method mapping
GATE_MAP = {
    "h": "h",
    "x": "x",
    "y": "y",
    "z": "z",
    "cx": "cx",
    "cnot": "cx",
    "ccx": "ccx",
    "toffoli": "ccx",
    "s": "s",
    "t": "t",
    "sdg": "sdg",
    "tdg": "tdg",
}


def build_qiskit_circuit(circuit_data: list[dict], num_qubits: int) -> QuantumCircuit:
    """
    Converts our JSON gate format into a Qiskit QuantumCircuit.

    Our format: [{"gate": "h", "targets": [0]}, {"gate": "cx", "targets": [0, 1]}]
    This bridges the frontend representation to Qiskit's API.
    """
    qc = QuantumCircuit(num_qubits)

    for gate_op in circuit_data:
        gate_name = gate_op["gate"].lower() if isinstance(gate_op, dict) else gate_op.gate.lower()
        targets = gate_op["targets"] if isinstance(gate_op, dict) else gate_op.targets

        qiskit_gate = GATE_MAP.get(gate_name)
        if qiskit_gate is None:
            raise ValueError(f"Unknown gate: {gate_name}")

        # Apply the gate to the specified qubits
        getattr(qc, qiskit_gate)(*targets)

    return qc


def compute_bloch_coordinates(statevector: Statevector, num_qubits: int) -> list[dict]:
    """
    Extracts Bloch sphere (x, y, z) coordinates for each qubit.

    This requires partial tracing — reducing the multi-qubit state to a
    single-qubit density matrix for each qubit. The Bloch vector is then
    extracted from the density matrix using the Pauli decomposition:
        x = Tr(rho * X), y = Tr(rho * Y), z = Tr(rho * Z)
    """
    bloch_data = []

    for qubit in range(num_qubits):
        # Partial trace over all qubits except this one
        # Qiskit uses little-endian ordering, so we trace out the complement
        keep = [qubit]
        trace_out = [q for q in range(num_qubits) if q not in keep]

        if trace_out:
            rho = partial_trace(statevector, trace_out)
        else:
            rho = DensityMatrix(statevector)

        # Extract Bloch vector from density matrix
        rho_matrix = rho.data

        # Pauli matrices
        x_val = 2 * np.real(rho_matrix[0, 1])
        y_val = 2 * np.imag(rho_matrix[1, 0])
        z_val = np.real(rho_matrix[0, 0] - rho_matrix[1, 1])

        bloch_data.append({
            "qubit": qubit,
            "x": float(np.clip(x_val, -1, 1)),
            "y": float(np.clip(y_val, -1, 1)),
            "z": float(np.clip(z_val, -1, 1)),
        })

    return bloch_data


def simulate_circuit(circuit_data: list[dict], num_qubits: int, shots: int = 1024) -> dict:
    """
    Full simulation: statevector, probabilities, Bloch coordinates, and measurements.

    Returns everything the frontend needs to render the circuit state.
    """
    qc = build_qiskit_circuit(circuit_data, num_qubits)

    # Get exact statevector (no sampling noise)
    sv = Statevector.from_instruction(qc)
    probs = sv.probabilities_dict()

    # Bloch sphere coordinates for each qubit
    bloch = compute_bloch_coordinates(sv, num_qubits)

    # Sampled measurement results (simulates real quantum measurement)
    qc_measured = qc.copy()
    qc_measured.measure_all()
    simulator = AerSimulator()
    result = simulator.run(qc_measured, shots=shots).result()
    counts = result.get_counts()

    # Convert statevector to JSON-serializable format: [[real, imag], ...]
    sv_list = [[float(np.real(a)), float(np.imag(a))] for a in sv.data]

    return {
        "statevector": sv_list,
        "probabilities": {k: float(v) for k, v in probs.items()},
        "bloch_coords": bloch,
        "measurement_counts": counts,
    }


def simulate_step_by_step(circuit_data: list[dict], num_qubits: int) -> list[dict]:
    """
    Simulates the circuit gate-by-gate for step-through animation mode.

    Returns a list of simulation results, one per gate. The frontend uses
    this to animate the Bloch sphere and probability bars as each gate
    is applied sequentially.
    """
    steps = []

    # Initial state (all |0>)
    initial = simulate_circuit([], num_qubits, shots=1024)
    steps.append(initial)

    # Apply gates one at a time
    for i in range(1, len(circuit_data) + 1):
        partial_circuit = circuit_data[:i]
        step_result = simulate_circuit(partial_circuit, num_qubits, shots=1024)
        steps.append(step_result)

    return steps
