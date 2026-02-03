"""
User model — core identity for the platform.

Schema decisions:
- skill_level as an enum rather than free text to constrain valid states
- created_at/updated_at for audit trails and "member since" features
- Email uniqueness enforced at the DB level, not just application level
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship

from app.core.database import Base


class SkillLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    skill_level = Column(Enum(SkillLevel), default=SkillLevel.BEGINNER)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships — lazy="selectin" avoids N+1 queries by loading related
    # objects in a single additional SELECT instead of one per parent row.
    circuits = relationship("Circuit", back_populates="user", lazy="selectin")
    progress = relationship("UserProgress", back_populates="user", lazy="selectin")
    learning_plan = relationship("LearningPlan", back_populates="user", uselist=False, lazy="selectin")
    challenge_history = relationship("ChallengeHistory", back_populates="user", lazy="selectin")
