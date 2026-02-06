"""
Progress and learning plan routes.

These endpoints expose the data the agent writes. The frontend reads them
to show dashboards, progress bars, and the current learning plan.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.progress import UserProgress
from app.models.learning_plan import LearningPlan
from app.models.schemas import ProgressResponse, LearningPlanResponse

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/", response_model=list[ProgressResponse])
async def get_progress(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserProgress).where(UserProgress.user_id == user.id)
    )
    return [ProgressResponse.model_validate(p) for p in result.scalars().all()]


@router.get("/plan", response_model=LearningPlanResponse)
async def get_learning_plan(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(LearningPlan).where(LearningPlan.user_id == user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        return LearningPlanResponse(
            current_topic="superposition",
            plan_data=[],
            agent_notes={},
            updated_at=user.created_at,
        )
    return LearningPlanResponse.model_validate(plan)
