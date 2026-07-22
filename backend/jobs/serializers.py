"""DRF serializers for the conversion API."""

from __future__ import annotations

import json
from typing import Any

from rest_framework import serializers
from rest_framework.exceptions import APIException

from gcode.config import ScaraConfig
from pipeline.types import ConvertParams


class PayloadTooLarge(APIException):
    """Raised when the uploaded image exceeds the maximum allowed size."""

    status_code = 413
    default_detail = "Image exceeds the maximum allowed size of 10 MB."
    default_code = "payload_too_large"


class UnsupportedMediaType(APIException):
    """Raised when the uploaded image has an unsupported media type."""

    status_code = 415
    default_detail = "Unsupported image type. Allowed types: image/png, image/jpeg, image/webp."
    default_code = "unsupported_media_type"


MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}


class ConvertRequestSerializer(serializers.Serializer):
    """Multipart request serializer for POST /api/v1/convert/."""

    image = serializers.FileField()
    params = serializers.CharField()
    variant = serializers.CharField(default="fast")

    def validate_image(self, value: Any) -> Any:
        """Validate image size and content type."""
        if value.size > MAX_IMAGE_SIZE:
            raise PayloadTooLarge()
        if value.content_type not in ALLOWED_IMAGE_TYPES:
            raise UnsupportedMediaType()
        return value

    def validate_params(self, value: str) -> ConvertParams:
        """Parse and validate the JSON params object."""
        try:
            data = json.loads(value)
        except (json.JSONDecodeError, TypeError) as exc:
            raise serializers.ValidationError("params must be valid JSON.") from exc

        if not isinstance(data, dict):
            raise serializers.ValidationError("params must be a JSON object.")

        rotation_deg = data.get("rotation_deg", 0)
        invert = data.get("invert", False)

        if rotation_deg not in {0, 90, 180, 270}:
            raise serializers.ValidationError(
                "rotation_deg must be one of: 0, 90, 180, 270."
            )

        try:
            scara_data = data.get("scara") or {}
            known_scara_fields = {
                "work_area_w_mm",
                "work_area_h_mm",
                "travel_speed",
                "draw_speed",
            }
            filtered_scara = {
                key: value
                for key, value in scara_data.items()
                if key in known_scara_fields
            }
            scara = ScaraConfig(**filtered_scara)
            return ConvertParams(
                scale=data.get("scale", 1.0),
                threshold=data.get("threshold", 127),
                simplify_tolerance=data.get("simplify_tolerance", 1.0),
                scara=scara,
                rotation_deg=rotation_deg,
                invert=invert,
            )
        except TypeError as exc:
            raise serializers.ValidationError(f"Invalid params field: {exc}") from exc

    def validate_variant(self, value: str) -> str:
        """Validate the conversion variant."""
        if value not in {"fast", "detailed", "balanced"}:
            raise serializers.ValidationError(
                "variant must be one of: fast, detailed, balanced."
            )
        return value
