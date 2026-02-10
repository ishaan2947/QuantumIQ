"""
Agent tool executor — implements the actual logic behind each tool call.

When the LLM decides to call a tool, this module executes it against real
data (database reads/writes, circuit simulation, doc search). The results
are fed back to the LLM so it can incorporate real-time information into
its response.

This separation (tool definitions in tools.py, execution here) follows
the single-responsibility principle and makes each tool independently testable.
"""

import json
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.progress import UserProgress
from app.models.learning_plan import LearningPlan
from app.models.challenge import ChallengeHistory, ChallengeType
from app.models.user import User
from app.services.quantum_simulator import simulate_circuit


# ─── Quantum documentation knowledge base ────────────────────────────────────
# In production, this would be a vector database (Pinecone/pgvector) with
# embedded textbook content. For now, a curated knowledge base that gives
# the agent grounded, accurate information to cite in explanations.

QUANTUM_DOCS = {
    "superposition": {
        "title": "Quantum Superposition",
        "content": "A quantum bit (qubit) can exist in a superposition of |0⟩ and |1⟩ states simultaneously, represented as α|0⟩ + β|1⟩ where |α|² + |β|² = 1. The Hadamard gate (H) creates an equal superposition from a basis state: H|0⟩ = (|0⟩ + |1⟩)/√2. Upon measurement, the qubit collapses to |0⟩ with probability |α|² or |1⟩ with probability |β|². This is fundamentally different from classical probability — the qubit genuinely exists in both states until measured.",
    },
    "entanglement": {
        "title": "Quantum Entanglement",
        "content": "Entanglement is a quantum correlation between two or more qubits where the state of one qubit cannot be described independently of the others. A Bell state (|00⟩ + |11⟩)/√2 is the simplest entangled state — measuring one qubit instantly determines the other's state regardless of distance. Created using H + CNOT: apply Hadamard to qubit 0, then CNOT with qubit 0 as control and qubit 1 as target. Entanglement is a resource for quantum teleportation, superdense coding, and quantum error correction.",
    },
    "measurement": {
        "title": "Quantum Measurement",
        "content": "Measurement in quantum computing collapses a qubit's superposition into a definite classical state. For a qubit in state α|0⟩ + β|1⟩, measurement yields |0⟩ with probability |α|² and |1⟩ with probability |β|². Measurement is irreversible — it destroys the superposition. In the computational basis, measurement projects onto |0⟩ or |1⟩. Multi-qubit measurements can partially collapse entangled states, affecting all correlated qubits simultaneously.",
    },
    "phase": {
        "title": "Quantum Phase",
        "content": "Phase is a uniquely quantum property with no classical analog. In the state α|0⟩ + β|1⟩, the relative phase between α and β affects interference but not measurement probabilities directly. The Z gate adds a phase of π to |1⟩: Z|1⟩ = -|1⟩. The S gate adds π/2 and the T gate adds π/4. Phase kickback is a crucial technique where a controlled gate's phase shifts back to the control qubit — this is the core mechanism behind quantum algorithms like Deutsch-Jozsa and Grover's search.",
    },
    "multi_qubit_gates": {
        "title": "Multi-Qubit Gates",
        "content": "CNOT (Controlled-NOT) flips the target qubit if the control qubit is |1⟩. It's the fundamental two-qubit gate for creating entanglement. Toffoli (CCX/CCNOT) is a three-qubit gate that flips the target only if both controls are |1⟩ — it's universal for classical computation and key for quantum error correction. SWAP exchanges two qubits' states. Any multi-qubit unitary can be decomposed into single-qubit gates plus CNOTs.",
    },
    "quantum_teleportation": {
        "title": "Quantum Teleportation",
        "content": "Quantum teleportation transfers a qubit's state from one location to another using entanglement and classical communication. Protocol: (1) Alice and Bob share a Bell pair. (2) Alice entangles her unknown qubit with her half of the Bell pair using CNOT + H. (3) Alice measures both her qubits, getting 2 classical bits. (4) Alice sends these bits to Bob. (5) Bob applies corrections (X and/or Z) based on Alice's bits. The unknown state is now on Bob's qubit. No faster-than-light communication — the classical bits must still be sent normally.",
    },
    "grovers_algorithm": {
        "title": "Grover's Search Algorithm",
        "content": "Grover's algorithm searches an unstructured database of N items in O(√N) time — a quadratic speedup over classical O(N). Steps: (1) Initialize all qubits in equal superposition with H gates. (2) Apply the oracle, which flips the sign of the target state. (3) Apply the diffusion operator (inversion about the mean), which amplifies the target state's amplitude. (4) Repeat steps 2-3 approximately √N times. (5) Measure to find the target with high probability. The oracle is problem-specific; the diffusion operator is always H⊗n · (2|0⟩⟨0| - I) · H⊗n.",
    },
    "deutsch_jozsa": {
        "title": "Deutsch-Jozsa Algorithm",
        "content": "The Deutsch-Jozsa algorithm determines whether a function f:{0,1}ⁿ → {0,1} is constant (same output for all inputs) or balanced (equal 0s and 1s) using just one query — an exponential speedup over classical algorithms that need 2^(n-1)+1 queries in the worst case. Circuit: (1) Prepare ancilla qubit in |1⟩ with X gate. (2) Apply H to all qubits. (3) Apply the oracle Uf. (4) Apply H to input qubits. (5) Measure input qubits — all |0⟩ means constant, anything else means balanced. This works via phase kickback from the ancilla qubit.",
    },
}


