"""WebSocket consumer for the ``/ws/status/`` presence channel (CIPRA UI).

Joins the ``status`` group and broadcasts a ``presence`` envelope carrying the
number of bombolab subscribers currently on the ``gcode`` group, keeping the
frontend's connection badge honest.
"""

from __future__ import annotations

from typing import Any

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from cipra_api.ws.protocol import SCHEMA_VERSION, T_PRESENCE
from cipra_api.ws.security import validate_origin

GROUP_NAME = "status"


class StatusConsumer(AsyncJsonWebsocketConsumer):
    """Presence broadcaster for the connected CIPRA UI client."""

    async def connect(self) -> None:
        if not validate_origin(self.scope):
            await self.close(code=4403)
            return
        self.group_room = GROUP_NAME
        await self.channel_layer.group_add(self.group_room, self.channel_name)
        await self.accept()
        await self.broadcast_presence()

    async def broadcast_presence(self) -> None:
        """Fan out the current gcode-subscriber count to the status group."""
        from jobs.latest import subscribers

        clients = subscribers.value()
        await self.channel_layer.group_send(
            self.group_room,
            {
                "type": "presence_message",
                "envelope": {
                    "type": T_PRESENCE,
                    "version": SCHEMA_VERSION,
                    "id": self.channel_name,
                    "name": "",
                    "meta": {"clients": clients},
                    "payload": "",
                },
            },
        )

    async def presence_message(self, event: dict[str, Any]) -> None:
        await self.send_json(event["envelope"])

    async def disconnect(self, close_code: int) -> None:
        await self.channel_layer.group_discard(self.group_room, self.channel_name)
