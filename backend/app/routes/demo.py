"""
Public demo route — an unauthenticated, rate-limited slice of the AI tutor.

This is deliberately NOT the agent from app/agent/agent.py. That agent runs a
multi-iteration tool-calling loop against gpt-4o and reads/writes the user's
progress in Postgres — it needs an account, and one conversation can easily
cost 10-20 model calls. Neither is appropriate for a landing page that
strangers can hit.

What this endpoint is instead: a single-shot gpt-4o-mini completion, no tools,
no database, capped output length, wrapped in three independent limits:

  1. Session cap   — 5 messages per browser session (honest-visitor UX)
  2. IP limits     — burst + hourly, per client address (abuse protection)
  3. Daily budget  — a global ceiling that bounds the OpenAI bill outright

Layers 1 and 2 are the ones a visitor sees. Layer 3 is the one that means a
determined abuser still can't run up a bill worth caring about.
"""

import logging

from fastapi import APIRouter, HTTPException, Request, status
from openai import AsyncOpenAI, APIError, AuthenticationError, RateLimitError

from app.core.config import get_settings
from app.core.rate_limit import (
    DailyBudget,
    SessionCounter,
    SlidingWindowLimiter,
    client_ip,
)
from app.models.schemas import (
    DemoChatRequest,
    DemoChatResponse,
    DemoStatusResponse,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/demo", tags=["demo"])

# ─── Limiter instances ───────────────────────────────────────────────────────
# Module-level so they persist across requests within the process. See the
# note in rate_limit.py about running a single worker.

_sessions = SessionCounter(limit=settings.demo_session_limit)
_ip_burst = SlidingWindowLimiter(
    limit=settings.demo_ip_burst_limit,
    window_seconds=settings.demo_ip_burst_window_seconds,
)
_ip_hourly = SlidingWindowLimiter(
    limit=settings.demo_ip_limit,
    window_seconds=settings.demo_ip_window_seconds,
)
_budget = DailyBudget(limit=settings.demo_daily_budget)

_client: AsyncOpenAI | None = None


def _openai() -> AsyncOpenAI:
    """Lazily built so a missing key fails per-request, not at import time."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=30.0)
    return _client


DEMO_SYSTEM_PROMPT = """You are QuantumIQ - a sharp, friendly quantum computing tutor embedded in a live demo on a landing page.

RULES:
1. Be CONCISE. Two short paragraphs maximum. The chat window is small.
2. Be CONCRETE. If the visitor has gates on the circuit, explain using THEIR circuit.
3. Use ket notation naturally: |0>, |1>, |+>, |->. Use Unicode for math (pi/2, sqrt 2) - never LaTeX.
4. Use **bold** for key terms and `code` for gate names.
5. End with a short, specific suggestion of what to try next on the circuit.
6. If asked something off-topic, redirect to quantum computing in one friendly line.

You are a preview of the full tutor. The full version tracks the learner's
progress across sessions, generates personalised challenges, and uses tools to
inspect their circuit - mention that only if the visitor asks what else it does."""


def _describe_circuit(req: DemoChatRequest) -> str:
    """
    Compact, token-cheap description of what's on the visitor's canvas.

    A structured JSON dump would cost more tokens and read worse to the model
    than one plain-English line, and the demo circuit is at most a handful of
    gates, so a sentence is enough.
    """
    num = req.num_qubits or 2

    if not req.circuit_data:
        return f"The visitor's circuit is empty ({num} qubits, all in |0>)."

    parts = []
    for gate in req.circuit_data[:20]:
        targets = ", ".join(f"q{t}" for t in gate.targets)
        parts.append(f"{gate.gate.upper()}({targets})")

    return (
        f"The visitor's circuit has {num} qubits and these gates in order: "
        + " -> ".join(parts)
        + "."
    )


def _sanitize_history(req: DemoChatRequest) -> list[dict]:
    """
    The client echoes conversation history back to us, so treat it as
    untrusted input: clamp the number of turns, clamp each turn's length, and
    drop anything claiming a role we don't expect (notably "system", which
    would let a visitor rewrite the tutor's instructions).
    """
    if not req.history:
        return []

    turns = req.history[-settings.demo_history_turns:]
    cleaned = []
    for turn in turns:
        if turn.role not in ("user", "assistant"):
            continue
        content = turn.content.strip()[: settings.demo_max_message_chars]
        if content:
            cleaned.append({"role": turn.role, "content": content})

    return cleaned


def _too_many(detail: str, limit_type: str, retry_after: int | None = None) -> HTTPException:
    headers = {"Retry-After": str(retry_after)} if retry_after else None
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={"message": detail, "limit_type": limit_type},
        headers=headers,
    )


@router.get("/status", response_model=DemoStatusResponse)
async def demo_status(session_id: str = ""):
    """
    Lets the frontend re-sync its counter after a page reload without spending
    a message. The client tracks the count itself for instant feedback; this
    is the authoritative number.
    """
    used = _sessions.used(session_id[:100]) if session_id else 0

    return DemoStatusResponse(
        enabled=settings.demo_enabled and bool(settings.openai_api_key),
        messages_used=used,
        messages_remaining=max(0, settings.demo_session_limit - used),
        limit=settings.demo_session_limit,
        repo_url=settings.demo_repo_url,
    )


@router.post("/chat", response_model=DemoChatResponse)
async def demo_chat(payload: DemoChatRequest, request: Request):
    if not settings.demo_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"message": "The demo tutor is currently disabled.", "limit_type": "disabled"},
        )

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "message": "The demo tutor isn't configured on this deployment.",
                "limit_type": "unconfigured",
            },
        )

    # ─── Input validation ────────────────────────────────────────────────
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail={"message": "Message cannot be empty."})
    if len(message) > settings.demo_max_message_chars:
        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    f"Demo messages are capped at {settings.demo_max_message_chars} characters."
                )
            },
        )

    session_id = payload.session_id.strip()[:100]
    if not session_id:
        raise HTTPException(status_code=400, detail={"message": "Missing session id."})

    # ─── Limit checks, cheapest and most user-facing first ───────────────
    # The session cap is checked before the IP limiters on purpose: a visitor
    # who has legitimately used their five messages shouldn't burn IP quota to
    # be told so. An abuser rotating session ids never trips this check and
    # falls straight through to the IP limiters, which is the point.
    used = _sessions.used(session_id)
    if used >= settings.demo_session_limit:
        raise _too_many(
            f"You've used all {settings.demo_session_limit} demo messages for this session.",
            "session",
        )

    ip = client_ip(request, trust_proxy=settings.trust_proxy_headers)

    allowed, retry_after = _ip_burst.hit(ip)
    if not allowed:
        raise _too_many(
            "You're sending messages a little too quickly - give it a moment.",
            "burst",
            retry_after,
        )

    allowed, retry_after = _ip_hourly.hit(ip)
    if not allowed:
        raise _too_many(
            "This network has hit the hourly demo limit. Try again later, or run QuantumIQ locally.",
            "ip",
            retry_after,
        )

    if not _budget.consume():
        raise _too_many(
            "The demo has hit its daily message budget. It resets at midnight UTC.",
            "global",
        )

    # Spend the session message only once every other gate has passed.
    consumed, used = _sessions.consume(session_id)
    if not consumed:
        _budget.refund()
        raise _too_many(
            f"You've used all {settings.demo_session_limit} demo messages for this session.",
            "session",
        )

    # ─── Model call ──────────────────────────────────────────────────────
    messages: list[dict] = [{"role": "system", "content": DEMO_SYSTEM_PROMPT}]
    messages.append({"role": "system", "content": _describe_circuit(payload)})
    messages.extend(_sanitize_history(payload))
    messages.append({"role": "user", "content": message})

    try:
        completion = await _openai().chat.completions.create(
            model=settings.demo_model,
            messages=messages,
            temperature=0.6,
            max_tokens=settings.demo_max_output_tokens,
        )
        answer = (completion.choices[0].message.content or "").strip()
    except AuthenticationError:
        # Refund on our side: a visitor should never lose part of their
        # five-message allowance to our failure.
        _sessions.refund(session_id)
        _budget.refund()
        logger.error("Demo chat failed: OpenAI rejected the API key")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "message": "The demo tutor isn't configured correctly.",
                "limit_type": "unconfigured",
            },
        )
    except RateLimitError:
        _sessions.refund(session_id)
        _budget.refund()
        logger.warning("Demo chat failed: upstream OpenAI rate limit")
        raise _too_many("The tutor is busy right now. Try again in a few seconds.", "upstream", 10)
    except (APIError, Exception) as exc:  # noqa: B014 - APIError named for clarity
        _sessions.refund(session_id)
        _budget.refund()
        logger.exception("Demo chat failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"message": "The tutor couldn't answer just then. Please try again."},
        )

    if not answer:
        _sessions.refund(session_id)
        _budget.refund()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"message": "The tutor returned an empty response. Please try again."},
        )

    return DemoChatResponse(
        response=answer,
        messages_used=used,
        messages_remaining=max(0, settings.demo_session_limit - used),
        limit=settings.demo_session_limit,
    )
