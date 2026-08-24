"""Shared pipeline and API contract types."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from gcode.config import MachineConfig


@dataclass
class ConvertParams:
    """Processing parameters for the vision pipeline."""

    scale: float = 1.0
    threshold: int = 127
    auto_threshold: bool = False
    simplify_tolerance: float = 1.0
    machine: MachineConfig | None = None
    rotation_deg: int = 0
    flip_h: bool = False
    flip_v: bool = False
    include_stage_images: bool = False
    variant: str = 'balanced'


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
    stage_images: list[StageImage] = field(default_factory=list)
    fuzzy: dict[str, Any] | None = None


@dataclass
class ErrorResponse:
    """Validation or processing error response."""

    error: str
    detail: str | None = None
    field_errors: dict[str, Any] | None = None


@dataclass
class StageImage:
    """A preview image captured from an intermediate pipeline stage."""

    id: str
    label: str
    order: int
    mime: str
    png_base64: str



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
    meta: dict = field(default_factory=dict)


@dataclass
class PipelineOutput:
    """Final aggregated output of the vision pipeline."""

    coordinates: list[list[tuple[float, float]]] = field(default_factory=list)
    warnings: list[Warning] = field(default_factory=list)
    stages_run: list[str] = field(default_factory=list)
    fuzzy_meta: dict | None = None
    stage_images: list[StageImage] = field(default_factory=list)

