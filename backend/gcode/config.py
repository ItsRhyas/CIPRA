"""SCARA machine configuration for G-Code generation."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ScaraConfig:
    """
    Physical SCARA machine configuration.

    Defaults match an A4 drawing area with common pen-plotter speeds.
    """

    work_area_w_mm: float = 210.0
    work_area_h_mm: float = 297.0
    travel_speed: float = 3000.0
    draw_speed: float = 1500.0
    tool_offset_mm: float = 0.0
    origin: str = "bottom-left"
