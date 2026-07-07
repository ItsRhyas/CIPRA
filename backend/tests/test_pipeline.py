"""Tests for the vision pipeline stages and orchestrator."""

from __future__ import annotations

import sys
from typing import TYPE_CHECKING

import numpy as np
import pytest

from gcode.config import ScaraConfig
from pipeline.contours import contours
from pipeline.edges import edges
from pipeline.orchestrator import PipelineOrchestrator
from pipeline.preprocess import preprocess
from pipeline.simplify import simplify
from pipeline.types import PipelineOutput, StageResult

if TYPE_CHECKING:
    from numpy.typing import NDArray


@pytest.fixture
def synthetic_image() -> NDArray:
    """Return a synthetic 100x100 grayscale image."""
    return np.zeros((100, 100, 3), dtype=np.uint8)


@pytest.fixture
def default_config() -> ScaraConfig:
    """Return the default SCARA configuration."""
    return ScaraConfig()


def test_preprocess_returns_stage_result_with_ndarray(synthetic_image: NDArray) -> None:
    """preprocess returns a StageResult whose data is an ndarray."""
    result = preprocess(synthetic_image)

    assert isinstance(result, StageResult)
    assert isinstance(result.data, np.ndarray)
    assert result.stage_name == "preprocess"


def test_edges_returns_stage_result_with_ndarray(synthetic_image: NDArray) -> None:
    """edges returns a StageResult whose data is an ndarray and emits a stub warning."""
    result = edges(synthetic_image)

    assert isinstance(result, StageResult)
    assert isinstance(result.data, np.ndarray)
    assert result.stage_name == "edges"
    assert any("not yet implemented" in warning.message for warning in result.warnings)


def test_contours_returns_stage_result_with_list(synthetic_image: NDArray) -> None:
    """contours returns a StageResult whose data is a list and emits a stub warning."""
    result = contours(synthetic_image)

    assert isinstance(result, StageResult)
    assert isinstance(result.data, list)
    assert result.stage_name == "contours"
    assert any("not yet implemented" in warning.message for warning in result.warnings)


def test_simplify_returns_stage_result_with_coordinates() -> None:
    """simplify returns a StageResult whose data is a list of coordinate tuples."""
    result = simplify([[(0.0, 0.0), (10.0, 10.0)]])

    assert isinstance(result, StageResult)
    assert isinstance(result.data, list)
    assert all(isinstance(point, tuple) and len(point) == 2 for point in result.data)
    assert result.stage_name == "simplify"
    assert any("not yet implemented" in warning.message for warning in result.warnings)


def test_orchestrator_returns_pipeline_output(
    synthetic_image: NDArray,
    default_config: ScaraConfig,
) -> None:
    """The orchestrator chains stages and returns a PipelineOutput."""
    orchestrator = PipelineOrchestrator()
    output = orchestrator.run(synthetic_image, default_config)

    assert isinstance(output, PipelineOutput)
    assert output.stages_run == ["preprocess", "edges", "contours", "simplify"]
    assert isinstance(output.coordinates, list)
    assert len(output.coordinates) > 0
    assert all(isinstance(coord, tuple) and len(coord) == 2 for coord in output.coordinates)


def test_orchestrator_aggregates_stub_warnings(
    synthetic_image: NDArray,
    default_config: ScaraConfig,
) -> None:
    """The orchestrator aggregates warnings from stub stages."""
    orchestrator = PipelineOrchestrator()
    output = orchestrator.run(synthetic_image, default_config)

    messages = [warning.message for warning in output.warnings]
    assert any("edges: not yet implemented" in message for message in messages)
    assert any("contours: not yet implemented" in message for message in messages)
    assert any("simplify: not yet implemented" in message for message in messages)


def test_preprocess_graceful_when_opencv_missing(synthetic_image: NDArray) -> None:
    """preprocess returns a warning instead of crashing when OpenCV is unavailable."""
    real_cv2 = sys.modules.get("cv2")
    sys.modules["cv2"] = None  # type: ignore[assignment]

    try:
        result = preprocess(synthetic_image)
    finally:
        if real_cv2 is not None:
            sys.modules["cv2"] = real_cv2
        else:
            sys.modules.pop("cv2", None)

    assert isinstance(result, StageResult)
    assert any("OpenCV is not available" in warning.message for warning in result.warnings)
    assert isinstance(result.data, np.ndarray)
