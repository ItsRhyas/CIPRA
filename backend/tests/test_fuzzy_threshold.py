"""Tests for the fuzzy threshold system (trimf/trapmf, Mamdani, centroid)."""

from __future__ import annotations

import sys
from typing import TYPE_CHECKING

import numpy as np
import pytest

from gcode.config import MachineConfig
from pipeline.fuzzy_threshold import (
    EDGE_GRADIENT_THRESHOLD,
    FuzzyController,
    compute_image_stats,
    fuzzy_auto_threshold,
    trapmf,
    trimf,
)
from pipeline.orchestrator import PipelineOrchestrator
from pipeline.types import ConvertParams, PipelineOutput

if TYPE_CHECKING:
    from numpy.typing import NDArray


@pytest.fixture
def default_config() -> MachineConfig:
    """Return the default machine configuration."""
    return MachineConfig()


def test_trimf_vertices_and_edges() -> None:
    """trimf is 0 at the feet, 1 at the peak, linear in between."""
    x = np.array([-1.0, 0.0, 5.0, 10.0, 15.0, 20.0, 21.0])
    assert trimf(x, 0.0, 10.0, 20.0) == pytest.approx([0.0, 0.0, 0.5, 1.0, 0.5, 0.0, 0.0])


def test_trimf_accepts_scalar() -> None:
    """trimf works with a scalar input."""
    assert trimf(5.0, 0.0, 10.0, 20.0) == pytest.approx(0.5)


def test_trapmf_plateau_and_edges() -> None:
    """trapmf holds 1 across the plateau and falls off at both feet."""
    x = np.array([-1.0, 0.0, 2.5, 5.0, 10.0, 12.5, 15.0, 16.0])
    assert trapmf(x, 0.0, 5.0, 10.0, 15.0) == pytest.approx(
        [0.0, 0.0, 0.5, 1.0, 1.0, 0.5, 0.0, 0.0]
    )


def test_trapmf_vertical_left_edge() -> None:
    """A zero-width left foot (a == b) jumps straight to the plateau."""
    x = np.array([-1.0, 0.0, 5.0, 10.0, 20.0, 25.0])
    assert trapmf(x, 0.0, 0.0, 10.0, 25.0) == pytest.approx(
        [0.0, 1.0, 1.0, 1.0, 1.0 / 3.0, 0.0]
    )


def test_trapmf_vertical_right_edge() -> None:
    """A zero-width right foot (c == d) holds the plateau to the right edge."""
    x = np.array([100.0, 140.0, 200.0, 255.0])
    assert trapmf(x, 90.0, 140.0, 255.0, 255.0) == pytest.approx([0.2, 1.0, 1.0, 1.0])


def test_compute_image_stats_blank_image() -> None:
    """A flat image has zero contrast and zero edge density."""
    blank = np.full((50, 50), 255, dtype=np.uint8)
    stats = compute_image_stats(blank)

    assert stats["contrast"] == pytest.approx(0.0)
    assert stats["edge_density"] == pytest.approx(0.0)


def test_compute_image_stats_high_contrast_boundary() -> None:
    """A black/white split shows contrast ~50 and a sharp gradient spike."""
    image = np.zeros((50, 50), dtype=np.uint8)
    image[:, 25:] = 255
    stats = compute_image_stats(image)

    assert stats["contrast"] == pytest.approx(50.0)
    assert stats["edge_density"] == pytest.approx(200.0 / 50.0)


def test_compute_image_stats_edge_density_threshold() -> None:
    """Gradient magnitudes below the threshold do not count as edges."""
    image = np.zeros((50, 50), dtype=np.uint8)
    image[:, 25:] = 255

    gradient_y, gradient_x = np.gradient(image.astype(np.float64))
    magnitude = np.hypot(gradient_x, gradient_y)
    assert magnitude.max() > EDGE_GRADIENT_THRESHOLD


def test_compute_image_stats_rgb_fallback() -> None:
    """A 3-channel image is reduced to grayscale via the channel mean."""
    rgb = np.full((20, 20, 3), 255, dtype=np.uint8)
    stats = compute_image_stats(rgb)

    assert stats["contrast"] == pytest.approx(0.0)
    assert stats["edge_density"] == pytest.approx(0.0)


