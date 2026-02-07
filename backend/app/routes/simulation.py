"""
Simulation routes — run circuits through Qiskit and return visualization data.

Two modes:
1. Full simulation — returns final state (statevector, probabilities, Bloch)
2. Step-through — returns state after each gate for animation playback

These are POST endpoints because the circuit data is in the request body.
GET would require encoding circuit JSON in query params, which is ugly and
hits URL length limits for complex circuits.
"""

from fastapi import APIRouter

from app.models.schemas import SimulationRequest, SimulationResponse, StepSimulationResponse
from app.services.quantum_simulator import simulate_circuit, simulate_step_by_step

router = APIRouter(prefix="/api/simulate", tags=["simulation"])


@router.post("/", response_model=SimulationResponse)
async def run_simulation(request: SimulationRequest):
    circuit_data = [g.model_dump() for g in request.circuit_data]
    result = simulate_circuit(circuit_data, request.num_qubits, request.shots)
    return SimulationResponse(**result)


@router.post("/step", response_model=StepSimulationResponse)
async def run_step_simulation(request: SimulationRequest):
    circuit_data = [g.model_dump() for g in request.circuit_data]
    steps = simulate_step_by_step(circuit_data, request.num_qubits)

    return StepSimulationResponse(
        steps=[SimulationResponse(**s) for s in steps],
        gates=request.circuit_data,
    )
