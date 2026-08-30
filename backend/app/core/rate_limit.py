"""
In-memory rate limiting primitives for the public demo endpoints.

Why in-memory instead of Redis: the public demo runs on a single Render
free-tier instance with one uvicorn worker. Adding Redis would mean another
service to provision, another free tier to keep alive, and another cold-start
dependency — for state that is genuinely disposable. Losing the counters on
a restart is acceptable here: the worst case is that a handful of visitors
get their five demo messages back after a deploy.

The tradeoff to be aware of: this state is per-process. If the backend is
ever scaled past one worker or one instance, each process keeps its own
counters and the effective limits multiply by the process count. Run the
demo with `--workers 1` (see render.yaml) or swap these classes for a Redis
implementation before scaling out.
"""

from __future__ import annotations

import threading
import time
from collections import deque


class SlidingWindowLimiter:
    """
    Classic sliding-window counter: at most `limit` hits per `window` seconds
    for any given key (an IP address, in practice).

    Rejected requests are deliberately NOT recorded. Recording them would let
    a client hammering the endpoint extend their own lockout indefinitely,
    which turns a rate limit into a permanent ban on a shared/NAT'd IP.
    """

    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self._last_sweep = 0.0

    def _trim(self, hits: deque[float], now: float) -> None:
        cutoff = now - self.window
        while hits and hits[0] <= cutoff:
            hits.popleft()

    def _sweep(self, now: float) -> None:
        """Drop keys with no recent hits so the dict can't grow without bound."""
        if now - self._last_sweep < self.window:
            return
        self._last_sweep = now
        for key in list(self._hits):
            self._trim(self._hits[key], now)
            if not self._hits[key]:
                del self._hits[key]

    def hit(self, key: str) -> tuple[bool, int]:
        """
        Record one request against `key`.

        Returns (allowed, retry_after_seconds). retry_after is 0 when allowed.
        """
        now = time.monotonic()
        with self._lock:
            self._sweep(now)
            hits = self._hits.setdefault(key, deque())
            self._trim(hits, now)

            if len(hits) >= self.limit:
                # Oldest hit falls out of the window at hits[0] + window
                retry_after = max(1, int(hits[0] + self.window - now) + 1)
                return False, retry_after

            hits.append(now)
            return True, 0

    def remaining(self, key: str) -> int:
        now = time.monotonic()
        with self._lock:
            hits = self._hits.get(key)
            if not hits:
                return self.limit
            self._trim(hits, now)
            return max(0, self.limit - len(hits))


class SessionCounter:
    """
    Counts how many demo messages a browser session has spent.

    The session id is generated client-side and is trivially forgeable — that
    is fine and expected. This is the *cheap* limit that gives an honest
    visitor a clean "5 of 5 used" experience; the IP limiter below it is what
    actually costs an abuser something. Defence in depth, not a wall.

    Entries expire after `ttl_seconds` so abandoned sessions don't accumulate.
    """

    def __init__(self, limit: int, ttl_seconds: int = 24 * 3600):
        self.limit = limit
        self.ttl = ttl_seconds
        self._counts: dict[str, tuple[int, float]] = {}
        self._lock = threading.Lock()
        self._last_sweep = 0.0

    def _sweep(self, now: float) -> None:
        if now - self._last_sweep < 600:
            return
        self._last_sweep = now
        for key, (_, seen) in list(self._counts.items()):
            if now - seen > self.ttl:
                del self._counts[key]

    def used(self, session_id: str) -> int:
        now = time.monotonic()
        with self._lock:
            self._sweep(now)
            entry = self._counts.get(session_id)
            if not entry or now - entry[1] > self.ttl:
                return 0
            return entry[0]

    def consume(self, session_id: str) -> tuple[bool, int]:
        """
        Spend one message from the session's allowance.

        Returns (allowed, used_after_this_call).
        """
        now = time.monotonic()
        with self._lock:
            self._sweep(now)
            entry = self._counts.get(session_id)
            used = 0 if not entry or now - entry[1] > self.ttl else entry[0]

            if used >= self.limit:
                return False, used

            self._counts[session_id] = (used + 1, now)
            return True, used + 1

    def refund(self, session_id: str) -> None:
        """
        Give a message back — used when the upstream LLM call fails, so a
        visitor doesn't burn part of their allowance on our error.
        """
        now = time.monotonic()
        with self._lock:
            entry = self._counts.get(session_id)
            if entry and entry[0] > 0:
                self._counts[session_id] = (entry[0] - 1, now)


class DailyBudget:
    """
    A hard ceiling on demo calls per UTC day.

    This is the backstop that bounds the OpenAI bill regardless of how many
    distinct sessions or IPs show up. It is the one limit that should never
    be generous.
    """

    def __init__(self, limit: int):
        self.limit = limit
        self._count = 0
        self._day = time.gmtime().tm_yday
        self._lock = threading.Lock()

    def _roll(self) -> None:
        today = time.gmtime().tm_yday
        if today != self._day:
            self._day = today
            self._count = 0

    def consume(self) -> bool:
        with self._lock:
            self._roll()
            if self._count >= self.limit:
                return False
            self._count += 1
            return True

    def refund(self) -> None:
        with self._lock:
            if self._count > 0:
                self._count -= 1

    @property
    def used(self) -> int:
        with self._lock:
            self._roll()
            return self._count


def client_ip(request, trust_proxy: bool = True) -> str:
    """
    Best-effort client IP.

    Render (like most PaaS platforms) terminates TLS at its own edge and
    forwards the real client address in X-Forwarded-For as a comma-separated
    chain, oldest first. The leftmost entry is the original client.

    X-Forwarded-For is spoofable by the client, so this is only trustworthy
    because Render's proxy rewrites it. `trust_proxy=False` falls back to the
    socket address for local runs where no proxy is in front of us.
    """
    if trust_proxy:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            first = forwarded.split(",")[0].strip()
            if first:
                return first
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()

    return request.client.host if request.client else "unknown"
