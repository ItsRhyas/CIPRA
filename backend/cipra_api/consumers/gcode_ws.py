"""WebSocket consumer for the ``/ws/gcode/`` publisher channel.

On connect the consumer joins the ``gcode`` group and replays the current
snapshot ONLY when it was explicitly published (``published`` flag set by the
publish endpoint); a pending-but-unpublished job is NOT delivered, so the
client gets the usual ``no-job`` notice. Incoming ``gcode.ready`` envelopes are
validated; an unsupported version is ignored (NOT queued) so a later valid
publish still fans out to connected subscribers.
"""

from __future__ import annotations

from typing import Any

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from cipra_api.ws import protocol
from jobs.latest import latest, subscribers

GROUP_NAME = "gcode"


class GcodeConsumer(AsyncJsonWebsocketConsumer):
    """Subscriber-facing consumer that replays and fans out the current job."""

    async def connect(self) -> None:
        self.group_room = GROUP_NAME
        await self.channel_layer.group_add(self.group_room, self.channel_name)
        await self.accept()
        subscribers.increment()
        await self._replay_snapshot()

    async def _replay_snapshot(self) -> None:
        if latest.is_published():
            await self.send_json(latest.get())
        else:
            # Pending-but-unpublished job (or none at all): behave as today.
            await self.send_json(protocol.build_nojob())

    async def receive_json(self, content: dict[str, Any], **kwargs: Any) -> None:
        """Validate incoming envelopes; ACKs do not break the live channel.

        Unsupported versions are rejected (not queued) per R2 — we simply do
        not fan them out and leave the socket usable.
        """
        valid, error_code = protocol.validate_envelope(content)
        if not valid:
            # Reject (do not queue) but keep the socket open.
            return
        if content.get("type") == protocol.T_GCODE_ACK:
            # Record the acknowledged id for this session (best-effort).
            self.last_acked_id = content.get("id")

    async def gcode_message(self, event: dict[str, Any]) -> None:
        """Group handler: forward a published envelope to this subscriber."""
        await self.send_json(event["envelope"])

    async def disconnect(self, close_code: int) -> None:
        subscribers.decrement()
        await self.channel_layer.group_discard(self.group_room, self.channel_name)
