"""Tests for the vision pipeline stages and orchestrator."""

from __future__ import annotations

import sys
from typing import TYPE_CHECKING

import numpy as np
import pytest

from gcode.config import ScaraConfig
from pipeline.contours import contours
from pipeline.edges import edges
from pipeline.orchestrator import PipelineOrchestrator, _extract_coordinates
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
    """simplify returns a StageResult whose data is a list of coordinate paths."""
    result = simplify([[(0.0, 0.0), (10.0, 10.0)]], default_config, image_shape=(100, 100))

    assert isinstance(result, StageResult)
    assert isinstance(result.data, list)
    assert all(isinstance(path, list) for path in result.data)
    assert all(
        isinstance(point, tuple) and len(point) == 2
        for path in result.data
        for point in path
    )
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
    assert all(isinstance(path, list) for path in output.coordinates)
    assert all(
        isinstance(coord, tuple) and len(coord) == 2
        for path in output.coordinates
        for coord in path
    )


def test_orchestrator_emits_no_stub_warnings(
    synthetic_image: NDArray,
    default_config: ScaraConfig,
) -> None:
    """The orchestrator no longer emits stub warnings for real stages."""
    orchestrator = PipelineOrchestrator()
    output = orchestrator.run(synthetic_image, default_config)

    messages = [warning.message for warning in output.warnings]
    assert not any("not yet implemented" in message for message in messages)


def test_extract_coordinates_preserves_nested_paths() -> None:
    """_extract_coordinates keeps the path structure produced by simplify."""
    nested = [[(0.0, 0.0), (10.0, 10.0)], [(20.0, 20.0), (30.0, 30.0), (40.0, 40.0)]]
    result = _extract_coordinates(nested)

    assert result == nested


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

    first_path = result.data[0]
    assert len(first_path) < len(dense_line)
    assert len(first_path) <= 4


def test_px_to_mm_scaling(default_config: ScaraConfig) -> None:
    """Pixel coordinates scale linearly to the configured work area."""
    result = simplify(
        [[(100.0, 100.0)]], default_config, tolerance=2.0, image_shape=(200, 200)
    )

    assert len(result.data) == 1
    x_mm, y_mm = result.data[0][0]
    assert x_mm == pytest.approx(105.0)
    assert y_mm == pytest.approx(148.5)


def test_y_flip_uses_bottom_left_origin(default_config: ScaraConfig) -> None:
    """The Y axis is flipped and the image is centered in the work area."""
    top_left = simplify([[(0.0, 0.0)]], default_config, tolerance=2.0, image_shape=(200, 200))
    bottom_left = simplify(
        [[(0.0, 200.0)]], default_config, tolerance=2.0, image_shape=(200, 200)
    )

    # 200x200 on A4: fit = 1.05, draw_h_mm = 210, offset_y_mm = 43.5
    assert top_left.data[0][0] == pytest.approx((0.0, 253.5))
    assert bottom_left.data[0][0] == pytest.approx((0.0, 43.5))


def test_simplify_preserves_aspect_ratio(default_config: ScaraConfig) -> None:
    """Non-square images are uniformly scaled and centered in the work area."""
    # Portrait 100x200 on A4 portrait: width is the constraining dimension,
    # producing side letterbox (offset_x_mm > 0).
    path = [(0.0, 0.0), (100.0, 0.0), (100.0, 200.0), (0.0, 200.0)]
    result = simplify([path], default_config, tolerance=0.0, image_shape=(200, 100))

    mm_path = result.data[0]
    xs = [x for x, _ in mm_path]
    ys = [y for _, y in mm_path]
    mm_width = max(xs) - min(xs)
    mm_height = max(ys) - min(ys)

    assert mm_width / mm_height == pytest.approx(100 / 200)
    assert min(xs) > 0.0


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


def test_edges_uses_provided_threshold() -> None:
    """edges passes the supplied threshold to cv2.Canny."""
    image = np.zeros((20, 20), dtype=np.uint8)
    image[5:15, 5:15] = 255

    captured_calls: list[tuple[int, int]] = []
    real_canny = None
    try:
        import cv2

        real_canny = cv2.Canny

        def fake_canny(img, low, high, *args, **kwargs):
            captured_calls.append((low, high))
            return real_canny(img, low, high, *args, **kwargs)

        cv2.Canny = fake_canny
        edges(image, threshold=75)
    finally:
        if real_canny is not None:
            cv2.Canny = real_canny

    assert captured_calls == [(75, 150)]


