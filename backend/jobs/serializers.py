"""DRF serializers for the conversion API."""

from __future__ import annotations

import json
import math
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


class ImageTooLarge(APIException):
    """Raised when the image dimensions exceed the maximum allowed pixel count."""

    status_code = 413
    default_detail = "Image dimensions exceed the maximum of 20 megapixels."
    default_code = "image_too_large"


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

    def _finite_float(
        self,
        value: Any,
        name: str,
        *,
        min_value: float | None = None,
        max_value: float | None = None,
    ) -> float:
        """Coerce ``value`` to a finite float within an optional range."""
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise serializers.ValidationError(f"{name} must be a number.")
        number = float(value)
        if not math.isfinite(number):
            raise serializers.ValidationError(f"{name} must be a finite number.")
        if min_value is not None and number < min_value:
            raise serializers.ValidationError(f"{name} must be at least {min_value}.")
        if max_value is not None and number > max_value:
            raise serializers.ValidationError(f"{name} must be at most {max_value}.")
        return number

    def validate_params(self, value: str) -> ConvertParams:
        """Parse and validate the JSON params object."""
        try:
            data = json.loads(value)
        except (json.JSONDecodeError, TypeError) as exc:
            raise serializers.ValidationError("params must be valid JSON.") from exc

        if not isinstance(data, dict):
            raise serializers.ValidationError("params must be a JSON object.")

        rotation_deg = data.get("rotation_deg", 0)
        if (
            isinstance(rotation_deg, bool)
            or not isinstance(rotation_deg, int)
            or rotation_deg not in {0, 90, 180, 270}
        ):
            raise serializers.ValidationError(
                "rotation_deg must be one of: 0, 90, 180, 270."
            )

        flip_h = data.get("flip_h", False)
        flip_v = data.get("flip_v", False)
        if not isinstance(flip_h, bool):
            raise serializers.ValidationError("flip_h must be a boolean.")
        if not isinstance(flip_v, bool):
            raise serializers.ValidationError("flip_v must be a boolean.")

        scale = self._finite_float(data.get("scale", 1.0), "scale", min_value=0.01)
        simplify_tolerance = self._finite_float(
            data.get("simplify_tolerance", 1.0),
            "simplify_tolerance",
            min_value=0.0,
        )

        threshold = data.get("threshold", 127)
        if isinstance(threshold, bool) or not isinstance(threshold, (int, float)):
            raise serializers.ValidationError(
                "threshold must be an integer between 0 and 255."
            )
        if isinstance(threshold, float) and (
            not math.isfinite(threshold) or not threshold.is_integer()
        ):
            raise serializers.ValidationError(
                "threshold must be an integer between 0 and 255."
            )
        threshold = int(threshold)
        if not 0 <= threshold <= 255:
            raise serializers.ValidationError(
                "threshold must be an integer between 0 and 255."
            )

        try:
            scara_data = data.get("scara")
            if scara_data is None:
                scara = ScaraConfig()
            elif isinstance(scara_data, dict):
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
                validated_scara: dict[str, float] = {}
                if "work_area_w_mm" in filtered_scara:
                    validated_scara["work_area_w_mm"] = self._finite_float(
                        filtered_scara["work_area_w_mm"],
                        "scara.work_area_w_mm",
                        min_value=0.01,
                    )
                if "work_area_h_mm" in filtered_scara:
                    validated_scara["work_area_h_mm"] = self._finite_float(
                        filtered_scara["work_area_h_mm"],
                        "scara.work_area_h_mm",
                        min_value=0.01,
                    )
                if "travel_speed" in filtered_scara and filtered_scara["travel_speed"] is not None:
                    validated_scara["travel_speed"] = self._finite_float(
                        filtered_scara["travel_speed"],
                        "scara.travel_speed",
                        min_value=0.0,
                    )
                if "draw_speed" in filtered_scara and filtered_scara["draw_speed"] is not None:
                    validated_scara["draw_speed"] = self._finite_float(
                        filtered_scara["draw_speed"],
                        "scara.draw_speed",
                        min_value=0.0,
                    )
                scara = ScaraConfig(**validated_scara)
            else:
                raise serializers.ValidationError("scara must be an object.")
        except (TypeError, ValueError) as exc:
            raise serializers.ValidationError(f"Invalid params field: {exc}") from exc

        return ConvertParams(
            scale=scale,
            threshold=threshold,
            simplify_tolerance=simplify_tolerance,
            scara=scara,
            rotation_deg=rotation_deg,
            flip_h=flip_h,
            flip_v=flip_v,
        )

    def validate_variant(self, value: str) -> str:
        """Validate the conversion variant."""
        if value not in {"fast", "detailed", "balanced"}:
            raise serializers.ValidationError(
                "variant must be one of: fast, detailed, balanced."
            )
        return value
