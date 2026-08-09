"""Request middleware hardening for the CIPRA backend."""

from __future__ import annotations

import json
from typing import Any, Callable

from django.http import HttpResponse

# Hard cap on any request body: 12 MB (image cap 10 MB + form overhead).
LARGE_UPLOAD_HARD_CAP = 12 * 1024 * 1024


class LargeUploadMiddleware:
    """Reject oversized bodies by Content-Length BEFORE buffering (DoS guard)."""

    def __init__(self, get_response: Callable[[Any], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: Any) -> HttpResponse:
        if request.method in {"POST", "PUT", "PATCH"}:
            length = request.META.get("CONTENT_LENGTH")
            if length and length.isdigit() and int(length) > LARGE_UPLOAD_HARD_CAP:
                return HttpResponse(
                    json.dumps(
                        {
                            "error": "payload_too_large",
                            "detail": "Request body exceeds the maximum allowed size of 12 MB.",
                        }
                    ),
                    status=413,
                    content_type="application/json",
                )
        return self.get_response(request)
