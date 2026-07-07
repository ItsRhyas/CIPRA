"""Stage 1: preprocess an image for edge detection."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pipeline.types import StageResult, Warning

if TYPE_CHECKING:
    from numpy.typing import NDArray


def preprocess(image: NDArray) -> StageResult:
    """
    Convert an image to grayscale and apply Gaussian blur.

    If OpenCV is unavailable at runtime, the stage returns the input unchanged
    and emits a warning so the pipeline can still be exercised in CI or test
    environments without the binary dependency.
    """
    try:
        import cv2
    except ImportError:  # pragma: no cover - exercised by graceful-degradation test
        return StageResult(
            data=image,
            warnings=[
                Warning(
                    message="OpenCV is not available; preprocess returned input unchanged.",
                    stage="preprocess",
                    code="opencv_missing",
                )
            ],
            stage_name="preprocess",
        )

    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    return StageResult(data=blurred, warnings=[], stage_name="preprocess")
