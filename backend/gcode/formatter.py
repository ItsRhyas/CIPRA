"""G-Code formatter for ordered coordinate paths."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from gcode.config import ScaraConfig


@dataclass
class FormatResult:
    """Result of formatting coordinate paths into G-Code."""

    gcode: str
    warnings: list[str] = field(default_factory=list)


def _fmt(value: float) -> str:
    """Format a coordinate to two decimal places."""
    return f"{value:.2f}"


def _clamp(
    value: float,
    min_value: float,
    max_value: float,
    axis: str,
    warnings: list[str],
) -> float:
    """Clamp a coordinate to the work area and emit a warning if clipped."""
    if value < min_value:
        warnings.append(
            f"Coordinate {axis}={value:.2f} clipped to work area minimum {min_value:.2f}."
        )
        return min_value
    if value > max_value:
        warnings.append(
            f"Coordinate {axis}={value:.2f} clipped to work area maximum {max_value:.2f}."
        )
        return max_value
    return value


def format_gcode(
    paths: list[list[tuple[float, float]]],
    config: ScaraConfig | None = None,
    travel_speed: Optional[float] = None,
    draw_speed: Optional[float] = None,
) -> FormatResult:
    """
    Convert a list of drawing paths into spec-compliant G-Code.

    Each path is a list of (x, y) points in millimeters. The output uses the
    command set {G90, G21, M3, M5, G0, G1} and clamps coordinates that fall
    outside the configured work area. F-codes are appended to G0/G1 lines only
    when the corresponding speed is provided, preserving backward compatibility
    with callers that rely on externally configured feed rates.
    """
    config = config or ScaraConfig()
    warnings: list[str] = []
    lines: list[str] = []

    lines.append("G21 G90")

    valid_paths = [path for path in paths if path]
    if not valid_paths:
        warnings.append("No paths were provided; output contains only preamble.")
        lines.append("M5")
        return FormatResult(gcode="\n".join(lines) + "\n", warnings=warnings)

    travel_f = f" F{_fmt(travel_speed)}" if travel_speed is not None else ""
    draw_f = f" F{_fmt(draw_speed)}" if draw_speed is not None else ""

    for path in valid_paths:
        first_x, first_y = path[0]
        first_x = _clamp(first_x, 0.0, config.work_area_w_mm, "X", warnings)
        first_y = _clamp(first_y, 0.0, config.work_area_h_mm, "Y", warnings)

        lines.append(f"G0 X{_fmt(first_x)} Y{_fmt(first_y)}{travel_f}")
        lines.append("M3")

        for x, y in path[1:]:
            x = _clamp(x, 0.0, config.work_area_w_mm, "X", warnings)
            y = _clamp(y, 0.0, config.work_area_h_mm, "Y", warnings)
            lines.append(f"G1 X{_fmt(x)} Y{_fmt(y)}{draw_f}")

        lines.append("M5")

    return FormatResult(gcode="\n".join(lines) + "\n", warnings=warnings)
