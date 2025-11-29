"""
Pydantic schemas for request validation and response serialization.

Why separate schemas from SQLAlchemy models: SQLAlchemy models define database
structure. Pydantic schemas define API contracts. Keeping them separate means
we can change the DB schema without breaking the API, and vice versa. This is
the "ports and adapters" pattern — the API boundary is independent of storage.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    skill_level: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ─── Circuits ────────────────────────────────────────────────────────────────

class GateOperation(BaseModel):
    """A single gate application in a circuit."""
    gate: str  # "h", "x", "y", "z", "cx", "ccx"
    targets: list[int]  # qubit indices this gate acts on
    step: Optional[int] = None  # ordering for step-through mode


class CircuitCreate(BaseModel):
    name: str = "Untitled Circuit"
    description: Optional[str] = None
    circuit_data: list[GateOperation]
    num_qubits: int = 2


class CircuitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    circuit_data: Optional[list[GateOperation]] = None
    num_qubits: Optional[int] = None


class CircuitResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    circuit_data: list
    num_qubits: int
    share_token: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Simulation ──────────────────────────────────────────────────────────────

class SimulationRequest(BaseModel):
    circuit_data: list[GateOperation]
    num_qubits: int = 2
    shots: int = 1024


class BlochData(BaseModel):
    """Bloch sphere coordinates for a single qubit."""
    qubit: int
    x: float
    y: float
    z: float


class SimulationResponse(BaseModel):
    statevector: list  # Complex amplitudes as [real, imag] pairs
    probabilities: dict[str, float]  # {"00": 0.5, "11": 0.5}
    bloch_coords: list[BlochData]
    measurement_counts: dict[str, int]  # {"00": 512, "11": 512}


class StepSimulationResponse(BaseModel):
    """Response for step-through mode: state after each gate."""
    steps: list[SimulationResponse]
    gates: list[GateOperation]


# ─── Agent / Chat ────────────────────────────────────────────────────────────

class ConversationTurn(BaseModel):
    role: str
    content: str


class ChatMessage(BaseModel):
    message: str
    circuit_data: Optional[list[GateOperation]] = None
    num_qubits: Optional[int] = 2
    conversation_history: Optional[list[ConversationTurn]] = None


class ChatResponse(BaseModel):
    response: str
    tool_calls: Optional[list[dict]] = None
    suggested_circuit: Optional[list[GateOperation]] = None
    challenge: Optional[dict] = None


# ─── Progress ────────────────────────────────────────────────────────────────

class ProgressResponse(BaseModel):
    concept: str
    mastery_level: float
    practice_count: int
    error_count: int
    last_practiced: Optional[datetime]

    class Config:
        from_attributes = True


class LearningPlanResponse(BaseModel):
    current_topic: str
    plan_data: list
    agent_notes: dict
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Challenges ──────────────────────────────────────────────────────────────

class ChallengeStart(BaseModel):
    challenge_name: str


class ChallengeSubmit(BaseModel):
    challenge_id: int
    user_circuit: list[GateOperation]


class ChallengeResponse(BaseModel):
    id: int
    challenge_name: str
    description: Optional[str]
    challenge_type: str
    target_circuit: Optional[list]
    completed: bool
    score: Optional[float]
    hints_used: int
    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True
