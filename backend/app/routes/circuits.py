"""
Circuit CRUD routes and sharing via token links.

Every circuit save is persisted so the agent can reference the user's full
build history when making curriculum decisions.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.circuit import Circuit
from app.models.schemas import CircuitCreate, CircuitUpdate, CircuitResponse

router = APIRouter(prefix="/api/circuits", tags=["circuits"])


@router.post("/", response_model=CircuitResponse)
async def create_circuit(
    data: CircuitCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    circuit = Circuit(
        user_id=user.id,
        name=data.name,
        description=data.description,
        circuit_data=[g.model_dump() for g in data.circuit_data],
        num_qubits=data.num_qubits,
    )
    db.add(circuit)
    await db.flush()
    await db.refresh(circuit)
    return CircuitResponse.model_validate(circuit)


@router.get("/", response_model=list[CircuitResponse])
async def list_circuits(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Circuit).where(Circuit.user_id == user.id).order_by(Circuit.updated_at.desc())
    )
    return [CircuitResponse.model_validate(c) for c in result.scalars().all()]


@router.get("/{circuit_id}", response_model=CircuitResponse)
async def get_circuit(
    circuit_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Circuit).where(Circuit.id == circuit_id, Circuit.user_id == user.id)
    )
    circuit = result.scalar_one_or_none()
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
    return CircuitResponse.model_validate(circuit)


@router.put("/{circuit_id}", response_model=CircuitResponse)
async def update_circuit(
    circuit_id: int,
    data: CircuitUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Circuit).where(Circuit.id == circuit_id, Circuit.user_id == user.id)
    )
    circuit = result.scalar_one_or_none()
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")

    if data.name is not None:
        circuit.name = data.name
    if data.description is not None:
        circuit.description = data.description
    if data.circuit_data is not None:
        circuit.circuit_data = [g.model_dump() for g in data.circuit_data]
    if data.num_qubits is not None:
        circuit.num_qubits = data.num_qubits

    await db.flush()
    await db.refresh(circuit)
    return CircuitResponse.model_validate(circuit)


@router.delete("/{circuit_id}")
async def delete_circuit(
    circuit_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Circuit).where(Circuit.id == circuit_id, Circuit.user_id == user.id)
    )
    circuit = result.scalar_one_or_none()
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
    await db.delete(circuit)
    return {"detail": "Circuit deleted"}


@router.get("/share/{share_token}", response_model=CircuitResponse)
async def get_shared_circuit(share_token: str, db: AsyncSession = Depends(get_db)):
    """Public endpoint — anyone with the share link can view the circuit."""
    result = await db.execute(select(Circuit).where(Circuit.share_token == share_token))
    circuit = result.scalar_one_or_none()
    if not circuit:
        raise HTTPException(status_code=404, detail="Shared circuit not found")
    return CircuitResponse.model_validate(circuit)
