"""Thread-safe, latest-only snapshot store for the generated G-Code job.

Holds the most recent published ``gcode.ready`` envelope in memory. No DB — the
snapshot is lost on CIPRA restart (accepted per spec; multi-instance broadcast
is deferred). The ``latest`` module-level instance is the process-wide publisher
source of truth.
"""

from __future__ import annotations

import threading
from typing import Any


class SnapshotStore:
    """Latest-only store of the current G-Code envelope, guarded by a lock.

    Each stored job carries a ``published`` flag: ``False`` right after a new
    convert stores a job, ``True`` only after an explicit publish broadcast.
    Replay on WS connect is gated on this flag, so a pending-but-unpublished
    job is never delivered to subscribers.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._latest: dict[str, Any] | None = None
        self._published = False

    def set(self, envelope: dict[str, Any] | None) -> None:
        """Overwrite the current snapshot (latest-only).

        Storing a new job also resets ``published`` to ``False``: it must be
        explicitly published before subscribers receive it.
        """
        with self._lock:
            self._latest = envelope
            self._published = False

    def get(self) -> dict[str, Any] | None:
        """Return the current snapshot envelope, or None if none stored."""
        with self._lock:
            return self._latest

    def mark_published(self) -> None:
        """Mark the current snapshot as explicitly published."""
        with self._lock:
            self._published = True

    def is_published(self) -> bool:
        """Return True only when a snapshot exists and was explicitly published."""
        with self._lock:
            return self._latest is not None and self._published


# Module-level single source of truth (publisher).
latest = SnapshotStore()


class SubscriberCounter:
    """Thread-safe count of connected gcode subscribers.

    The InMemory channel layer does not implement ``group_size``, so presence is
    tracked explicitly with explicit increments on connect and decrements on
    disconnect.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._count = 0

    def increment(self) -> None:
        with self._lock:
            self._count += 1

    def decrement(self) -> None:
        with self._lock:
            self._count = max(0, self._count - 1)

    def value(self) -> int:
        with self._lock:
            return self._count


subscribers = SubscriberCounter()
