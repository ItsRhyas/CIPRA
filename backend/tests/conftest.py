"""Shared pytest fixtures for the CIPRA backend."""

from __future__ import annotations

import json
import os
import sys
from io import BytesIO
from typing import Any

import pytest
from PIL import Image

# Make the backend package importable when pytest is invoked from the repo root.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cipra_api.settings")

pytest_plugins = ["django"]


@pytest.fixture
def api_client() -> Any:
    """Return an authenticated DRF API test client."""
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def sample_image_bytes() -> bytes:
    """Return a small valid PNG image as bytes."""
    image = Image.new("RGB", (10, 10), color="white")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer.getvalue()


@pytest.fixture
def convert_params() -> str:
    """Return a JSON-encoded params object for the convert endpoint."""
    return json.dumps(
        {
            "scale": 1.0,
            "threshold": 127,
            "simplify_tolerance": 1.0,
        }
    )


@pytest.fixture
def huge_image_bytes() -> bytes:
    """Return a 15 MB byte payload masquerading as a PNG."""
    return b"\x00" * (15 * 1024 * 1024)
