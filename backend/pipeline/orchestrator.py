"""Vision pipeline orchestrator."""

from __future__ import annotations

import base64
from typing import TYPE_CHECKING

import numpy as np

from gcode.config import MachineConfig
from pipeline.contours import contours
from pipeline.edges import edges
from pipeline.fuzzy_threshold import fuzzy_auto_threshold
from pipeline.preprocess import preprocess
from pipeline.simplify import simplify
from pipeline.types import ConvertParams, PipelineOutput, StageImage, StageResult, Warning

if TYPE_CHECKING:
    from numpy.typing import NDArray

MAX_PREVIEW_DIMENSION = 800

STAGE_LABELS = {
    "preprocess": "Preprocessed",
    "edges": "Edges",
    "contours": "Contours",
    "simplify": "Simplified",
}


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

        preprocess_result: StageResult = preprocess(
            image,
            params.variant,
            rotation_deg=params.rotation_deg,
            flip_h=params.flip_h,
            flip_v=params.flip_v,
        )
        warnings.extend(preprocess_result.warnings)
        stages_run.append(preprocess_result.stage_name or "preprocess")

        threshold = params.threshold
        fuzzy_meta: dict | None = None
        if params.auto_threshold:
            gray = preprocess_result.meta.get("grayscale", preprocess_result.data)
            fuzzy_result = fuzzy_auto_threshold(gray)
            threshold = fuzzy_result.threshold
            fuzzy_meta = fuzzy_result.diagnostics
            stages_run.append("fuzzy")

        edges_result: StageResult = edges(preprocess_result.data, threshold)
        warnings.extend(edges_result.warnings)
        stages_run.append(edges_result.stage_name or "edges")

        contours_result: StageResult = contours(edges_result.data)
        warnings.extend(contours_result.warnings)
        stages_run.append(contours_result.stage_name or "contours")

        simplify_result: StageResult = simplify(
            contours_result.data,
            config,
            params.simplify_tolerance,
            image.shape,
            params.scale,
        )
        warnings.extend(simplify_result.warnings)
        stages_run.append(simplify_result.stage_name or "simplify")

        coordinates = _extract_coordinates(simplify_result.data)

        stage_images: list[StageImage] = []
        if params.include_stage_images:
            stage_images = self._capture_stage_images(
                preprocess_result=preprocess_result,
                edges_result=edges_result,
                contours_result=contours_result,
                simplify_result=simplify_result,
                image_shape=image.shape,
                config=config,
            )

        return PipelineOutput(
            coordinates=coordinates,
            warnings=warnings,
            stages_run=stages_run,
            fuzzy_meta=fuzzy_meta,
            stage_images=stage_images,
        )

    def _capture_stage_images(
        self,
        *,
        preprocess_result: StageResult,
        edges_result: StageResult,
        contours_result: StageResult,
        simplify_result: StageResult,
        image_shape: tuple[int, ...],
        config: MachineConfig,
    ) -> list[StageImage]:
        """Encode the four visual pipeline stages as base64 PNG previews."""
        captured: list[StageImage] = []

        preprocess_array = np.asarray(preprocess_result.data)
        captured.append(
            StageImage(
                id="preprocess",
                label=STAGE_LABELS["preprocess"],
                order=0,
                mime="image/png",
                png_base64=_encode_ndarray_png(_downscale_if_needed(preprocess_array)),
            )
        )

        edges_array = np.asarray(edges_result.data)
        captured.append(
            StageImage(
                id="edges",
                label=STAGE_LABELS["edges"],
                order=1,
                mime="image/png",
                png_base64=_encode_ndarray_png(_downscale_if_needed(edges_array)),
            )
        )

        contours_canvas = _render_pixel_paths(
            contours_result.data,
            image_shape,
        )
        captured.append(
            StageImage(
                id="contours",
                label=STAGE_LABELS["contours"],
                order=2,
                mime="image/png",
                png_base64=_encode_ndarray_png(_downscale_if_needed(contours_canvas)),
            )
        )

        simplify_canvas = _render_mm_paths(
            simplify_result.data,
            config,
        )
        captured.append(
            StageImage(
                id="simplify",
                label=STAGE_LABELS["simplify"],
                order=3,
                mime="image/png",
                png_base64=_encode_ndarray_png(_downscale_if_needed(simplify_canvas)),
            )
        )

        return captured


def _downscale_if_needed(array: NDArray) -> NDArray:
    """Resize an image so its longest side is at most 800 px."""
    if array.ndim < 2:
        return array

    height, width = array.shape[:2]
    max_side = max(height, width)
    if max_side <= MAX_PREVIEW_DIMENSION:
        return array

    import cv2

    scale = MAX_PREVIEW_DIMENSION / max_side
    new_size = (int(width * scale), int(height * scale))
    return cv2.resize(array, new_size, interpolation=cv2.INTER_AREA)


def _encode_ndarray_png(array: NDArray) -> str:
    """PNG-encode an image and return it as an ASCII base64 string."""
    import cv2

    success, buffer = cv2.imencode(".png", array)
    if not success:
        raise RuntimeError("Failed to encode stage image as PNG.")
    return base64.b64encode(buffer).decode("ascii")


def _render_pixel_paths(
    paths: object,
    image_shape: tuple[int, ...],
) -> NDArray:
    """Render pixel-space paths on a white canvas matching the image shape."""
    import cv2

    if len(image_shape) < 2:
        raise ValueError("image_shape must contain at least height and width.")

    height, width = int(image_shape[0]), int(image_shape[1])
    canvas = np.full((height, width, 3), 255, dtype=np.uint8)

    polylines = _paths_to_polylines(paths)
    if polylines:
        cv2.polylines(canvas, polylines, False, (0, 0, 0), 1)

    return canvas


def _render_mm_paths(
    paths: object,
    config: MachineConfig,
) -> NDArray:
    """Render millimeter-space paths on a white work-area canvas."""
    import cv2

    max_mm = max(config.work_area_w_mm, config.work_area_h_mm)
    scale = MAX_PREVIEW_DIMENSION / max_mm
    width = int(config.work_area_w_mm * scale)
    height = int(config.work_area_h_mm * scale)
    canvas = np.full((height, width, 3), 255, dtype=np.uint8)

    polylines = _mm_paths_to_pixel_polylines(paths, scale)
    if polylines:
        cv2.polylines(canvas, polylines, False, (0, 0, 0), 1)

    return canvas


def _paths_to_polylines(paths: object) -> list[NDArray]:
    """Convert a list of pixel paths to OpenCV polylines."""
    polylines: list[NDArray] = []
    if not isinstance(paths, list):
        return polylines

    for path in paths:
        if not isinstance(path, list) or len(path) < 2:
            continue
        points = [
            (int(point[0]), int(point[1]))
            for point in path
            if isinstance(point, (list, tuple)) and len(point) == 2
        ]
        if len(points) >= 2:
            polylines.append(np.array(points, dtype=np.int32).reshape(-1, 1, 2))

    return polylines


def _mm_paths_to_pixel_polylines(
    paths: object,
    scale: float,
) -> list[NDArray]:
    """Convert millimeter paths to pixel polylines without Y-flipping."""
    polylines: list[NDArray] = []
    if not isinstance(paths, list):
        return polylines

    for path in paths:
        if not isinstance(path, list) or len(path) < 2:
            continue
        points = [
            (int(float(point[0]) * scale), int(float(point[1]) * scale))
            for point in path
            if isinstance(point, (list, tuple)) and len(point) == 2
        ]
        if len(points) >= 2:
            polylines.append(np.array(points, dtype=np.int32).reshape(-1, 1, 2))

    return polylines


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
