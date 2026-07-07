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
from pipeline.types import ConvertParams, PipelineOutput, StageResult

if TYPE_CHECKING:
    from numpy.typing import NDArray


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


def test_edges_returns_stage_result_with_binary_edges(synthetic_image: NDArray) -> None:
    """edges returns a binary edge map and no stub warnings."""
    preprocessed = preprocess(synthetic_image)
    result = edges(preprocessed.data)

    assert isinstance(result, StageResult)
    assert isinstance(result.data, np.ndarray)
    assert result.stage_name == "edges"
    assert not any("not yet implemented" in warning.message for warning in result.warnings)
    assert np.all(np.isin(result.data, [0, 255]))
    assert np.count_nonzero(result.data) > 0


def test_contours_returns_filtered_paths(synthetic_image: NDArray) -> None:
    """contours returns a list of filtered paths and no stub warnings."""
    preprocessed = preprocess(synthetic_image)
    edge_map = edges(preprocessed.data)
    result = contours(edge_map.data)

    assert isinstance(result, StageResult)
    assert isinstance(result.data, list)
    assert result.stage_name == "contours"
    assert not any("not yet implemented" in warning.message for warning in result.warnings)
    assert len(result.data) >= 1
    for path in result.data:
        assert all(isinstance(point, tuple) and len(point) == 2 for point in path)


def test_simplify_returns_stage_result_with_coordinates(
    default_config: ScaraConfig,
) -> None:
    """simplify returns a StageResult whose data is a list of coordinate tuples."""
    result = simplify([[(0.0, 0.0), (10.0, 10.0)]], default_config, image_shape=(100, 100))

    assert isinstance(result, StageResult)
    assert isinstance(result.data, list)
    assert all(isinstance(point, tuple) and len(point) == 2 for point in result.data)
    assert result.stage_name == "simplify"
    assert not any("not yet implemented" in warning.message for warning in result.warnings)


def test_orchestrator_returns_pipeline_output(
    synthetic_image: NDArray,
    default_config: ScaraConfig,
) -> None:
    """The orchestrator chains stages and returns a PipelineOutput."""
    orchestrator = PipelineOrchestrator()
    params = ConvertParams(variant="balanced", simplify_tolerance=2.0)
    output = orchestrator.run(synthetic_image, default_config, params)

    assert isinstance(output, PipelineOutput)
    assert output.stages_run == ["preprocess", "edges", "contours", "simplify"]
    assert isinstance(output.coordinates, list)
    assert len(output.coordinates) > 0
    assert all(isinstance(coord, tuple) and len(coord) == 2 for coord in output.coordinates)


def test_orchestrator_emits_no_stub_warnings(
    synthetic_image: NDArray,
    default_config: ScaraConfig,
) -> None:
    """The orchestrator no longer emits stub warnings for real stages."""
    orchestrator = PipelineOrchestrator()
    output = orchestrator.run(synthetic_image, default_config)

    messages = [warning.message for warning in output.warnings]
    assert not any("not yet implemented" in message for message in messages)


def test_canny_output_contains_edges(synthetic_image: NDArray) -> None:
    """Canny detects the drawn shapes in the fixture image."""
    preprocessed = preprocess(synthetic_image)
    result = edges(preprocessed.data)

    assert np.count_nonzero(result.data) > 100


def test_contours_find_rectangle_and_line(synthetic_image: NDArray) -> None:
    """The contour stage finds both the rectangle and the diagonal line."""
    preprocessed = preprocess(synthetic_image)
    edge_map = edges(preprocessed.data)
    result = contours(edge_map.data)

    assert len(result.data) >= 2
    for path in result.data:
        assert len(path) >= 4


def test_dp_simplification_reduces_vertices(default_config: ScaraConfig) -> None:
    """Douglas-Peucker collapses collinear points into fewer vertices."""
    dense_line = [(float(x), 0.0) for x in range(101)]
    result = simplify([dense_line], default_config, tolerance=1.0, image_shape=(200, 200))

    assert len(result.data) < len(dense_line)
    assert len(result.data) <= 4


