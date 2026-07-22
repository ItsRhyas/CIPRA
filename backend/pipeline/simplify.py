"""Stage 4: polygon simplification and coordinate transform."""

from __future__ import annotations

import numpy as np

from gcode.config import ScaraConfig
from pipeline.types import StageResult, Warning


def simplify(
    contours: list[list[tuple[float, float]]],
    config: ScaraConfig,
    tolerance: float = 2.0,
    image_shape: tuple[int, ...] = (0, 0),
    scale: float = 1.0,
) -> StageResult:
    """
    Simplify contours with Douglas-Peucker and convert pixels to millimeters.

    The algorithm:

    1. Apply ``cv2.approxPolyDP`` to each contour using the supplied tolerance.
    2. Order disconnected paths with a nearest-neighbor TSP heuristic.
    3. Convert pixel coordinates to millimeters using the image dimensions and
       the configured work area.
    4. Flip the Y axis so the origin is at the bottom-left of the work area.
    5. Multiply millimeter coordinates by ``scale``.

    If OpenCV is unavailable, an empty coordinate list and an ``opencv_missing``
    warning are returned.
    """
    try:
        import cv2
    except ImportError:  # pragma: no cover - exercised by graceful-degradation test
        return StageResult(
            data=[],
            warnings=[
                Warning(
                    message="OpenCV is not available; simplify returned empty list.",
                    stage="simplify",
                    code="opencv_missing",
                )
            ],
            stage_name="simplify",
        )

    if not contours:
        return StageResult(
            data=[],
            warnings=[
                Warning(
                    message="No contours provided to simplify.",
                    stage="simplify",
                    code="no_contours",
                )
            ],
            stage_name="simplify",
        )

    if len(image_shape) < 2 or image_shape[0] == 0 or image_shape[1] == 0:
        return StageResult(
            data=[],
            warnings=[
                Warning(
                    message="Invalid image shape for pixel-to-millimeter conversion.",
                    stage="simplify",
                    code="invalid_image_shape",
                )
            ],
            stage_name="simplify",
        )

    image_h, image_w = image_shape[0], image_shape[1]
    fit = min(config.work_area_w_mm / image_w, config.work_area_h_mm / image_h)
    draw_w_mm = image_w * fit
    draw_h_mm = image_h * fit
    offset_x_mm = (config.work_area_w_mm - draw_w_mm) / 2.0
    offset_y_mm = (config.work_area_h_mm - draw_h_mm) / 2.0

    simplified_paths: list[list[tuple[float, float]]] = []
    for path in contours:
        contour_array = np.array(path, dtype=np.float32).reshape(-1, 1, 2)
        approx = cv2.approxPolyDP(contour_array, tolerance, closed=True)
        simplified_paths.append(
            [(float(point[0][0]), float(point[0][1])) for point in approx]
        )

    ordered_paths = _nn_tsp_order(simplified_paths)

    mm_paths: list[list[tuple[float, float]]] = []
    for path in ordered_paths:
        mm_path: list[tuple[float, float]] = []
        for px, py in path:
            mm_x = (px * fit + offset_x_mm) * scale
            mm_y = (config.work_area_h_mm - offset_y_mm - (py * fit)) * scale
            mm_path.append((mm_x, mm_y))
        mm_paths.append(mm_path)

    return StageResult(data=mm_paths, warnings=[], stage_name="simplify")


def _centroid(path: list[tuple[float, float]]) -> tuple[float, float]:
    """Return the centroid of a path."""
    if not path:
        return (0.0, 0.0)
    xs = sum(point[0] for point in path)
    ys = sum(point[1] for point in path)
    return (xs / len(path), ys / len(path))


def _squared_distance(
    a: tuple[float, float], b: tuple[float, float]
) -> float:
    """Return the squared Euclidean distance between two points."""
    dx = a[0] - b[0]
    dy = a[1] - b[1]
    return dx * dx + dy * dy


def _nn_tsp_order(
    paths: list[list[tuple[float, float]]],
) -> list[list[tuple[float, float]]]:
    """
    Order disconnected paths using a nearest-neighbor heuristic.

    The next path is chosen as the one whose centroid is closest to the
    centroid of the most recently placed path. This is deterministic and
    avoids an expensive full TSP search.
    """
    if not paths:
        return []

    ordered = [paths[0]]
    remaining = list(paths[1:])

    while remaining:
        last_centroid = _centroid(ordered[-1])
        nearest_index = 0
        nearest_distance = float("inf")
        for index, path in enumerate(remaining):
            distance = _squared_distance(last_centroid, _centroid(path))
            if distance < nearest_distance:
                nearest_distance = distance
                nearest_index = index
        ordered.append(remaining.pop(nearest_index))

    return ordered
