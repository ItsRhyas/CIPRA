"""Stage 4: path simplification stub."""

from __future__ import annotations

from pipeline.types import StageResult, Warning


def simplify(contours: list) -> StageResult:
    """
    Simplify contours and order them into a drawing path.

    This is a stub implementation that returns a deterministic placeholder
    coordinate list and emits a warning. Real Douglas-Peucker + TSP ordering
    will replace this in a future slice.
    """
    return StageResult(
        data=[(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)],
        warnings=[
            Warning(
                message="simplify: not yet implemented — returning input unmodified",
                stage="simplify",
                code="stub",
            )
        ],
        stage_name="simplify",
    )