async def execute_tool(
    tool_name: str,
    tool_args: dict,
    user: User,
    db: AsyncSession,
    circuit_context: dict | None = None,
) -> str:
    """
    Dispatches a tool call to the appropriate handler and returns
    the result as a JSON string for the LLM to consume.
    """
    handlers = {
        "get_user_circuit": _get_user_circuit,
        "get_user_progress": _get_user_progress,
        "generate_challenge": _generate_challenge,
        "search_quantum_docs": _search_quantum_docs,
        "update_learning_plan": _update_learning_plan,
        "update_user_progress": _update_user_progress,
    }

    handler = handlers.get(tool_name)
    if not handler:
        return json.dumps({"error": f"Unknown tool: {tool_name}"})

    result = await handler(
        args=tool_args,
        user=user,
        db=db,
        circuit_context=circuit_context,
    )
    return json.dumps(result)


async def _get_user_circuit(args: dict, user: User, db: AsyncSession, circuit_context: dict | None) -> dict:
    """Returns the user's current circuit from the active session."""
    if circuit_context:
        return {
            "circuit_data": circuit_context.get("circuit_data", []),
            "num_qubits": circuit_context.get("num_qubits", 2),
            "gate_count": len(circuit_context.get("circuit_data", [])),
        }
    return {"circuit_data": [], "num_qubits": 2, "gate_count": 0, "note": "No circuit in current session"}


async def _get_user_progress(args: dict, user: User, db: AsyncSession, circuit_context: dict | None) -> dict:
    """Retrieves the user's full learning progress from the database."""
    result = await db.execute(
        select(UserProgress).where(UserProgress.user_id == user.id)
    )
    progress_records = result.scalars().all()

    plan_result = await db.execute(
        select(LearningPlan).where(LearningPlan.user_id == user.id)
    )
    plan = plan_result.scalar_one_or_none()

    progress_data = [
        {
            "concept": p.concept,
            "mastery_level": p.mastery_level,
            "practice_count": p.practice_count,
            "error_count": p.error_count,
            "last_practiced": p.last_practiced.isoformat() if p.last_practiced else None,
        }
        for p in progress_records
    ]

    # Identify weak areas — concepts with low mastery and high error rates
    weak_areas = [
        p["concept"] for p in progress_data
        if p["mastery_level"] < 0.5 or (p["error_count"] > p["practice_count"] * 0.4)
    ]

    return {
        "skill_level": user.skill_level.value if user.skill_level else "beginner",
        "progress": progress_data,
        "weak_areas": weak_areas,
        "current_topic": plan.current_topic if plan else "superposition",
        "learning_plan": plan.plan_data if plan else [],
        "agent_notes": plan.agent_notes if plan else {},
        "total_concepts_practiced": len(progress_data),
    }


