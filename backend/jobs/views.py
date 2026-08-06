"""DRF views for the conversion API."""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any

import numpy as np
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from PIL import Image
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.views import APIView

from cipra_api.ws import protocol
from gcode.config import ScaraConfig
from gcode.formatter import format_gcode
from jobs.latest import latest
from jobs.serializers import ConvertRequestSerializer
from pipeline.orchestrator import PipelineOrchestrator
from pipeline.types import ConvertResponse, ConvertResponseMeta

logger = logging.getLogger(__name__)

GCODE_GROUP = "gcode"


def _has_subscribers() -> bool:
    """Return True when at least one client is connected to the gcode group.

    Uses the explicit subscriber counter (InMemory layer has no group_size).
    """
    from jobs.latest import subscribers

    return subscribers.value() > 0


def _publish_to_group(envelope: dict[str, Any]) -> None:
    """Fan out an envelope to every connected gcode subscriber."""
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(
        GCODE_GROUP, {"type": "gcode.message", "envelope": envelope}
    )


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
        params.variant = variant

        image_array = _load_image(image_file)
        scara_config = params.scara if params.scara else ScaraConfig()

        start = time.perf_counter()
        pipeline_output = PipelineOrchestrator().run(image_array, scara_config, params)
        elapsed_ms = (time.perf_counter() - start) * 1000

        paths = _coordinates_to_paths(pipeline_output.coordinates)
        format_result = format_gcode(paths, scara_config)

        if format_result.gcode:
            envelope = protocol.make_gcode_ready(
                id=str(uuid.uuid4()),
                name=image_file.name or "converted",
                payload=format_result.gcode,
            )
            latest.set(envelope)
            if _has_subscribers():
                _publish_to_group(envelope)
            else:
                logger.warning("Publish suppressed: no client connected (E_NO_CLIENT)")
        else:
            logger.warning(
                "Publish suppressed: empty gcode payload (E_EMPTY_PAYLOAD)"
            )

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


class PublishGcodeView(APIView):
    """POST /api/v1/gcode/publish/ — re-publish the current snapshot.

    Idempotent: re-sends the same envelope (and returns its id) regardless of
    how many times it is called. When no subscriber is connected the re-publish
    is a no-op (R6/S5).
    """

    parser_classes = [JSONParser]

    def post(self, request: Request) -> Response:
        """Re-broadcast the current snapshot to connected subscribers."""
        envelope = latest.get()
        if envelope is None:
            return Response({"error": "E_NO_JOB"}, status=404)

        has_client = _has_subscribers()
        if has_client:
            _publish_to_group(envelope)
        else:
            logger.info("Re-publish suppressed: no client connected (no-op)")

        return Response(
            {
                "published": has_client,
                "connected": has_client,
                "job_id": envelope["id"],
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
