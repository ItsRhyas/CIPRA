"""WebSocket route table for the CIPRA backend."""

from __future__ import annotations

from django.urls import re_path

from cipra_api.consumers.gcode_ws import GcodeConsumer
from cipra_api.consumers.status_ws import StatusConsumer

ws_urlpatterns = [
    re_path(r"^ws/gcode/$", GcodeConsumer.as_asgi()),
    re_path(r"^ws/status/$", StatusConsumer.as_asgi()),
]
