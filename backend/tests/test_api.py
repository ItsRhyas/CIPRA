"""Integration tests for POST /api/v1/convert/."""

from __future__ import annotations

import base64
import json
from unittest.mock import patch

import cv2
import numpy as np
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from gcode.formatter import FormatResult


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


@pytest.mark.django_db
def test_convert_empty_payload_suppresses_publish(
    api_client,
    sample_image_bytes,
    convert_params,
    caplog,
):
    """S3/R3: empty format result does not publish and logs E_EMPTY_PAYLOAD.

    The real formatter always returns a non-empty preamble, so the empty-payload
    branch is exercised by mocking ``format_gcode`` to return an empty result.
    The HTTP response shape and status are unchanged; the snapshot store is left
    pristine.
    """
    from jobs.latest import latest

    fake_result = FormatResult(gcode="", warnings=["no paths"])
    prior = latest.get()  # snapshot any state left by earlier tests.
    with patch("jobs.views.format_gcode", return_value=fake_result):
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
    assert data["gcode"] == ""
    assert "meta" in data
    assert "warnings" in data
    assert isinstance(data["meta"]["stages_run"], list)

    # S3/R3: no envelope is built or stored; the snapshot is untouched.
    assert latest.get() is prior

    assert any(
        "E_EMPTY_PAYLOAD" in record.message for record in caplog.records
    )


@pytest.mark.django_db
def test_convert_does_not_broadcast_and_stores_unpublished(
    api_client,
    sample_image_bytes,
    convert_params,
    monkeypatch,
):
    """Converting an image must NOT fan out to subscribers.

    Convert only stores the latest snapshot (unpublished). The publish
    endpoint — not the convert — is the sole fan-out trigger. We prove this by
    asserting _publish_to_group is never called, even with a subscriber present,
    and that the stored snapshot is unpublished.
    """
    from unittest.mock import MagicMock

    from jobs import views
    from jobs.latest import latest

    monkeypatch.setattr(views, "_has_subscribers", lambda: True)
    publish = MagicMock()
    monkeypatch.setattr(views, "_publish_to_group", publish)

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
    # Convert must NOT trigger fan-out.
    publish.assert_not_called()
    # The snapshot is stored, but marked unpublished (needs the button).
    snap = latest.get()
    assert snap is not None
    assert latest.is_published() is False


def test_convert_invalid_rotation_deg_returns_400(api_client, sample_image_bytes):
    """A rotation_deg outside the allowed enum returns 400."""
    params = json.dumps(
        {
            "scale": 1.0,
            "threshold": 127,
            "simplify_tolerance": 1.0,
            "rotation_deg": 45,
        }
    )
    response = api_client.post(
        "/api/v1/convert/",
        {"image": _image_file(sample_image_bytes), "params": params, "variant": "fast"},
        format="multipart",
    )

    assert response.status_code == 400
    assert "rotation_deg" in str(response.json()).lower()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "params",
    [
        json.dumps({"machine": 5}),
        json.dumps({"threshold": "abc"}),
        json.dumps({"simplify_tolerance": -5}),
        json.dumps({"scale": float("nan")}),
        json.dumps({"flip_h": "true"}),
        json.dumps({"machine": {"work_area_w_mm": 0}}),
        json.dumps({"scale": 0}),
    ],
)
def test_convert_invalid_params_return_400(api_client, sample_image_bytes, params):
    """Invalid params values return 400 (never 500)."""
    response = api_client.post(
        "/api/v1/convert/",
        {"image": _image_file(sample_image_bytes), "params": params, "variant": "fast"},
        format="multipart",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_convert_too_many_pixels_returns_413(
    api_client,
    sample_image_bytes,
    convert_params,
    monkeypatch,
):
    """Images above the pixel cap return 413, not a 500."""
    from jobs import views

    monkeypatch.setattr(views, "MAX_IMAGE_PIXELS", 100)
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(sample_image_bytes),
            "params": convert_params,
            "variant": "fast",
        },
        format="multipart",
    )

    assert response.status_code == 413


@pytest.mark.django_db
def test_convert_gcode_never_contains_nan(api_client, sample_image_bytes, convert_params):
    """The generated G-Code must never contain a 'nan' literal."""
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
    assert "nan" not in response.json()["gcode"].lower()


