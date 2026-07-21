"""Stage 2: edge detection with Canny."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pipeline.types import StageResult, Warning

if TYPE_CHECKING:
    from numpy.typing import NDArray


def edges(image: NDArray, threshold: int = 50) -> StageResult:
    """
    Detect edges using the Canny algorithm.

    Uses OpenCV's ``cv2.Canny`` with the supplied low ``threshold`` and a high
    threshold clipped to ``min(threshold * 2, 255)``. If OpenCV is unavailable,
    the input is returned unchanged and an ``opencv_missing`` warning is emitted
    so callers can degrade gracefully.
    """
    try:
        import cv2
    except ImportError:  # pragma: no cover - exercised by graceful-degradation test
        return StageResult(
            data=image,
            warnings=[
                Warning(
                    message="OpenCV is not available; edges returned input unchanged.",
                    stage="edges",
                    code="opencv_missing",
                )
            ],
            stage_name="edges",
        )

    edge_image = cv2.Canny(image, threshold, min(threshold * 2, 255))
    return StageResult(data=edge_image, warnings=[], stage_name="edges")
