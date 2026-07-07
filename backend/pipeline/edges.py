"""Stage 2: edge detection with Canny."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pipeline.types import StageResult, Warning

if TYPE_CHECKING:
    from numpy.typing import NDArray


def edges(image: NDArray) -> StageResult:
    """
    Detect edges using the Canny algorithm.

    Uses OpenCV's ``cv2.Canny`` with low threshold 50 and high threshold 150.
    If OpenCV is unavailable, the input is returned unchanged and an
    ``opencv_missing`` warning is emitted so callers can degrade gracefully.
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

    edge_image = cv2.Canny(image, 50, 150)
    return StageResult(data=edge_image, warnings=[], stage_name="edges")
