"""
Central model registry. Importing all models here ensures SQLAlchemy
sees them when creating tables or running migrations.
"""

from app.models.user import User, SkillLevel
from app.models.circuit import Circuit
from app.models.progress import UserProgress
from app.models.learning_plan import LearningPlan
from app.models.challenge import ChallengeHistory, ChallengeType

__all__ = [
    "User",
    "SkillLevel",
    "Circuit",
    "UserProgress",
    "LearningPlan",
    "ChallengeHistory",
    "ChallengeType",
]
