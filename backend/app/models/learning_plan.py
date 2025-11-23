"""
LearningPlan model — the agent's personalized curriculum for each user.

This is what makes the system genuinely agentic: the AI doesn't just answer
questions — it writes back a structured learning plan that evolves over time.
The agent calls update_learning_plan() to modify this after every interaction,
adjusting the curriculum based on observed performance.

One plan per user (1:1 relationship). The plan_data JSON contains an ordered
list of topics with target mastery levels and completion status.
"""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class LearningPlan(Base):
    __tablename__ = "learning_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Current focus area the agent has identified
    current_topic = Column(String(100), default="superposition")

    # Ordered curriculum — the agent rewrites this as the user progresses
    # Example: [{"topic": "superposition", "target_mastery": 0.8, "completed": false}, ...]
    plan_data = Column(JSON, default=list)

    # Agent's internal notes about the user's learning style and patterns
    agent_notes = Column(JSON, default=dict)

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="learning_plan")