async def _generate_challenge(args: dict, user: User, db: AsyncSession, circuit_context: dict | None) -> dict:
    """
    Generates a personalized challenge targeting the specified concept.
    The challenge is saved to the database for tracking.
    """
    concept = args.get("concept", "superposition")
    difficulty = args.get("difficulty", "easy")

    # Challenge templates by concept and difficulty
    challenges = {
        "superposition": {
            "easy": {
                "name": "Create Superposition",
                "description": "Apply a Hadamard gate to put qubit 0 into an equal superposition of |0⟩ and |1⟩.",
                "target_circuit": [{"gate": "h", "targets": [0]}],
                "num_qubits": 1,
            },
            "medium": {
                "name": "Dual Superposition",
                "description": "Put both qubit 0 and qubit 1 into equal superposition independently (no entanglement).",
                "target_circuit": [{"gate": "h", "targets": [0]}, {"gate": "h", "targets": [1]}],
                "num_qubits": 2,
            },
            "hard": {
                "name": "Superposition and Phase",
                "description": "Create a superposition on qubit 0, apply a phase shift with S gate, then Hadamard again. What state do you get?",
                "target_circuit": [{"gate": "h", "targets": [0]}, {"gate": "s", "targets": [0]}, {"gate": "h", "targets": [0]}],
                "num_qubits": 1,
            },
        },
        "entanglement": {
            "easy": {
                "name": "Basic Bell State",
                "description": "Create a Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2 using Hadamard and CNOT.",
                "target_circuit": [{"gate": "h", "targets": [0]}, {"gate": "cx", "targets": [0, 1]}],
                "num_qubits": 2,
            },
            "medium": {
                "name": "Bell State |Ψ+⟩",
                "description": "Create the Bell state |Ψ+⟩ = (|01⟩ + |10⟩)/√2. Hint: start by flipping one qubit.",
                "target_circuit": [{"gate": "x", "targets": [0]}, {"gate": "h", "targets": [0]}, {"gate": "cx", "targets": [0, 1]}],
                "num_qubits": 2,
            },
            "hard": {
                "name": "3-Qubit GHZ State",
                "description": "Create a GHZ state (|000⟩ + |111⟩)/√2 — entangle all three qubits.",
                "target_circuit": [{"gate": "h", "targets": [0]}, {"gate": "cx", "targets": [0, 1]}, {"gate": "cx", "targets": [0, 2]}],
                "num_qubits": 3,
            },
        },
        "phase": {
            "easy": {
                "name": "Phase Flip Observation",
                "description": "Apply H, then Z, then H to qubit 0. Observe how phase affects measurement in a different basis.",
                "target_circuit": [{"gate": "h", "targets": [0]}, {"gate": "z", "targets": [0]}, {"gate": "h", "targets": [0]}],
                "num_qubits": 1,
            },
            "medium": {
                "name": "T Gate Phase",
                "description": "Apply H then T gate to explore π/4 phase rotations. Compare the Bloch sphere to the Z gate version.",
                "target_circuit": [{"gate": "h", "targets": [0]}, {"gate": "t", "targets": [0]}],
                "num_qubits": 1,
            },
            "hard": {
                "name": "Phase Kickback",
                "description": "Demonstrate phase kickback: prepare target in |−⟩ state, then apply CNOT. Observe the phase shift on the control qubit.",
                "target_circuit": [{"gate": "x", "targets": [1]}, {"gate": "h", "targets": [1]}, {"gate": "h", "targets": [0]}, {"gate": "cx", "targets": [0, 1]}],
                "num_qubits": 2,
            },
        },
    }

    template = challenges.get(concept, challenges["superposition"]).get(difficulty, challenges["superposition"]["easy"])

    # Save to database
    challenge = ChallengeHistory(
        user_id=user.id,
        challenge_type=ChallengeType.GENERATED,
        challenge_name=template["name"],
        description=template["description"],
        target_circuit=template["target_circuit"],
        concepts_tested=[concept],
    )
    db.add(challenge)
    await db.flush()
    await db.refresh(challenge)

    return {
        "challenge_id": challenge.id,
        "name": template["name"],
        "description": template["description"],
        "num_qubits": template["num_qubits"],
        "concept": concept,
        "difficulty": difficulty,
    }