@pytest.mark.django_db
def test_convert_auto_threshold_returns_fuzzy_meta(api_client, sample_image_bytes):
    """auto_threshold=true runs the fuzzy stage and returns meta.fuzzy."""
    params = json.dumps({"threshold": 127, "auto_threshold": True})
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(sample_image_bytes),
            "params": params,
            "variant": "fast",
        },
        format="multipart",
    )

    assert response.status_code == 200
    data = response.json()
    assert "fuzzy" in data["meta"]
    fuzzy = data["meta"]["fuzzy"]
    assert "inputs" in fuzzy
    assert "memberships" in fuzzy
    assert "fired_rules" in fuzzy
    assert "defuzzified" in fuzzy
    assert "threshold" in fuzzy
    assert 0 <= fuzzy["threshold"] <= 255
    assert "fuzzy" in data["meta"]["stages_run"]


@pytest.mark.django_db
def test_convert_default_omits_fuzzy_meta(api_client, sample_image_bytes, convert_params):
    """Without auto_threshold the response has no fuzzy diagnostics."""
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
    assert "fuzzy" not in data["meta"]
    assert "fuzzy" not in data["meta"]["stages_run"]


@pytest.mark.django_db
def test_convert_invalid_auto_threshold_returns_400(api_client, sample_image_bytes):
    """auto_threshold must be a boolean."""
    params = json.dumps({"auto_threshold": "yes"})
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(sample_image_bytes),
            "params": params,
            "variant": "fast",
        },
        format="multipart",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_convert_include_stage_images_returns_ordered_pngs(api_client, sample_image_bytes):
    """include_stage_images=true returns 4 ordered, decodable PNG previews."""
    params = json.dumps({"include_stage_images": True})
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(sample_image_bytes),
            "params": params,
            "variant": "fast",
        },
        format="multipart",
    )

    assert response.status_code == 200
    data = response.json()
    stage_images = data["meta"]["stage_images"]
    assert [stage["id"] for stage in stage_images] == [
        "preprocess",
        "edges",
        "contours",
        "simplify",
    ]
    for index, stage in enumerate(stage_images):
        assert stage["order"] == index
        assert stage["mime"] == "image/png"
        png_bytes = base64.b64decode(stage["png_base64"])
        decoded = cv2.imdecode(
            np.frombuffer(png_bytes, dtype=np.uint8),
            cv2.IMREAD_UNCHANGED,
        )
        assert decoded is not None


@pytest.mark.django_db
def test_convert_omit_stage_images_omits_key(api_client, sample_image_bytes, convert_params):
    """When include_stage_images is absent, meta has no stage_images key."""
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
    assert "stage_images" not in response.json()["meta"]


@pytest.mark.django_db
def test_convert_false_stage_images_omits_key(api_client, sample_image_bytes):
    """When include_stage_images=false, meta has no stage_images key."""
    params = json.dumps({"include_stage_images": False})
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(sample_image_bytes),
            "params": params,
            "variant": "fast",
        },
        format="multipart",
    )

    assert response.status_code == 200
    assert "stage_images" not in response.json()["meta"]


@pytest.mark.django_db
def test_convert_stage_images_excludes_fuzzy(api_client, sample_image_bytes):
    """fuzzy appears in stages_run but never in stage_images."""
    params = json.dumps({"include_stage_images": True, "auto_threshold": True})
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(sample_image_bytes),
            "params": params,
            "variant": "fast",
        },
        format="multipart",
    )

    assert response.status_code == 200
    data = response.json()
    assert "fuzzy" in data["meta"]["stages_run"]
    stage_ids = [stage["id"] for stage in data["meta"]["stage_images"]]
    assert "fuzzy" not in stage_ids


@pytest.mark.django_db
def test_convert_invalid_include_stage_images_returns_400(api_client, sample_image_bytes):
    """include_stage_images must be a boolean."""
    params = json.dumps({"include_stage_images": "yes"})
    response = api_client.post(
        "/api/v1/convert/",
        {
            "image": _image_file(sample_image_bytes),
            "params": params,
            "variant": "fast",
        },
        format="multipart",
    )

    assert response.status_code == 400
