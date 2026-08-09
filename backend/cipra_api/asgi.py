"""ASGI entrypoint for the CIPRA backend (daphne).

Serves both HTTP (Django) and WebSocket (channels) protocols. Import order
matters: ``get_asgi_application()`` must run BEFORE routing/consumers are
imported so Django is fully configured first.
"""

from __future__ import annotations

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cipra_api.settings")

from django.core.asgi import get_asgi_application  # noqa: E402

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from cipra_api import routing  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": URLRouter(routing.ws_urlpatterns),
    }
)
