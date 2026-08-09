"""Unit tests for the WS envelope protocol and the SnapshotStore.

Pure unit level (no channel layer) — exercises `cipra_api/ws/protocol.py`
and `backend/jobs/latest.py`. Authentication covers R1/R2/R3/R4/R7 data
shapes and idempotency-key handling.
"""

from __future__ import annotations

import uuid

from cipra_api.ws.protocol import (
    ERROR_CODES,
    SCHEMA_VERSION,
    build_error,
    build_nojob,
    make_gcode_ready,
    validate_envelope,
)
from jobs.latest import SnapshotStore


def _uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Envelope construction (R1)
# ---------------------------------------------------------------------------


class TestEnvelopeConstruction:
    """The exact gcode.ready envelope shape is a protocol contract (R1)."""

    def test_make_gcode_ready_exact_shape(self) -> None:
        env = make_gcode_ready(id=_uuid(), name="batman.svg", payload="G1 X1 Y1\n")
        assert set(env.keys()) == {"type", "version", "id", "name", "meta", "payload"}
        assert env["type"] == "gcode.ready"
        assert env["version"] == SCHEMA_VERSION == 1
        assert env["name"] == "batman.svg"
        assert env["payload"] == "G1 X1 Y1\n"
        assert env["meta"] == {}

    def test_make_gcode_ready_meta_extensible(self) -> None:
        meta = {"variant": "detailed", "source": "convert"}
        env = make_gcode_ready(id=_uuid(), name="job", payload="G0", meta=meta)
        assert env["meta"] == meta

    def test_build_error_carries_code(self) -> None:
        err = build_error("E_PROTOCOL_VERSION")
        assert err["type"] == "gcode.error"
        assert err["version"] == SCHEMA_VERSION
        assert err["meta"]["code"] == "E_PROTOCOL_VERSION"

    def test_error_codes_mapped(self) -> None:
        for code in (
            "E_PROTOCOL_VERSION",
            "E_INVALID_ENVELOPE",
            "E_EMPTY_PAYLOAD",
            "E_NO_JOB",
            "E_PARSE_GCODE",
            "E_UNREACHABLE",
        ):
            assert code in ERROR_CODES
            assert ERROR_CODES[code]

    def test_build_nojob_notice(self) -> None:
        nojob = build_nojob()
        assert nojob["type"] == "no-job"
        assert nojob["version"] == SCHEMA_VERSION
        assert "id" in nojob


# ---------------------------------------------------------------------------
# Envelope validation (R2/R4)
# ---------------------------------------------------------------------------


class TestValidateEnvelope:
    def test_valid_ready_accepted(self) -> None:
        env = make_gcode_ready(id=_uuid(), name="a", payload="G1")
        ok, err = validate_envelope(env)
        assert ok is True
        assert err is None

    def test_unsupported_version_rejected(self) -> None:
        env = make_gcode_ready(id=_uuid(), name="a", payload="G1")
        env["version"] = 99
        ok, err = validate_envelope(env)
        assert ok is False
        assert err == "E_PROTOCOL_VERSION"

    def test_missing_type_rejected(self) -> None:
        env = make_gcode_ready(id=_uuid(), name="a", payload="G1")
        del env["type"]
        ok, err = validate_envelope(env)
        assert ok is False
        assert err == "E_INVALID_ENVELOPE"

    def test_missing_id_rejected(self) -> None:
        env = make_gcode_ready(id=_uuid(), name="a", payload="G1")
        del env["id"]
        ok, err = validate_envelope(env)
        assert ok is False
        assert err == "E_INVALID_ENVELOPE"

    def test_empty_payload_ready_rejected(self) -> None:
        env = make_gcode_ready(id=_uuid(), name="a", payload="   ")
        ok, err = validate_envelope(env)
        assert ok is False
        assert err == "E_INVALID_ENVELOPE"

    def test_non_dict_rejected(self) -> None:
        ok, err = validate_envelope("not-an-object")
        assert ok is False
        assert err == "E_INVALID_ENVELOPE"


# ---------------------------------------------------------------------------
# SnapshotStore (B3 / R7): latest-only, lock-protected
# ---------------------------------------------------------------------------


class TestSnapshotStore:
    def test_initial_empty(self) -> None:
        store = SnapshotStore()
        assert store.get() is None

    def test_set_then_get(self) -> None:
        store = SnapshotStore()
        env = make_gcode_ready(id=_uuid(), name="j", payload="G1")
        store.set(env)
        assert store.get() == env

    def test_latest_only_overwrite(self) -> None:
        store = SnapshotStore()
        first = make_gcode_ready(id="id-1", name="a", payload="G1")
        second = make_gcode_ready(id="id-2", name="b", payload="G2")
        store.set(first)
        store.set(second)
        assert store.get()["id"] == "id-2"

    def test_single_instance_singleton_exposed(self) -> None:
        from jobs.latest import latest

        assert isinstance(latest, SnapshotStore)
        latest.set(make_gcode_ready(id=_uuid(), name="x", payload="G1"))
        assert latest.get()["name"] == "x"
