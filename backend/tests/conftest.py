"""Shared pytest fixtures for the CIPRA backend."""

from __future__ import annotations

import json
import os
import sys
from io import BytesIO
from typing import TYPE_CHECKING, Any

import numpy as np
import pytest
from PIL import Image, ImageDraw

# Make the backend package importable when pytest is invoked from the repo root.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cipra_api.settings")

pytest_plugins = ["django"]

if TYPE_CHECKING:
    from numpy.typing import NDArray


@pytest.fixture
def api_client() -> Any:
    """Return an authenticated DRF API test client."""
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def synthetic_image() -> NDArray:
    """Return a 200x200 white image with a black rectangle and diagonal line."""
    image = Image.new("L", (200, 200), 255)
    draw = ImageDraw.Draw(image)
    draw.rectangle([(50, 50), (150, 150)], fill=0)
    draw.line([(25, 25), (175, 175)], fill=0, width=2)
    return np.array(image)


@pytest.fixture
def sample_image_bytes() -> bytes:
    """Return a valid PNG image with drawn shapes as bytes."""
    image = Image.new("RGB", (200, 200), color="white")
    draw = ImageDraw.Draw(image)
    draw.rectangle([(50, 50), (150, 150)], fill="black")
    draw.line([(25, 25), (175, 175)], fill="black", width=2)
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
