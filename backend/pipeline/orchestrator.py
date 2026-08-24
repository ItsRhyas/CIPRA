"""Vision pipeline orchestrator."""

from __future__ import annotations

from typing import TYPE_CHECKING

from gcode.config import MachineConfig
from pipeline.contours import contours
from pipeline.edges import edges
from pipeline.fuzzy_threshold import fuzzy_auto_threshold
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
        config: MachineConfig,
        params: ConvertParams | None = None,
    ) -> PipelineOutput:
        """
        Run preprocess → [fuzzy] → edges → contours → simplify and return
        coordinates. When ``params.auto_threshold`` is set, the ``fuzzy``
        stage computes the Canny threshold from the preprocessed grayscale
        image instead of using ``params.threshold``.

        Args:
            image: Input image as a NumPy ndarray.
            config: Machine configuration for pixel-to-millimeter scaling.
            params: Optional conversion parameters. When omitted, balanced defaults
                are used.

        Returns:
            PipelineOutput with ordered coordinates and aggregated warnings.
        """
        if params is None:
            params = ConvertParams()

        warnings: list[Warning] = []
        stages_run: list[str] = []

        result: StageResult = preprocess(
            image,
            params.variant,
            rotation_deg=params.rotation_deg,
            flip_h=params.flip_h,
            flip_v=params.flip_v,
        )
        warnings.extend(result.warnings)
        stages_run.append(result.stage_name or "preprocess")

        threshold = params.threshold
        fuzzy_meta: dict | None = None
        if params.auto_threshold:
            gray = result.meta.get("grayscale", result.data)
            fuzzy_result = fuzzy_auto_threshold(gray)
            threshold = fuzzy_result.threshold
            fuzzy_meta = fuzzy_result.diagnostics
            stages_run.append("fuzzy")

        result = edges(result.data, threshold)
        warnings.extend(result.warnings)
        stages_run.append(result.stage_name or "edges")

        result = contours(result.data)
        warnings.extend(result.warnings)
        stages_run.append(result.stage_name or "contours")

        result = simplify(
            result.data,
            config,
            params.simplify_tolerance,
            image.shape,
            params.scale,
        )
        warnings.extend(result.warnings)
        stages_run.append(result.stage_name or "simplify")

        coordinates = _extract_coordinates(result.data)

        return PipelineOutput(
            coordinates=coordinates,
            warnings=warnings,
            stages_run=stages_run,
            fuzzy_meta=fuzzy_meta,
        )


def _extract_coordinates(data: object) -> list[list[tuple[float, float]]]:
    """Normalize a simplify stage result into a nested list of drawing paths."""
    paths: list[list[tuple[float, float]]] = []
    if not isinstance(data, list):
        return paths

    for item in data:
        if isinstance(item, list):
            path: list[tuple[float, float]] = []
            for point in item:
                if isinstance(point, tuple) and len(point) == 2:
                    path.append((float(point[0]), float(point[1])))
            if path:
                paths.append(path)

    return paths
