"""WS envelope protocol — single source of truth for CIPRA publish side.

The envelope shape and error codes here are the canonical contract mirrored by
the CIPRA frontend and bombolab (each keeps a vendored copy). Keep this module
plain dict/JSON-only so it stays mirrorable.
"""

from __future__ import annotations

import uuid
from typing import Any

SCHEMA_VERSION = 1

ENVELOPE_KEYS = {"type", "version", "id", "name", "meta", "payload"}

# Message / event types.
T_GCODE_READY = "gcode.ready"
T_GCODE_ACK = "gcode.ack"
T_GCODE_ERROR = "gcode.error"
T_NO_JOB = "no-job"
T_PRESENCE = "presence"

# Canonical error codes (mirrored by frontend and bombolab).
ERROR_CODES = {
    "E_PROTOCOL_VERSION": "Unsupported protocol version.",
    "E_INVALID_ENVELOPE": "Invalid or malformed envelope.",
    "E_EMPTY_PAYLOAD": "Empty G-Code payload; publish suppressed.",
    "E_NO_JOB": "No job is held in the current snapshot.",
    "E_PARSE_GCODE": "Failed to parse G-Code.",
    "E_UNREACHABLE": "Move is outside the reachable drawing area.",
}


def _new_id() -> str:
    return str(uuid.uuid4())


def make_gcode_ready(
    id: str, name: str, payload: str, meta: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Build a canonical ``gcode.ready`` envelope (R1)."""
    return {
        "type": T_GCODE_READY,
        "version": SCHEMA_VERSION,
        "id": id,
        "name": name,
        "meta": meta or {},
        "payload": payload,
    }


def build_error(code: str, id: str | None = None) -> dict[str, Any]:
    """Build a ``gcode.error`` envelope carrying a canonical error code."""
    return {
        "type": T_GCODE_ERROR,
        "version": SCHEMA_VERSION,
        "id": id or _new_id(),
        "name": "",
        "meta": {
            "code": code,
            "message": ERROR_CODES.get(code, code),
        },
        "payload": "",
    }


def validate_envelope(message: Any) -> tuple[bool, str | None]:
    """Validate that *message* is a well-formed envelope (R2/R4).

    Returns (valid, error_code). For ``gcode.ready`` the payload must be a
    non-empty string; the protocol version must match SCHEMA_VERSION for any
    envelope type.
    """
    if not isinstance(message, dict):
        return False, "E_INVALID_ENVELOPE"
    if not ENVELOPE_KEYS.issubset(set(message.keys())):
        return False, "E_INVALID_ENVELOPE"
    msg_type = message.get("type")
    if msg_type not in {T_GCODE_READY, T_GCODE_ACK, T_GCODE_ERROR, T_NO_JOB}:
        return False, "E_INVALID_ENVELOPE"
    if message.get("version") != SCHEMA_VERSION:
        return False, "E_PROTOCOL_VERSION"
    if not isinstance(message.get("id"), str) or not message["id"]:
        return False, "E_INVALID_ENVELOPE"
    if msg_type == T_GCODE_READY:
        payload = message.get("payload")
        if not isinstance(payload, str) or not payload.strip():
            return False, "E_INVALID_ENVELOPE"
    return True, None


def build_nojob(id: str | None = None) -> dict[str, Any]:
    """Build a ``no-job`` notice sent to a joining client without a snapshot."""
    return {
        "type": T_NO_JOB,
        "version": SCHEMA_VERSION,
        "id": id or _new_id(),
        "name": "",
        "meta": {},
        "payload": "",
    }
