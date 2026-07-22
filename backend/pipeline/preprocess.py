"""Stage 1: preprocess an image for edge detection."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pipeline.types import StageResult, Warning

if TYPE_CHECKING:
    from numpy.typing import NDArray


def preprocess(
    image: NDArray,
    variant: str = "balanced",
    rotation_deg: int = 0,
    invert: bool = False,
) -> StageResult:
    """
    Rotate and optionally invert an image, then convert to grayscale, blur it,
    and optionally Otsu-threshold it.

    Rotation is applied first (on the color image), followed by color inversion,
    then grayscale conversion. The ``balanced`` variant returns a binary image
    produced by Gaussian blur followed by Otsu thresholding. Other variants fall
    back to the blurred grayscale image so the stage remains usable while
    additional presets are developed.

    If OpenCV is unavailable at runtime, the stage returns the input unchanged
    and emits a warning so the pipeline can still be exercised in CI or test
    environments without the binary dependency.
    """
    if rotation_deg not in {0, 90, 180, 270}:
        raise ValueError(
            f"rotation_deg must be one of: 0, 90, 180, 270; got {rotation_deg}."
        )

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

    if rotation_deg == 90:
        image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    elif rotation_deg == 180:
        image = cv2.rotate(image, cv2.ROTATE_180)
    elif rotation_deg == 270:
        image = cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)

    if invert:
        image = cv2.bitwise_not(image)

    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    if variant == "balanced":
        _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return StageResult(data=binary, warnings=[], stage_name="preprocess")

    return StageResult(data=blurred, warnings=[], stage_name="preprocess")
