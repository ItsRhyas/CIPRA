"""WebSocket integration tests using channels' WebsocketCommunicator.

Covers R18/S1-S4, consumer ACK + E_* rejection paths, and the PublishGcodeView
re-publish API (R6/S5). Uses pytest-asyncio (asyncio_mode = auto) and the
InMemory channel layer from settings.
"""

from __future__ import annotations

import uuid
from typing import Any

import pytest
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator

from cipra_api.asgi import application
from cipra_api.ws.protocol import make_gcode_ready
from jobs import latest as latest_mod
from jobs.latest import latest


def _uuid() -> str:
    return str(uuid.uuid4())


def make_ready(job_id: str, name: str, payload: str) -> dict:
    return make_gcode_ready(id=job_id, name=name, payload=payload)


@pytest.fixture(autouse=True)
def _clear_snapshot() -> None:
    """Each test starts from a clean snapshot store."""
    latest_mod.latest.set(None)


async def _connect() -> WebsocketCommunicator:
    communicator = WebsocketCommunicator(application, "/ws/gcode/")
    connected, _ = await communicator.connect()
    assert connected is True
    return communicator


async def _group_send(envelope: dict) -> None:
    """Mirror the real publish path: set the snapshot, mark published, fan out.

    Must be awaited (not async_to_sync) because the WebsocketCommunicator
    consumer lives on the same event loop as the test.
    """
    latest.set(envelope)
    latest.mark_published()
    layer = get_channel_layer()
    await layer.group_send("gcode", {"type": "gcode.message", "envelope": envelope})


# ---------------------------------------------------------------------------
# Snapshot replay on connect (S1 / R7)
# ---------------------------------------------------------------------------


class TestSnapshotReplay:
    async def test_connect_with_published_snapshot_replays_ready(self) -> None:
        envelope = make_ready(_uuid(), "logo.svg", "G21 G90\nG0 X1 Y2\n")
        latest.set(envelope)
        latest.mark_published()

        communicator = await _connect()
        try:
            received = await communicator.receive_json_from(timeout=1)
            assert received["type"] == "gcode.ready"
            assert received["id"] == envelope["id"]
            assert received["payload"] == envelope["payload"]
        finally:
            await communicator.disconnect()

    async def test_connect_with_pending_job_does_not_replay_ready(self) -> None:
        """A pending-but-unpublished job is NOT replayed on connect."""
        envelope = make_ready(_uuid(), "pending.png", "G21 G90\nG0 X1 Y2\n")
        latest.set(envelope)  # converted, but never explicitly published

        communicator = await _connect()
        try:
            received = await communicator.receive_json_from(timeout=1)
            assert received["type"] == "no-job"
        finally:
            await communicator.disconnect()

    async def test_connect_without_snapshot_sends_nojob(self) -> None:
        communicator = await _connect()
        try:
            received = await communicator.receive_json_from(timeout=1)
            assert received["type"] == "no-job"
        finally:
            await communicator.disconnect()

    async def test_replay_after_new_convert_resets_published(self) -> None:
        """A new convert resets published; a previously published job is NOT
        replayed after a newer pending convert."""
        published = make_ready(_uuid(), "job1.png", "G1 X1 Y1")
        latest.set(published)
        latest.mark_published()

        # New convert stores a newer job (pending, unpublished).
        newer = make_ready(_uuid(), "job2.png", "G2 X2 Y2")
        latest.set(newer)

        communicator = await _connect()
        try:
            received = await communicator.receive_json_from(timeout=1)
            assert received["type"] == "no-job"
        finally:
            await communicator.disconnect()


# ---------------------------------------------------------------------------
# Consumer ACK + rejection paths (R2 / R10 backend side)
# ---------------------------------------------------------------------------


