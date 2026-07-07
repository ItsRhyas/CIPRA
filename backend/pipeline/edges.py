"""Stage 2: edge detection stub."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pipeline.types import StageResult, Warning

if TYPE_CHECKING:
    from numpy.typing import NDArray


def edges(image: NDArray) -> StageResult:
    """
    Detect edges in a preprocessed image.

    This is a stub implementation that passes the input through unchanged and
    emits a warning. Real Canny edge detection will replace this in a future
    slice.
    """
    return StageResult(
        data=image,
        warnings=[
            Warning(
                message="edges: not yet implemented — returning input unmodified",
                stage="edges",
                code="stub",
            )
        ],
        stage_name="edges",
    )