def test_fuzzify_known_values() -> None:
    """Fuzzification of (20, 20) hits known membership degrees."""
    memberships = FuzzyController().fuzzify(20.0, 20.0)

    assert memberships["contrast"]["bajo"] == pytest.approx(1.0 / 3.0)
    assert memberships["contrast"]["medio"] == pytest.approx(0.25)
    assert memberships["contrast"]["alto"] == pytest.approx(0.0)

    assert memberships["edge_density"]["baja"] == pytest.approx(0.0)
    assert memberships["edge_density"]["media"] == pytest.approx(2.0 / 3.0)
    assert memberships["edge_density"]["alta"] == pytest.approx(0.0)


def test_rule_activation_is_min_of_antecedents() -> None:
    """R1 activation equals the AND (min) of its two antecedent memberships."""
    controller = FuzzyController()
    memberships = controller.fuzzify(5.0, 5.0)
    fired = controller.evaluate_rules(memberships)

    assert len(fired) == 1
    r1 = fired[0]
    assert r1["rule"] == "R1"
    assert r1["text"] == (
        "IF contrast is Bajo AND edge_density is Baja THEN threshold is Bajo"
    )
    expected = min(
        memberships["contrast"]["bajo"], memberships["edge_density"]["baja"]
    )
    assert r1["activation"] == pytest.approx(expected)
    assert r1["activation"] == pytest.approx(1.0)


def test_multiple_rules_fire_with_partial_activation() -> None:
    """Rules with overlapping antecedents fire simultaneously."""
    controller = FuzzyController()
    memberships = controller.fuzzify(20.0, 20.0)
    fired = {r["rule"]: r["activation"] for r in controller.evaluate_rules(memberships)}

    assert set(fired) == {"R2", "R5"}
    assert fired["R2"] == pytest.approx(1.0 / 3.0)
    assert fired["R5"] == pytest.approx(0.25)


def test_centroid_defuzzification_in_range() -> None:
    """The defuzzified centroid stays inside the 0-255 output universe."""
    controller = FuzzyController()
    threshold, diagnostics = controller.infer(20.0, 20.0)

    assert 0.0 <= diagnostics["defuzzified"] <= 255.0
    assert 0 <= threshold <= 255
    assert diagnostics["threshold"] == threshold


def test_fuzzy_auto_threshold_deterministic_and_in_range(synthetic_image: NDArray) -> None:
    """The public entry point is deterministic and returns sane values."""
    first = fuzzy_auto_threshold(synthetic_image)
    second = fuzzy_auto_threshold(synthetic_image)

    assert first.threshold == second.threshold
    assert 0 <= first.threshold <= 255
    assert 0.0 <= first.diagnostics["defuzzified"] <= 255.0


def test_fuzzy_auto_threshold_diagnostics_keys(synthetic_image: NDArray) -> None:
    """Diagnostics carry inputs, memberships, fired rules and threshold."""
    diagnostics = fuzzy_auto_threshold(synthetic_image).diagnostics

    assert set(diagnostics) == {
        "inputs",
        "memberships",
        "fired_rules",
        "defuzzified",
        "threshold",
    }
    assert set(diagnostics["inputs"]) == {"contrast", "edge_density"}
    assert set(diagnostics["memberships"]["contrast"]) == {"bajo", "medio", "alto"}
    assert set(diagnostics["memberships"]["edge_density"]) == {"baja", "media", "alta"}
    assert len(diagnostics["fired_rules"]) > 0
    for fired in diagnostics["fired_rules"]:
        assert set(fired) == {"rule", "text", "activation"}
        assert fired["activation"] > 0.0
    assert diagnostics["threshold"] == fuzzy_auto_threshold(synthetic_image).threshold


def test_blank_white_image_yields_low_threshold() -> None:
    """No content means low contrast and a low fuzzy threshold."""
    blank = np.full((100, 100), 255, dtype=np.uint8)
    result = fuzzy_auto_threshold(blank)

    assert 0 <= result.threshold < 40


