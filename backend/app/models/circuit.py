"""
Circuit model — persists every circuit a user builds.

Why store circuit_data as JSON: Quantum circuits have variable structure (different
numbers of qubits, gates, and orderings). A rigid relational schema would require
complex join tables. JSON gives us flexibility while PostgreSQL's JSONB type still
allows indexing and querying into the structure if needed.

The share_token enables shareable circuit links — a UUID token that maps to a
circuit without exposing internal IDs.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class Circuit(Base):
    __tablename__ = "circuits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), default="Untitled Circuit")
    description = Column(Text, nullable=True)

    # The actual circuit: list of gate operations with qubit targets
    # Example: [{"gate": "h", "targets": [0]}, {"gate": "cx", "targets": [0, 1]}]
    circuit_data = Column(JSON, nullable=False, default=list)

    num_qubits = Column(Integer, default=2)
    share_token = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="circuits")
