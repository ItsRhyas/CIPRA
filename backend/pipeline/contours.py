"""Stage 3: contour extraction stub."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pipeline.types import StageResult, Warning

if TYPE_CHECKING:
    from numpy.typing import NDArray


def contours(image: NDArray) -> StageResult:
    """
    Extract contours from an edge map.

    This is a stub implementation that returns a deterministic placeholder
    contour and emits a warning. Real contour extraction will replace this
    in a future slice.
    """
    return StageResult(
        data=[[(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)]],
        warnings=[
            Warning(
                message="contours: not yet implemented — returning input unmodified",
                stage="contours",
                code="stub",
            )
        ],
        stage_name="contours",
    )