class TestConsumerProtocol:
    async def test_ack_keeps_connection_usable(self) -> None:
        envelope = make_ready(_uuid(), "j", "G1")
        latest.set(envelope)
        communicator = await _connect()
        try:
            await communicator.receive_json_from(timeout=1)  # drain snapshot
            await communicator.send_json_to({"type": "gcode.ack", "id": envelope["id"]})
            # Connection stays open: a new publish must still fan out.
            newer = make_ready(_uuid(), "k", "G2")
            await _group_send(newer)
            received = await communicator.receive_json_from(timeout=1)
            assert received["id"] == newer["id"]
        finally:
            await communicator.disconnect()

    async def test_unsupported_version_not_queued(self) -> None:
        # R2: a gcode.ready with a bad version must be rejected and NOT queued.
        env_bad = make_ready(_uuid(), "bad", "GUND")
        env_bad["version"] = 99

        communicator = await _connect()
        try:
            await communicator.receive_json_from(timeout=1)  # drain snapshot
            await communicator.send_json_to(env_bad)
            # The rejected frame must NOT come back; only a later valid publish.
            valid = make_ready(_uuid(), "ok", "GOK")
            await _group_send(valid)
            received = await communicator.receive_json_from(timeout=1)
            assert received["id"] == valid["id"]
        finally:
            await communicator.disconnect()


# ---------------------------------------------------------------------------
# Publish fan-out + late joiner (S4 / R18 / R7)
# ---------------------------------------------------------------------------


class TestPublishFanOut:
    async def test_publish_replaces_and_delivers(self) -> None:
        old = make_ready(_uuid(), "old", "GOLD")
        latest.set(old)
        communicator = await _connect()
        try:
            await communicator.receive_json_from(timeout=1)  # replay = old
            new = make_ready(_uuid(), "new", "G1 X0 Y0")
            await _group_send(new)
            received = await communicator.receive_json_from(timeout=1)
            assert received["id"] == new["id"]
            assert received["payload"] == "G1 X0 Y0"
            assert latest.get()["id"] == new["id"]
        finally:
            await communicator.disconnect()

    async def test_late_joiner_gets_current_snapshot(self) -> None:
        newest = make_ready(_uuid(), "newest", "G1 X9 Z8")
        await _group_send(newest)
        # No subscriber was present during publish; snapshot must still be stored.
        assert latest.get()["id"] == newest["id"]

        hop_on = WebsocketCommunicator(application, "/ws/gcode/")
        connected, _ = await hop_on.connect()
        assert connected is True
        try:
            received = await hop_on.receive_json_from(timeout=1)
            assert received["id"] == newest["id"]
        finally:
            await hop_on.disconnect()


# ---------------------------------------------------------------------------
# PublishGcodeView re-publish API (R6 / S5)
# ---------------------------------------------------------------------------


class TestPublishApi:
    def test_publish_no_job_404(self, api_client: Any) -> None:
        resp = api_client.post("/api/v1/gcode/publish/")
        assert resp.status_code == 404
        assert resp.json()["error"] == "E_NO_JOB"

    def test_publish_idempotent_same_job_id(
        self, api_client: Any, monkeypatch: Any
    ) -> None:
        env = make_ready(_uuid(), "job", "G1")
        latest.set(env)
        monkeypatch.setattr("jobs.views._has_subscribers", lambda: False)
        r1 = api_client.post("/api/v1/gcode/publish/")
        r2 = api_client.post("/api/v1/gcode/publish/")
        assert r1.status_code == 200
        assert r1.json()["job_id"] == env["id"]
        assert r2.status_code == 200
        assert r2.json()["job_id"] == env["id"]
        # No connected client → publish is a no-op (R6/S5).
        assert r2.json()["published"] is False
        assert r2.json()["connected"] is False

    def test_publish_with_client_published(self, api_client: Any, monkeypatch: Any) -> None:
        env = make_ready(_uuid(), "job", "G1")
        latest.set(env)
        monkeypatch.setattr("jobs.views._has_subscribers", lambda: True)
        resp = api_client.post("/api/v1/gcode/publish/")
        assert resp.status_code == 200
        assert resp.json()["connected"] is True
        assert resp.json()["published"] is True
        assert resp.json()["job_id"] == env["id"]
        # Successful broadcast marks the snapshot as published for replay.
        assert latest.is_published() is True
