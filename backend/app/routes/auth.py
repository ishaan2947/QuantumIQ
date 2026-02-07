"""
Authentication routes — registration and login.

Design: returns both a JWT token and user data on login/register so the
frontend can immediately populate the UI without a second request.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User
from app.models.learning_plan import LearningPlan
from app.models.schemas import UserCreate, UserLogin, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Default curriculum for new users — the agent will personalize this over time
DEFAULT_CURRICULUM = [
    {"topic": "superposition", "target_mastery": 0.8, "completed": False},
    {"topic": "measurement", "target_mastery": 0.8, "completed": False},
    {"topic": "entanglement", "target_mastery": 0.8, "completed": False},
    {"topic": "phase", "target_mastery": 0.7, "completed": False},
    {"topic": "multi_qubit_gates", "target_mastery": 0.7, "completed": False},
    {"topic": "quantum_teleportation", "target_mastery": 0.6, "completed": False},
    {"topic": "grovers_algorithm", "target_mastery": 0.6, "completed": False},
    {"topic": "deutsch_jozsa", "target_mastery": 0.6, "completed": False},
]


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check for existing email/username
    existing = await db.execute(
        select(User).where((User.email == user_data.email) | (User.username == user_data.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or username already registered")

    # Create user
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
    )
    db.add(user)
    await db.flush()  # Get the user.id before creating related records

    # Initialize a learning plan — the agent will customize this
    plan = LearningPlan(
        user_id=user.id,
        current_topic="superposition",
        plan_data=DEFAULT_CURRICULUM,
        agent_notes={"learning_style": "unknown", "session_count": 0},
    )
    db.add(plan)

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
