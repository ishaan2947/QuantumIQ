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
from app.services.quantum_simulator import simulate_circuit

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
3. The next system message gives you the circuit's EXACT simulated probabilities
   and Bloch coordinates. These are ground truth, computed by Qiskit, not an
   estimate. Read the numbers and report them - do not derive, recompute, or
   guess the resulting state from the gate list yourself, and do not "simplify"
   a probability you were given. If your own reasoning about what a gate
   sequence should produce conflicts with the numbers you were handed, the
   numbers are correct and your reasoning is not.
4. Use ket notation naturally: |0>, |1>, |+>, |->. Use Unicode for math (pi/2, sqrt 2) - never LaTeX.
5. Use **bold** for key terms and `code` for gate names.
6. End with a short, specific suggestion of what to try next on the circuit.
7. If asked something off-topic, redirect to quantum computing in one friendly line.

You are a preview of the full tutor. The full version tracks the learner's
progress across sessions, generates personalised challenges, and uses tools to
inspect their circuit - mention that only if the visitor asks what else it does."""


def _describe_circuit(req: DemoChatRequest) -> str:
    """
    Description of the visitor's circuit, grounded in an actual simulation
    rather than left for the model to work out.

    Earlier this only listed the gates and let gpt-4o-mini infer the
    resulting state from them — which it does unreliably. Asked about a Bell
    state (H then CX), it has confidently answered "|00> + |01>" (not
    entangled) instead of the correct |00> + |11>. The circuit is small
    enough (<=4 qubits, <=12 gates, per DEMO_MAX_*) that actually running it
    through the same Qiskit path the authenticated Lab uses costs
    microseconds, so there's no reason to let the model guess.

    Falls back to a bare gate list if simulation fails for any reason (a
    malformed request that slipped past validation, say) — a slightly less
    grounded answer beats a broken demo.
    """
    num = req.num_qubits or 2

    if not req.circuit_data:
        return f"The visitor's circuit is empty ({num} qubits, all in |0>)."

    gate_list = " -> ".join(
        f"{gate.gate.upper()}({', '.join(f'q{t}' for t in gate.targets)})"
        for gate in req.circuit_data[:20]
    )

    try:
        result = simulate_circuit(
            [g.model_dump() for g in req.circuit_data], num, shots=256
        )
    except Exception:
        logger.warning("Demo circuit description: simulation failed, falling back to gate list")
        return f"The visitor's circuit has {num} qubits and these gates in order: {gate_list}."

    # Sorted descending so the dominant outcome — usually what a learner is
    # asking about — comes first rather than in bitstring order.
    probs = sorted(result["probabilities"].items(), key=lambda kv: -kv[1])
    prob_text = ", ".join(f"|{state}>: {p:.0%}" for state, p in probs if p > 0.005)

    bloch_text = ", ".join(
        f"q{c['qubit']} is at ({c['x']:.2f}, {c['y']:.2f}, {c['z']:.2f})"
        + (" — inside the sphere, so entangled" if (c["x"] ** 2 + c["y"] ** 2 + c["z"] ** 2) < 0.9 else "")
        for c in result["bloch_coords"]
    )

    return (
        f"The visitor's circuit has {num} qubits. Gates in order: {gate_list}.\n"
        f"The exact final measurement probabilities (already simulated, do not "
        f"recompute or second-guess these): {prob_text}.\n"
        f"Bloch coordinates per qubit: {bloch_text}."
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


def _is_quota_exhausted(exc: RateLimitError) -> bool:
    """
    Distinguish "you are going too fast" from "this account has no credit".

    Both arrive as a 429. OpenAI marks the second with the error code
    `insufficient_quota`, which is read from the parsed body when the SDK
    exposes it and otherwise sniffed from the message text — the code is the
    reliable signal, the string is a fallback for older SDK versions.
    """
    if getattr(exc, "code", None) == "insufficient_quota":
        return True

    # `body` is the error object itself on current SDK versions, but has been
    # the whole envelope before — accept either shape rather than depending on
    # which one this install happens to produce.
    body = getattr(exc, "body", None)
    candidates = []
    if isinstance(body, dict):
        candidates.append(body)
        nested = body.get("error")
        if isinstance(nested, dict):
            candidates.append(nested)

    for candidate in candidates:
        if candidate.get("code") == "insufficient_quota":
            return True

    # Last resort: the human-readable message, from the body if it's there and
    # otherwise from the exception's own string form.
    messages = [str(candidate.get("message", "")) for candidate in candidates]
    messages.append(str(exc))
    haystack = " ".join(messages).lower()

    return "insufficient_quota" in haystack or "exceeded your current quota" in haystack


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
    except RateLimitError as exc:
        _sessions.refund(session_id)
        _budget.refund()

        # OpenAI returns 429 for two very different situations, and telling a
        # visitor to "try again in a few seconds" is wrong for one of them:
        # a genuine burst limit clears on its own, an exhausted account balance
        # never does. Separate them so the UI can stop asking people to retry
        # something that cannot succeed.
        if _is_quota_exhausted(exc):
            logger.error(
                "Demo chat failed: the OpenAI account has no available credit. "
                "Add credits at https://platform.openai.com/settings/organization/billing"
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "message": "The demo tutor is temporarily unavailable. The simulator above is fully live.",
                    "limit_type": "unconfigured",
                },
            )

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
