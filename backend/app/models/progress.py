"""
UserProgress model — tracks mastery of individual quantum concepts.

This is the core of the agentic system's memory. The agent reads this table
to identify weak areas and decide what to teach next. Each row represents the
user's mastery of one specific concept (e.g., "superposition", "entanglement",
"phase_kickback").

Why a separate row per concept instead of a JSON blob: We need to query across
users ("who struggles with entanglement?") and sort by mastery level. Relational
rows make these queries trivial; JSON blobs would require expensive extraction.
"""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Concept identifier — e.g., "superposition", "entanglement", "grover_oracle"
    concept = Column(String(100), nullable=False, index=True)

    # 0.0 = no understanding, 1.0 = full mastery
    mastery_level = Column(Float, default=0.0)

    # How many times the user has practiced this concept
    practice_count = Column(Integer, default=0)

    # How many times the user got it wrong — high error count + low mastery = weak area
    error_count = Column(Integer, default=0)

    last_practiced = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="progress")
