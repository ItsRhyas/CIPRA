"""Shared pipeline and API contract types."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from gcode.config import ScaraConfig


@dataclass
class ConvertParams:
    """Processing parameters for the vision pipeline."""

    scale: float = 1.0
    threshold: int = 127
    simplify_tolerance: float = 1.0
    variant: str = "balanced"
    scara: ScaraConfig | None = None
    rotation_deg: int = 0
    invert: bool = False


@dataclass
class ConvertRequest:
    """
    Logical request body. On the wire this is sent as multipart/form-data with
    'image' as a file field and 'params' as a JSON string.
    """

    image: bytes
    params: ConvertParams
    variant: str = 'fast'


@dataclass
class ConvertResponse:
    """Successful conversion response."""

    gcode: str
    meta: ConvertResponseMeta
    warnings: list[str] = field(default_factory=list)


@dataclass
class ConvertResponseMeta:
    """Metadata returned with a successful conversion."""

    variant: str
    stages_run: list[str]
    elapsed_ms: float


@dataclass
class ErrorResponse:
    """Validation or processing error response."""

    error: str
    detail: str | None = None
    field_errors: dict[str, Any] | None = None



@dataclass
class Warning:
    """Structured warning emitted by a pipeline stage."""

    message: str
    stage: str | None = None
    code: str = ""


@dataclass
class StageResult:
    """Output of a single vision-pipeline stage."""

    data: Any
    warnings: list[Warning] = field(default_factory=list)
    stage_name: str = ""


@dataclass
class PipelineOutput:
    """Final aggregated output of the vision pipeline.

    ``coordinates`` is a list of drawing paths. Each path is a list of
    ``(x, y)`` points in millimeters. Path boundaries are preserved so that
    travel moves (G0) are only emitted between disconnected contours.
    """

    coordinates: list[list[tuple[float, float]]] = field(default_factory=list)
    warnings: list[Warning] = field(default_factory=list)
    stages_run: list[str] = field(default_factory=list)