def test_px_to_mm_scaling(default_config: ScaraConfig) -> None:
    """Pixel coordinates scale linearly to the configured work area."""
    result = simplify(
        [[(100.0, 100.0)]], default_config, tolerance=2.0, image_shape=(200, 200)
    )

    assert len(result.data) == 1
    x_mm, y_mm = result.data[0]
    assert x_mm == pytest.approx(105.0)
    assert y_mm == pytest.approx(148.5)


def test_y_flip_uses_bottom_left_origin(default_config: ScaraConfig) -> None:
    """The top of the image maps to the top of the work area (bottom-left origin)."""
    top_left = simplify([[(0.0, 0.0)]], default_config, tolerance=2.0, image_shape=(200, 200))
    bottom_left = simplify(
        [[(0.0, 200.0)]], default_config, tolerance=2.0, image_shape=(200, 200)
    )

    assert top_left.data[0] == pytest.approx((0.0, default_config.work_area_h_mm))
    assert bottom_left.data[0] == pytest.approx((0.0, 0.0))


def test_tsp_ordering_is_deterministic(default_config: ScaraConfig) -> None:
    """Nearest-neighbor path ordering produces the same result on every run."""
    path_a = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)]
    path_b = [(100.0, 100.0), (110.0, 100.0), (110.0, 110.0), (100.0, 110.0)]

    first = simplify([path_a, path_b], default_config, tolerance=1.0, image_shape=(200, 200))
    second = simplify([path_a, path_b], default_config, tolerance=1.0, image_shape=(200, 200))

    assert first.data == second.data


def test_blank_image_yields_no_contours() -> None:
    """A fully white image produces an empty contour list and a warning."""
    blank = np.full((100, 100, 3), 255, dtype=np.uint8)
    preprocessed = preprocess(blank)
    edge_map = edges(preprocessed.data)
    result = contours(edge_map.data)

    assert result.data == []
    assert any(warning.code == "no_contours_found" for warning in result.warnings)


def test_blank_image_orchestrator_returns_empty_coordinates(
    default_config: ScaraConfig,
) -> None:
    """A fully white image produces empty coordinates and a no-contours warning."""
    blank = np.full((100, 100, 3), 255, dtype=np.uint8)
    output = PipelineOrchestrator().run(blank, default_config)

    assert output.coordinates == []
    assert any("No contours" in warning.message for warning in output.warnings)


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


def test_edges_graceful_when_opencv_missing(synthetic_image: NDArray) -> None:
    """edges returns a warning instead of crashing when OpenCV is unavailable."""
    real_cv2 = sys.modules.get("cv2")
    sys.modules["cv2"] = None  # type: ignore[assignment]

    try:
        result = edges(synthetic_image)
    finally:
        if real_cv2 is not None:
            sys.modules["cv2"] = real_cv2
        else:
            sys.modules.pop("cv2", None)

    assert isinstance(result, StageResult)
    assert any(warning.code == "opencv_missing" for warning in result.warnings)
    assert isinstance(result.data, np.ndarray)


def test_contours_graceful_when_opencv_missing() -> None:
    """contours returns a warning instead of crashing when OpenCV is unavailable."""
    real_cv2 = sys.modules.get("cv2")
    sys.modules["cv2"] = None  # type: ignore[assignment]

    try:
        result = contours(np.zeros((10, 10), dtype=np.uint8))
    finally:
        if real_cv2 is not None:
            sys.modules["cv2"] = real_cv2
        else:
            sys.modules.pop("cv2", None)

    assert isinstance(result, StageResult)
    assert any(warning.code == "opencv_missing" for warning in result.warnings)
    assert result.data == []


def test_simplify_graceful_when_opencv_missing(default_config: ScaraConfig) -> None:
    """simplify returns a warning instead of crashing when OpenCV is unavailable."""
    real_cv2 = sys.modules.get("cv2")
    sys.modules["cv2"] = None  # type: ignore[assignment]

    try:
        result = simplify([[(0.0, 0.0)]], default_config, image_shape=(100, 100))
    finally:
        if real_cv2 is not None:
            sys.modules["cv2"] = real_cv2
        else:
            sys.modules.pop("cv2", None)

    assert isinstance(result, StageResult)
    assert any(warning.code == "opencv_missing" for warning in result.warnings)
    assert result.data == []