async def _search_quantum_docs(args: dict, user: User, db: AsyncSession, circuit_context: dict | None) -> dict:
    """Searches the quantum documentation knowledge base."""
    query = args.get("query", "").lower()

    results = []
    for key, doc in QUANTUM_DOCS.items():
        # Simple keyword matching — in production, use vector similarity
        if any(word in doc["content"].lower() or word in doc["title"].lower() for word in query.split()):
            results.append(doc)

    if not results:
        # Return the most relevant doc based on partial matching
        for key, doc in QUANTUM_DOCS.items():
            if key in query or query in key:
                results.append(doc)

    return {
        "query": query,
        "results": results[:3],  # Top 3 matches
        "total_found": len(results),
    }


async def _update_learning_plan(args: dict, user: User, db: AsyncSession, circuit_context: dict | None) -> dict:
    """Updates the user's learning plan — this is the agent writing back to the system."""
    result = await db.execute(
        select(LearningPlan).where(LearningPlan.user_id == user.id)
    )
    plan = result.scalar_one_or_none()

    if not plan:
        plan = LearningPlan(user_id=user.id)
        db.add(plan)

    if "current_topic" in args:
        plan.current_topic = args["current_topic"]
    if "plan_updates" in args and args["plan_updates"]:
        # Merge updates into existing plan data by topic key
        existing = plan.plan_data or []
        updates = args["plan_updates"]

        # Build a lookup by topic for efficient merging
        plan_map = {}
        for item in existing:
            if isinstance(item, dict) and "topic" in item:
                plan_map[item["topic"]] = item

        # Apply updates — overwrite matching topics, append new ones
        if isinstance(updates, dict):
            for topic, data in updates.items():
                if isinstance(data, dict):
                    plan_map[topic] = {**plan_map.get(topic, {}), **data, "topic": topic}
                else:
                    plan_map[topic] = {"topic": topic, "completed": bool(data)}
        elif isinstance(updates, list):
            for item in updates:
                if isinstance(item, dict) and "topic" in item:
                    plan_map[item["topic"]] = {**plan_map.get(item["topic"], {}), **item}

        plan.plan_data = list(plan_map.values())
    if "agent_notes" in args and args["agent_notes"]:
        existing_notes = plan.agent_notes or {}
        existing_notes.update(args["agent_notes"])
        plan.agent_notes = existing_notes

    await db.flush()

    return {
        "status": "updated",
        "current_topic": plan.current_topic,
        "message": f"Learning plan updated. Now focusing on: {plan.current_topic}",
    }


async def _update_user_progress(args: dict, user: User, db: AsyncSession, circuit_context: dict | None) -> dict:
    """Updates mastery level for a specific concept."""
    concept = args.get("concept")
    if not concept:
        return {"error": "concept is required"}

    result = await db.execute(
        select(UserProgress).where(
            UserProgress.user_id == user.id,
            UserProgress.concept == concept,
        )
    )
    progress = result.scalar_one_or_none()

    if not progress:
        progress = UserProgress(user_id=user.id, concept=concept)
        db.add(progress)

    if "mastery_delta" in args:
        progress.mastery_level = max(0.0, min(1.0, progress.mastery_level + args["mastery_delta"]))
    if args.get("practiced"):
        progress.practice_count += 1
        progress.last_practiced = datetime.now(timezone.utc)
    if args.get("error"):
        progress.error_count += 1

    await db.flush()

    return {
        "concept": concept,
        "new_mastery_level": progress.mastery_level,
        "practice_count": progress.practice_count,
        "error_count": progress.error_count,
    }
