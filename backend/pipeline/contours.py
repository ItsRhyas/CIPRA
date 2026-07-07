"""Stage 3: contour extraction with OpenCV."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pipeline.types import StageResult, Warning

if TYPE_CHECKING:
    from numpy.typing import NDArray

MIN_AREA_PX = 100
MIN_PERIMETER_PX = 20


def contours(image: NDArray) -> StageResult:
    """
    Extract external contours from an edge map.

    Uses ``cv2.findContours`` with ``RETR_EXTERNAL`` and ``CHAIN_APPROX_NONE``,
    then filters out small noise using area and perimeter thresholds. If
    OpenCV is unavailable, an empty path list and an ``opencv_missing`` warning
    are returned.
    """
    try:
        import cv2
    except ImportError:  # pragma: no cover - exercised by graceful-degradation test
        return StageResult(
            data=[],
            warnings=[
                Warning(
                    message="OpenCV is not available; contours returned empty list.",
                    stage="contours",
                    code="opencv_missing",
                )
            ],
            stage_name="contours",
        )

    found, _ = cv2.findContours(image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

    paths: list[list[tuple[float, float]]] = []
    for contour in found:
        area = cv2.contourArea(contour)
        x, y, width, height = cv2.boundingRect(contour)
        bbox_area = width * height
        perimeter = cv2.arcLength(contour, True)
        if (area >= MIN_AREA_PX or bbox_area >= MIN_AREA_PX) and perimeter >= MIN_PERIMETER_PX:
            path = [(float(point[0][0]), float(point[0][1])) for point in contour]
            paths.append(path)

    warnings: list[Warning] = []
    if not paths:
        warnings.append(
            Warning(
                message="No contours survived area/perimeter filtering.",
                stage="contours",
                code="no_contours_found",
            )
        )

    return StageResult(data=paths, warnings=warnings, stage_name="contours")
