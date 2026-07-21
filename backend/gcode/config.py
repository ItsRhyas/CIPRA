"""SCARA machine configuration for G-Code generation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class ScaraConfig:
    """
    Physical SCARA machine configuration.

    Defaults match an A4 drawing area. Travel and draw speeds are optional;
    when omitted, no F-codes are emitted and the generated G-Code remains
    backward-compatible with feeds defined elsewhere.

    ``tool_offset_mm`` and ``origin`` were removed in this iteration; they may
    be reintroduced later once the robotics team finalizes the mounting and
    origin conventions.
    """

    work_area_w_mm: float = 210.0
    work_area_h_mm: float = 297.0
    travel_speed: Optional[float] = None
    draw_speed: Optional[float] = None
