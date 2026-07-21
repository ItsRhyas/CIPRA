"""Tests for the G-Code formatter."""

from __future__ import annotations

from pathlib import Path

from gcode.config import ScaraConfig
from gcode.formatter import FormatResult, format_gcode

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _load_gcode(name: str) -> str:
    """Read a golden G-Code fixture file."""
    return (FIXTURES_DIR / name).read_text(encoding="utf-8")


def test_default_scara_config_a4_defaults() -> None:
    """The default SCARA config matches an A4 work area."""
    config = ScaraConfig()

    assert config.work_area_w_mm == 210.0
    assert config.work_area_h_mm == 297.0
    assert config.travel_speed is None
    assert config.draw_speed is None


def test_format_gcode_matches_golden_snapshot() -> None:
    """A simple path produces the committed golden G-Code output."""
    paths: list[list[tuple[float, float]]] = [[(10.0, 10.0), (50.0, 50.0)]]
    result = format_gcode(paths)

    assert isinstance(result, FormatResult)
    assert result.gcode == _load_gcode("simple_path.gcode")
    assert result.warnings == []


def test_format_gcode_multiple_paths() -> None:
    """Multiple paths are separated by pen-up travel moves."""
    paths: list[list[tuple[float, float]]] = [
        [(10.0, 10.0), (50.0, 50.0)],
        [(60.0, 60.0), (70.0, 70.0), (80.0, 80.0)],
    ]
    result = format_gcode(paths)

    assert result.gcode == _load_gcode("multi_path.gcode")
    assert result.warnings == []


def test_format_gcode_empty_paths() -> None:
    """An empty path list returns only the preamble and a warning."""
    result = format_gcode([])

    assert result.gcode == "G21 G90\nM5\n"
    assert result.warnings == ["No paths were provided; output contains only preamble."]


def test_format_gcode_single_point_path() -> None:
    """A path with a single point lifts the tool without drawing moves."""
    paths: list[list[tuple[float, float]]] = [[(25.0, 75.0)]]
    result = format_gcode(paths)

    assert result.gcode == "G21 G90\nG0 X25.00 Y75.00\nM3\nM5\n"
    assert result.warnings == []


def test_format_gcode_clamps_out_of_area_coordinates() -> None:
    """Coordinates outside the work area are clamped and warned."""
    config = ScaraConfig(work_area_w_mm=200.0, work_area_h_mm=200.0)
    paths: list[list[tuple[float, float]]] = [[(-10.0, 50.0), (300.0, 10.0)]]
    result = format_gcode(paths, config=config)

    assert "clipped to work area minimum" in result.warnings[0]
    assert "clipped to work area maximum" in result.warnings[1]
    assert "G0 X0.00 Y50.00" in result.gcode
    assert "G1 X200.00 Y10.00" in result.gcode


def test_format_gcode_emits_f_codes_when_speeds_provided() -> None:
    """F-codes are appended to G0 and G1 lines when speeds are set."""
    paths: list[list[tuple[float, float]]] = [
        [(10.0, 10.0), (50.0, 50.0)],
        [(60.0, 60.0), (70.0, 70.0)],
    ]
    result = format_gcode(
        paths,
        travel_speed=3000.0,
        draw_speed=1500.0,
    )

    assert "G0 X10.00 Y10.00 F3000.00" in result.gcode
    assert "G1 X50.00 Y50.00 F1500.00" in result.gcode
    assert "G0 X60.00 Y60.00 F3000.00" in result.gcode
    assert "G1 X70.00 Y70.00 F1500.00" in result.gcode


def test_format_gcode_omits_f_codes_when_speeds_none() -> None:
    """No F-codes appear when speeds default to None."""
    paths: list[list[tuple[float, float]]] = [[(10.0, 10.0), (50.0, 50.0)]]
    result = format_gcode(paths)

    assert "F" not in result.gcode
    assert result.gcode == _load_gcode("simple_path.gcode")
