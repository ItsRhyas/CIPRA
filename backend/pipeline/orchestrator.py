"""Vision pipeline orchestrator."""

from __future__ import annotations

from typing import TYPE_CHECKING

from gcode.config import ScaraConfig
from pipeline.contours import contours
from pipeline.edges import edges
from pipeline.preprocess import preprocess
from pipeline.simplify import simplify
from pipeline.types import ConvertParams, PipelineOutput, StageResult, Warning

if TYPE_CHECKING:
    from numpy.typing import NDArray


class PipelineOrchestrator:
    """Chain the four vision-pipeline stages and aggregate their outputs."""

    def run(
        self,
        image: NDArray,
        config: ScaraConfig,
        params: ConvertParams | None = None,
    ) -> PipelineOutput:
        """
        Run preprocess → edges → contours → simplify and return coordinates.

        Args:
            image: Input image as a NumPy ndarray.
            config: SCARA machine configuration for pixel-to-millimeter scaling.
            params: Optional conversion parameters. When omitted, balanced defaults
                are used.

        Returns:
            PipelineOutput with ordered coordinates and aggregated warnings.
        """
        if params is None:
            params = ConvertParams()

        warnings: list[Warning] = []
        stages_run: list[str] = []

        result: StageResult = preprocess(image, params.variant)
        warnings.extend(result.warnings)
        stages_run.append(result.stage_name or "preprocess")

        result = edges(result.data)
        warnings.extend(result.warnings)
        stages_run.append(result.stage_name or "edges")

        result = contours(result.data)
        warnings.extend(result.warnings)
        stages_run.append(result.stage_name or "contours")

        result = simplify(
            result.data, config, params.simplify_tolerance, image.shape
        )
        warnings.extend(result.warnings)
        stages_run.append(result.stage_name or "simplify")

        coordinates = _extract_coordinates(result.data)

        return PipelineOutput(
            coordinates=coordinates,
            warnings=warnings,
            stages_run=stages_run,
        )


def _extract_coordinates(data: object) -> list[tuple[float, float]]:
    """Normalize a simplify stage result into a flat list of (x, y) tuples."""
    coordinates: list[tuple[float, float]] = []
    if not isinstance(data, list):
        return coordinates

    for item in data:
        if isinstance(item, tuple) and len(item) == 2:
            coordinates.append((float(item[0]), float(item[1])))
        elif isinstance(item, list):
            for point in item:
                if isinstance(point, tuple) and len(point) == 2:
                    coordinates.append((float(point[0]), float(point[1])))

    return coordinates
