"""DRF views for the conversion API."""

from __future__ import annotations

import time
from typing import Any

import numpy as np
from PIL import Image
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.views import APIView

from gcode.config import ScaraConfig
from gcode.formatter import format_gcode
from jobs.serializers import ConvertRequestSerializer
from pipeline.orchestrator import PipelineOrchestrator
from pipeline.types import ConvertResponse, ConvertResponseMeta


class ConvertView(APIView):
    """POST /api/v1/convert/ — convert an uploaded image to G-Code."""

    parser_classes = [MultiPartParser]

    def post(self, request: Request) -> Response:
        """Handle multipart upload, run the pipeline, and return G-Code."""
        serializer = ConvertRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image_file = serializer.validated_data["image"]
        params = serializer.validated_data["params"]
        variant = serializer.validated_data["variant"]

        image_array = _load_image(image_file)
        scara_config = params.scara if params.scara else ScaraConfig()

        start = time.perf_counter()
        pipeline_output = PipelineOrchestrator().run(image_array, scara_config)
        elapsed_ms = (time.perf_counter() - start) * 1000

        paths = _coordinates_to_paths(pipeline_output.coordinates)
        format_result = format_gcode(paths, scara_config)

        warnings = [warning.message for warning in pipeline_output.warnings]
        warnings.extend(format_result.warnings)

        response = ConvertResponse(
            gcode=format_result.gcode,
            meta=ConvertResponseMeta(
                variant=variant,
                stages_run=pipeline_output.stages_run,
                elapsed_ms=elapsed_ms,
            ),
            warnings=warnings,
        )

        return Response(
            {
                "gcode": response.gcode,
                "meta": {
                    "variant": response.meta.variant,
                    "stages_run": response.meta.stages_run,
                    "elapsed_ms": response.meta.elapsed_ms,
                },
                "warnings": response.warnings,
            }
        )


def _load_image(image_file: Any) -> np.ndarray:
    """Load an uploaded image into a NumPy RGB array."""
    try:
        image = Image.open(image_file)
        if image.mode != "RGB":
            image = image.convert("RGB")
        return np.array(image)
    except Exception as exc:
        raise ValidationError(f"Could not decode image: {exc}") from exc


def _coordinates_to_paths(
    coordinates: list[tuple[float, float]],
) -> list[list[tuple[float, float]]]:
    """Normalize a flat coordinate list into a list of drawing paths."""
    if not coordinates:
        return []
    return [coordinates]