def test_simplify_scale_doubles_output_coordinates(
    default_config: ScaraConfig,
) -> None:
    """Scale multiplies millimeter coordinates."""
    base = simplify(
        [[(100.0, 100.0)]], default_config, image_shape=(200, 200), scale=1.0
    )
    scaled = simplify(
        [[(100.0, 100.0)]], default_config, image_shape=(200, 200), scale=2.0
    )

    base_x, base_y = base.data[0][0]
    scaled_x, scaled_y = scaled.data[0][0]
    assert scaled_x == pytest.approx(base_x * 2.0)
    assert scaled_y == pytest.approx(base_y * 2.0)


def test_orchestrator_wires_scale(
    synthetic_image: NDArray,
    default_config: ScaraConfig,
) -> None:
    """The orchestrator passes scale into the pipeline."""
    orchestrator = PipelineOrchestrator()
    default_output = orchestrator.run(synthetic_image, default_config)
    scaled_output = orchestrator.run(
        synthetic_image,
        default_config,
        ConvertParams(scale=2.0),
    )

    assert len(default_output.coordinates) == len(scaled_output.coordinates)
    for default_path, scaled_path in zip(
        default_output.coordinates, scaled_output.coordinates
    ):
        for (base_x, base_y), (scaled_x, scaled_y) in zip(default_path, scaled_path):
            assert scaled_x == pytest.approx(base_x * 2.0)
            assert scaled_y == pytest.approx(base_y * 2.0)


def test_orchestrator_wires_threshold(
    synthetic_image: NDArray,
    default_config: ScaraConfig,
) -> None:
    """The orchestrator passes threshold into the edges stage."""
    orchestrator = PipelineOrchestrator()
    default_output = orchestrator.run(synthetic_image, default_config)
    tuned_output = orchestrator.run(
        synthetic_image,
        default_config,
        ConvertParams(threshold=1),
    )

    assert len(tuned_output.coordinates) >= len(default_output.coordinates)


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


def _asymmetric_image() -> NDArray:
    """Return a non-square image that is not symmetric under rotation."""
    image = np.zeros((20, 10, 3), dtype=np.uint8)
    image[:5, :5] = 255
    return image


def test_preprocess_default_rotation_and_invert_unchanged() -> None:
    """Default rotation_deg=0 and invert=False keeps the previous behavior."""
    image = _asymmetric_image()
    assert np.array_equal(
        preprocess(image).data,
        preprocess(image, rotation_deg=0, invert=False).data,
    )


@pytest.mark.parametrize("rotation_deg", [90, 180, 270])
def test_preprocess_rotation_changes_output(rotation_deg: int) -> None:
    """Each non-default rotation changes the preprocessed output."""
    image = _asymmetric_image()
    default = preprocess(image)
    rotated = preprocess(image, rotation_deg=rotation_deg)

    assert not np.array_equal(default.data, rotated.data)
    if rotation_deg in {90, 270}:
        assert rotated.data.shape != default.data.shape


def test_preprocess_invalid_rotation_raises() -> None:
    """An unsupported rotation value raises ValueError."""
    with pytest.raises(ValueError, match="rotation_deg must be one of"):
        preprocess(_asymmetric_image(), rotation_deg=45)


def test_preprocess_invert_negates_pixels() -> None:
    """invert=True flips every pixel value in the blurred grayscale output."""
    image = np.full((15, 15, 3), 128, dtype=np.uint8)
    image[:5, :5] = 50

    default = preprocess(image, variant="fast")
    inverted = preprocess(image, variant="fast", invert=True)

    assert np.array_equal(inverted.data, 255 - default.data)


def test_preprocess_rotation_and_invert_combo() -> None:
    """Rotation and invert can be combined; invert still negates pixel values."""
    image = np.full((15, 15, 3), 128, dtype=np.uint8)
    image[:5, :5] = 50

    rotated = preprocess(image, rotation_deg=90, variant="fast")
    rotated_inverted = preprocess(image, rotation_deg=90, invert=True, variant="fast")

    assert np.array_equal(rotated_inverted.data, 255 - rotated.data)
