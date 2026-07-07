"""Integration tests for POST /api/v1/convert/."""

from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile


def _image_file(
    data: bytes,
    name: str = "test.png",
    content_type: str = "image/png",
) -> SimpleUploadedFile:
    """Build a SimpleUploadedFile for multipart requests."""
    return SimpleUploadedFile(name, data, content_type=content_type)


@pytest.mark.django_db
def test_convert_valid_image_returns_200_and_gcode(
    api_client,
    sample_image_bytes,
    convert_params,
):
    """A valid PNG upload returns 200 with G-Code in the response body."""
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(sample_image_bytes),
            "params": convert_params,
            "variant": "fast",
        },
        format="multipart",
    )

    assert response.status_code == 200
    data = response.json()
    assert "gcode" in data
    assert "meta" in data
    assert "warnings" in data
    assert data["meta"]["variant"] == "fast"
    assert "preprocess" in data["meta"]["stages_run"]
    assert "G21" in data["gcode"]
    assert "G90" in data["gcode"]
    assert "M3" in data["gcode"]
    assert "M5" in data["gcode"]


@pytest.mark.django_db
def test_convert_missing_image_returns_400(api_client, convert_params):
    """A request without an image field returns 400."""
    response = api_client.post(
        "/api/v1/convert/",
        {"params": convert_params, "variant": "fast"},
        format="multipart",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_convert_oversized_image_returns_413(
    api_client,
    huge_image_bytes,
    convert_params,
):
    """A 15 MB payload returns 413 before any image decoding occurs."""
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(huge_image_bytes),
            "params": convert_params,
            "variant": "fast",
        },
        format="multipart",
    )

    assert response.status_code == 413


@pytest.mark.django_db
def test_convert_unsupported_content_type_returns_415(
    api_client,
    convert_params,
):
    """A BMP upload returns 415 because only png/jpeg/webp are accepted."""
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(b"BM", name="test.bmp", content_type="image/bmp"),
            "params": convert_params,
            "variant": "fast",
        },
        format="multipart",
    )

    assert response.status_code == 415


@pytest.mark.django_db
def test_convert_invalid_variant_returns_400(
    api_client,
    sample_image_bytes,
    convert_params,
):
    """An unknown variant returns 400 with a field-level error."""
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(sample_image_bytes),
            "params": convert_params,
            "variant": "turbo",
        },
        format="multipart",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_convert_valid_image_produces_gcode_without_stub_warnings(
    api_client,
    sample_image_bytes,
    convert_params,
):
    """Real pipeline processing produces G-Code without stub warnings."""
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(sample_image_bytes),
            "params": convert_params,
            "variant": "fast",
        },
        format="multipart",
    )

    assert response.status_code == 200
    data = response.json()
    assert "gcode" in data
    assert "M3" in data["gcode"]
    assert "not yet implemented" not in " ".join(data["warnings"])
