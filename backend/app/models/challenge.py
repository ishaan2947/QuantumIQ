"""
ChallengeHistory model — records every challenge attempted by a user.

This feeds the agent's adaptive difficulty system. By tracking which challenges
were completed, failed, or abandoned, the agent can avoid repeating challenges
the user has mastered and re-assign ones they struggled with.

challenge_type distinguishes between preset challenges (Bell state, teleportation)
and dynamically generated ones the agent creates via generate_challenge().
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Enum, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base


class ChallengeType(str, enum.Enum):
    PRESET = "preset"
    GENERATED = "generated"


class ChallengeHistory(Base):
    __tablename__ = "challenge_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    challenge_type = Column(Enum(ChallengeType), default=ChallengeType.PRESET)
    challenge_name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)

    # What the user needed to build
    target_circuit = Column(JSON, nullable=True)

    # What the user actually built
    user_circuit = Column(JSON, nullable=True)

    completed = Column(Boolean, default=False)
    score = Column(Float, nullable=True)  # 0.0 - 1.0
    hints_used = Column(Integer, default=0)

    # Which concepts this challenge tested — links back to UserProgress
    concepts_tested = Column(JSON, default=list)

    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="challenge_history")
