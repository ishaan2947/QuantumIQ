"""
Challenge routes — preset challenges and challenge history.

Preset challenges are hardcoded quantum computing exercises (Bell state,
teleportation, etc.). The agent can also generate dynamic challenges via
the generate_challenge() tool, which creates ChallengeHistory records
with challenge_type=GENERATED.
"""

import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.challenge import ChallengeHistory, ChallengeType
from app.models.schemas import ChallengeStart, ChallengeSubmit, ChallengeResponse
from app.services.quantum_simulator import simulate_circuit


router = APIRouter(prefix="/api/challenges", tags=["challenges"])


# ─── Preset Challenge Definitions ────────────────────────────────────────────
# Each preset defines a target circuit and the concepts it tests.
# The user's submission is simulated and compared against the target's output.

PRESET_CHALLENGES = {
    "bell_state": {
        "name": "Bell State",
        "description": "Create a Bell state (maximally entangled pair). Apply a Hadamard to qubit 0, then a CNOT from qubit 0 to qubit 1. The result should be an equal superposition of |00⟩ and |11⟩.",
        "target_circuit": [
            {"gate": "h", "targets": [0]},
            {"gate": "cx", "targets": [0, 1]},
        ],
        "num_qubits": 2,
        "concepts": ["superposition", "entanglement"],
    },
    "quantum_teleportation": {
        "name": "Quantum Teleportation",
        "description": "Implement the quantum teleportation protocol. Prepare a Bell pair on qubits 1 and 2, then apply CNOT and H on qubit 0 to teleport its state.",
        "target_circuit": [
            {"gate": "h", "targets": [1]},
            {"gate": "cx", "targets": [1, 2]},
            {"gate": "cx", "targets": [0, 1]},
            {"gate": "h", "targets": [0]},
        ],
        "num_qubits": 3,
        "concepts": ["entanglement", "quantum_teleportation", "measurement"],
    },
    "ghz_state": {
        "name": "GHZ State",
        "description": "Create a 3-qubit GHZ state — an equal superposition of |000⟩ and |111⟩. Use a Hadamard and two CNOTs.",
        "target_circuit": [
            {"gate": "h", "targets": [0]},
            {"gate": "cx", "targets": [0, 1]},
            {"gate": "cx", "targets": [0, 2]},
        ],
        "num_qubits": 3,
        "concepts": ["superposition", "entanglement", "multi_qubit_gates"],
    },
    "deutsch_jozsa": {
        "name": "Deutsch-Jozsa (Balanced Oracle)",
        "description": "Implement the Deutsch-Jozsa algorithm for a balanced oracle. Put qubit 0 in superposition, apply a CNOT oracle, then measure.",
        "target_circuit": [
            {"gate": "x", "targets": [1]},
            {"gate": "h", "targets": [0]},
            {"gate": "h", "targets": [1]},
            {"gate": "cx", "targets": [0, 1]},
            {"gate": "h", "targets": [0]},
        ],
        "num_qubits": 2,
        "concepts": ["superposition", "phase", "deutsch_jozsa"],
    },
    "phase_flip": {
        "name": "Phase Flip",
        "description": "Apply a phase flip to a qubit in superposition. Start with H, apply Z, then H again. The qubit should end in the |1⟩ state.",
        "target_circuit": [
            {"gate": "h", "targets": [0]},
            {"gate": "z", "targets": [0]},
            {"gate": "h", "targets": [0]},
        ],
        "num_qubits": 1,
        "concepts": ["superposition", "phase"],
    },
    "grover_2qubit": {
        "name": "Grover's Search (2-qubit)",
        "description": "Implement Grover's algorithm for 2 qubits searching for |11⟩. Apply superposition, oracle (CZ), then diffusion operator.",
        "target_circuit": [
            {"gate": "h", "targets": [0]},
            {"gate": "h", "targets": [1]},
            {"gate": "x", "targets": [0]},
            {"gate": "x", "targets": [1]},
            {"gate": "h", "targets": [1]},
            {"gate": "cx", "targets": [0, 1]},
            {"gate": "h", "targets": [1]},
            {"gate": "x", "targets": [0]},
            {"gate": "x", "targets": [1]},
            {"gate": "h", "targets": [0]},
            {"gate": "h", "targets": [1]},
        ],
        "num_qubits": 2,
        "concepts": ["superposition", "grovers_algorithm", "phase", "multi_qubit_gates"],
    },
}


@router.get("/presets")
async def list_presets():
    """Returns all available preset challenges (no auth required for browsing)."""
    return {
        key: {
            "name": val["name"],
            "description": val["description"],
            "num_qubits": val["num_qubits"],
            "concepts": val["concepts"],
        }
        for key, val in PRESET_CHALLENGES.items()
    }


@router.post("/start", response_model=ChallengeResponse)
async def start_challenge(
    data: ChallengeStart,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    preset = PRESET_CHALLENGES.get(data.challenge_name)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Challenge '{data.challenge_name}' not found")

    challenge = ChallengeHistory(
        user_id=user.id,
        challenge_type=ChallengeType.PRESET,
        challenge_name=preset["name"],
        description=preset["description"],
        target_circuit=preset["target_circuit"],
        concepts_tested=preset["concepts"],
    )
    db.add(challenge)
    await db.flush()
    await db.refresh(challenge)
    return ChallengeResponse.model_validate(challenge)


@router.post("/submit", response_model=ChallengeResponse)
async def submit_challenge(
    data: ChallengeSubmit,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChallengeHistory).where(
            ChallengeHistory.id == data.challenge_id,
            ChallengeHistory.user_id == user.id,
        )
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    user_circuit_data = [g.model_dump() for g in data.user_circuit]
    challenge.user_circuit = user_circuit_data

    if not user_circuit_data:
        raise HTTPException(status_code=400, detail="Cannot submit an empty circuit")

    # Determine num_qubits from the highest qubit index in either circuit
    target_max = max(
        (max(g.get("targets", [0])) for g in challenge.target_circuit),
        default=0,
    )
    user_max = max(
        (max(g["targets"]) for g in user_circuit_data),
        default=0,
    )
    num_qubits = max(target_max, user_max) + 1

    # Compare simulation outputs to score the submission
    target_sim = simulate_circuit(challenge.target_circuit, num_qubits)
    user_sim = simulate_circuit(user_circuit_data, num_qubits)

    # Score: how similar are the probability distributions?
    score = _compute_similarity(target_sim["probabilities"], user_sim["probabilities"])

    challenge.score = score
    challenge.completed = score >= 0.9  # 90% similarity threshold
    challenge.completed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(challenge)
    return ChallengeResponse.model_validate(challenge)


@router.get("/history", response_model=list[ChallengeResponse])
async def challenge_history(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChallengeHistory)
        .where(ChallengeHistory.user_id == user.id)
        .order_by(ChallengeHistory.started_at.desc())
    )
    return [ChallengeResponse.model_validate(c) for c in result.scalars().all()]


def _compute_similarity(target_probs: dict, user_probs: dict) -> float:
    """
    Computes fidelity between two probability distributions.
    Uses Bhattacharyya coefficient: sum(sqrt(p_i * q_i))
    This is 1.0 for identical distributions and 0.0 for completely disjoint.
    """
    all_keys = set(target_probs.keys()) | set(user_probs.keys())
    similarity = sum(
        math.sqrt(target_probs.get(k, 0) * user_probs.get(k, 0))
        for k in all_keys
    )
    return min(similarity, 1.0)
