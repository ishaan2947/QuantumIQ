"""
Chat route — the frontend's interface to the agentic AI system.

This route receives the user's message along with their current circuit
context (what they've built on screen), passes it to the agent loop,
and returns the agent's response plus any actions it took.

The circuit_context is critical: it's what makes the agent "circuit-aware."
Every message includes the user's current circuit state so the agent can
reference specific gates and give contextual feedback.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.schemas import ChatMessage, ChatResponse
from app.agent.agent import run_agent

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat_with_agent(
    message: ChatMessage,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Package the user's current circuit state for the agent
    circuit_context = None
    if message.circuit_data:
        circuit_context = {
            "circuit_data": [g.model_dump() for g in message.circuit_data],
            "num_qubits": message.num_qubits or 2,
        }

    # Convert conversation history for the agent
    history = None
    if message.conversation_history:
        history = [{"role": t.role, "content": t.content} for t in message.conversation_history]

    # Run the agentic loop — the agent will autonomously decide which
    # tools to call and how many iterations it needs
    result = await run_agent(
        user_message=message.message,
        user=user,
        db=db,
        circuit_context=circuit_context,
        conversation_history=history,
    )

    return ChatResponse(
        response=result["response"],
        tool_calls=result.get("tool_calls"),
        suggested_circuit=result.get("suggested_circuit"),
        challenge=result.get("challenge"),
    )