def test_low_contrast_yields_lower_threshold_than_high_contrast() -> None:
    """Monotonic sanity: more content implies a higher Canny threshold."""
    low = np.full((100, 100), 128, dtype=np.uint8)
    high = np.zeros((100, 100), dtype=np.uint8)
    high[10:90, 10:90] = 255

    low_threshold = fuzzy_auto_threshold(low).threshold
    high_threshold = fuzzy_auto_threshold(high).threshold

    assert low_threshold < high_threshold


def test_orchestrator_auto_threshold_runs_fuzzy_stage(
    synthetic_image: NDArray,
    default_config: MachineConfig,
) -> None:
    """auto_threshold=True runs the fuzzy stage and keeps full coordinates."""
    orchestrator = PipelineOrchestrator()
    output = orchestrator.run(
        synthetic_image,
        default_config,
        ConvertParams(variant="balanced", simplify_tolerance=2.0, auto_threshold=True),
    )

    assert isinstance(output, PipelineOutput)
    assert output.stages_run == ["preprocess", "fuzzy", "edges", "contours", "simplify"]
    assert output.fuzzy_meta is not None
    assert set(output.fuzzy_meta["inputs"]) == {"contrast", "edge_density"}
    assert 0 <= output.fuzzy_meta["threshold"] <= 255
    assert len(output.coordinates) > 0


def test_orchestrator_without_auto_threshold_keeps_legacy_behavior(
    synthetic_image: NDArray,
    default_config: MachineConfig,
) -> None:
    """auto_threshold=False preserves the exact legacy pipeline behavior."""
    orchestrator = PipelineOrchestrator()
    output = orchestrator.run(
        synthetic_image,
        default_config,
        ConvertParams(variant="balanced", simplify_tolerance=2.0),
    )

    assert output.stages_run == ["preprocess", "edges", "contours", "simplify"]
    assert output.fuzzy_meta is None
    assert len(output.coordinates) > 0


def test_orchestrator_auto_threshold_graceful_when_opencv_missing(
    synthetic_image: NDArray,
    default_config: MachineConfig,
) -> None:
    """auto_threshold=True still runs the fuzzy stage when OpenCV is missing."""
    real_cv2 = sys.modules.get("cv2")
    sys.modules["cv2"] = None  # type: ignore[assignment]

    try:
        output = PipelineOrchestrator().run(
            synthetic_image,
            default_config,
            ConvertParams(auto_threshold=True),
        )
    finally:
        if real_cv2 is not None:
            sys.modules["cv2"] = real_cv2
        else:
            sys.modules.pop("cv2", None)

    assert isinstance(output, PipelineOutput)
    assert "fuzzy" in output.stages_run
    assert output.fuzzy_meta is not None


def test_serializer_accepts_auto_threshold() -> None:
    """auto_threshold is parsed as a boolean and passed into ConvertParams."""
    import json

    from django.core.files.uploadedfile import SimpleUploadedFile

    from jobs.serializers import ConvertRequestSerializer

    serializer = ConvertRequestSerializer(
        data={
            "image": SimpleUploadedFile("img.png", b"x", content_type="image/png"),
            "params": json.dumps({"auto_threshold": True}),
        }
    )
    assert serializer.is_valid()
    assert serializer.validated_data["params"].auto_threshold is True


@pytest.mark.parametrize("bad_value", ["true", 1, None])
def test_serializer_rejects_non_boolean_auto_threshold(bad_value: object) -> None:
    """auto_threshold must be a real boolean."""
    import json

    from django.core.files.uploadedfile import SimpleUploadedFile

    from jobs.serializers import ConvertRequestSerializer

    serializer = ConvertRequestSerializer(
        data={
            "image": SimpleUploadedFile("img.png", b"x", content_type="image/png"),
            "params": json.dumps({"auto_threshold": bad_value}),
        }
    )
    assert not serializer.is_valid()
    assert "auto_threshold" in str(serializer.errors)
