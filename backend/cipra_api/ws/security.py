"""WebSocket origin validation for the CIPRA backend.

Non-browser clients (e.g. the bombolab device) may omit the Origin header
entirely; browser connections are accepted only when the Origin hostname is
listed in ALLOWED_HOSTS.
"""

from __future__ import annotations

from urllib.parse import urlsplit

from django.conf import settings


def validate_origin(scope) -> bool:
    """Return True when the WebSocket handshake origin is acceptable.

    Requests without an Origin header are allowed (non-browser clients).
    Requests with an Origin are allowed only when the Origin hostname
    (without port) appears in ALLOWED_HOSTS.
    """
    headers = dict(scope.get("headers") or [])
    origin_header = headers.get(b"origin")
    if origin_header is None:
        return True
    origin = origin_header.decode("latin1")
    hostname = urlsplit(origin).hostname or ""
    allowed = {host.split(":")[0].lower() for host in settings.ALLOWED_HOSTS}
    return hostname.lower() in allowed
