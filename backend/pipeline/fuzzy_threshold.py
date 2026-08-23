"""Fuzzy logic system for automatic Canny threshold selection.

Implements the classic Mamdani inference pipeline taught in the course:

1. Fuzzification -- crisp inputs (contrast, edge density) are converted to
   membership degrees using triangular (``trimf``) and trapezoidal (``trapmf``)
   membership functions (MATLAB-style naming).
2. Rule evaluation -- the SI-ENTONCES (if-then) rule base is evaluated using
   the minimum operator as the AND connective.
3. Aggregation -- the consequents of every fired rule are merged with the
   maximum operator into a single output fuzzy set.
4. Defuzzification -- the crisp output threshold is the centroid of the
   aggregated membership sampled over the 0-255 universe.

Pure NumPy + stdlib only: scikit-fuzzy is incompatible with the installed
numpy 2.5.1, so the membership functions are hand-rolled.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

import numpy as np
from numpy.typing import NDArray

#: Gradient magnitude (arbitrary intensity units) above which a pixel counts
#: as an edge when computing ``edge_density``.
EDGE_GRADIENT_THRESHOLD = 25.0


def _unit_ratio(numerator: NDArray, denominator: float) -> NDArray:
    """Return ``numerator / denominator``, handling degenerate zero denominators.

    A zero denominator means the fuzzy set has a vertical edge at that vertex
    (for example ``trapmf(x, 0, 0, 10, 25)``). The membership jumps from 0 to
    1 at that point, so a non-negative numerator maps to 1 and a negative one
    maps to 0.
    """
    numerator = np.asarray(numerator, dtype=float)
    if denominator == 0.0:
        return np.where(numerator < 0.0, 0.0, 1.0)
    return numerator / denominator


def trimf(x: float | NDArray, a: float, b: float, c: float) -> NDArray:
    """Triangular membership function.

    ``mu(x)`` rises linearly from 0 at ``a`` to 1 at ``b``, then falls
    linearly back to 0 at ``c``:

    - ``0`` if ``x <= a``
    - ``(x - a) / (b - a)`` if ``a <= x <= b``
    - ``(c - x) / (c - b)`` if ``b <= x <= c``
    - ``0`` if ``x >= c``

    Args:
        x: Input value or array of values.
        a: Left vertex.
        b: Peak vertex.
        c: Right vertex.

    Returns:
        Membership degrees in the range [0, 1], matching the shape of ``x``.
    """
    x = np.asarray(x, dtype=float)
    rise = _unit_ratio(x - a, b - a)
    fall = _unit_ratio(c - x, c - b)
    return np.clip(np.minimum(rise, fall), 0.0, 1.0)


def trapmf(x: float | NDArray, a: float, b: float, c: float, d: float) -> NDArray:
    """Trapezoidal membership function.

    ``mu(x)`` rises linearly from 0 at ``a`` to 1 at ``b``, stays at 1 across
    the plateau ``b..c``, and falls linearly back to 0 at ``d``:

    - ``0`` if ``x <= a``
    - ``(x - a) / (b - a)`` if ``a <= x <= b``
    - ``1`` if ``b <= x <= c``
    - ``(d - x) / (d - c)`` if ``c <= x <= d``
    - ``0`` if ``x >= d``

    Args:
        x: Input value or array of values.
        a: Left foot.
        b: Left shoulder.
        c: Right shoulder.
        d: Right foot.

    Returns:
        Membership degrees in the range [0, 1], matching the shape of ``x``.
    """
    x = np.asarray(x, dtype=float)
    rise = _unit_ratio(x - a, b - a)
    fall = _unit_ratio(d - x, d - c)
    return np.clip(np.minimum(np.minimum(rise, 1.0), fall), 0.0, 1.0)


MembershipFunction = Callable[..., NDArray]
"""Signature of a membership function: ``fn(x, *params) -> NDArray``."""


def compute_image_stats(image_gray: NDArray) -> dict[str, float]:
    """Compute the linguistic input variables for a grayscale image.

    Pure NumPy only -- no OpenCV. Contrast is the pixel standard deviation
    normalized to 0-100 (``std / 255 * 100``). Edge density is the percentage
    of pixels whose gradient magnitude (the Euclidean norm of ``np.gradient``)
    exceeds ``EDGE_GRADIENT_THRESHOLD``.

    Args:
        image_gray: 2D grayscale image ``(H, W)``. A 3-channel image is
            reduced to grayscale via the channel mean as a graceful fallback.

    Returns:
        ``{"contrast": float, "edge_density": float}`` with both values in 0-100.
    """
    image = np.asarray(image_gray, dtype=np.float64)
    if image.ndim == 3:
        image = image.mean(axis=2)

    contrast = float(np.std(image)) / 255.0 * 100.0

    gradient_y, gradient_x = np.gradient(image)
    magnitude = np.hypot(gradient_x, gradient_y)
    edge_density = float(np.mean(magnitude > EDGE_GRADIENT_THRESHOLD)) * 100.0

    return {"contrast": contrast, "edge_density": edge_density}


@dataclass(frozen=True)
class FuzzyRule:
    """A single SI-ENTONCES (if-then) rule of the Mamdani rule base."""

    rule_id: str
    antecedents: tuple[tuple[str, str], ...]
    consequent: str
    text: str


@dataclass
class FuzzyThresholdResult:
    """Result of the fuzzy auto-threshold computation."""

    threshold: int
    diagnostics: dict


def _rule(rule_id: str, contrast_term: str, edge_term: str, threshold_term: str) -> FuzzyRule:
    """Build a rule together with its human-readable description."""
    antecedents = (("contrast", contrast_term), ("edge_density", edge_term))
    text = (
        f"IF contrast is {contrast_term.title()} "
        f"AND edge_density is {edge_term.title()} "
        f"THEN threshold is {threshold_term.title()}"
    )
    return FuzzyRule(rule_id, antecedents, threshold_term, text)


class FuzzyController:
    """Mamdani fuzzy inference engine mapping image stats to a Canny threshold.

    Two linguistic inputs (``contrast`` and ``edge_density``) drive a single
    linguistic output (``threshold``) through a 9-rule SI-ENTONCES rule base.
    The four inference stages are exposed as separate methods so each one can
    be demonstrated independently in class.
    """

    OUTPUT_UNIVERSE = np.arange(0, 256, dtype=float)

    def __init__(self) -> None:
        self.inputs: dict[str, dict[str, tuple[MembershipFunction, tuple[float, ...]]]] = {
            "contrast": {
                "bajo": (trapmf, (0.0, 0.0, 10.0, 25.0)),
                "medio": (trimf, (15.0, 35.0, 55.0)),
                "alto": (trapmf, (45.0, 70.0, 100.0, 100.0)),
            },
            "edge_density": {
                "baja": (trapmf, (0.0, 0.0, 5.0, 15.0)),
                "media": (trimf, (10.0, 25.0, 40.0)),
                "alta": (trapmf, (30.0, 55.0, 100.0, 100.0)),
            },
        }
        self.outputs: dict[str, dict[str, tuple[MembershipFunction, tuple[float, ...]]]] = {
            "threshold": {
                "bajo": (trapmf, (0.0, 0.0, 30.0, 60.0)),
                "medio": (trimf, (45.0, 80.0, 115.0)),
                "alto": (trapmf, (90.0, 140.0, 255.0, 255.0)),
            }
        }
        self.rules = (
            _rule("R1", "bajo", "baja", "bajo"),
            _rule("R2", "bajo", "media", "bajo"),
            _rule("R3", "bajo", "alta", "medio"),
            _rule("R4", "medio", "baja", "medio"),
            _rule("R5", "medio", "media", "medio"),
            _rule("R6", "medio", "alta", "alto"),
            _rule("R7", "alto", "baja", "medio"),
            _rule("R8", "alto", "media", "alto"),
            _rule("R9", "alto", "alta", "alto"),
        )

    def fuzzify(self, contrast: float, edge_density: float) -> dict[str, dict[str, float]]:
        """Stage 1 -- fuzzification: crisp inputs become membership degrees."""
        return {
            "contrast": {
                term: float(fn(contrast, *params))
                for term, (fn, params) in self.inputs["contrast"].items()
            },
            "edge_density": {
                term: float(fn(edge_density, *params))
                for term, (fn, params) in self.inputs["edge_density"].items()
            },
        }

    def evaluate_rules(self, memberships: dict[str, dict[str, float]]) -> list[dict[str, Any]]:
        """Stage 2 -- rule evaluation: AND (min) of the antecedent memberships.

        Returns only the rules whose activation is strictly positive, i.e. the
        rules that actually fire for the given inputs.
        """
        fired: list[dict[str, Any]] = []
        for rule in self.rules:
            activation = float(
                min(memberships[input_name][term] for input_name, term in rule.antecedents)
            )
            if activation > 0.0:
                fired.append(
                    {
                        "rule": rule.rule_id,
                        "text": rule.text,
                        "activation": activation,
                        "consequent": rule.consequent,
                    }
                )
        return fired

    def aggregate(self, fired_rules: list[dict[str, Any]]) -> NDArray:
        """Stage 3 -- aggregation: max-merge the consequent fuzzy sets.

        Each fired rule contributes ``min(activation, consequent_set)`` to the
        aggregated output set over the 0-255 universe; overlapping contributes
        are combined with the maximum operator.
        """
        aggregated = np.zeros_like(self.OUTPUT_UNIVERSE)
        for fired_rule in fired_rules:
            membership_fn, params = self.outputs["threshold"][fired_rule["consequent"]]
            consequent_set = membership_fn(self.OUTPUT_UNIVERSE, *params)
            aggregated = np.maximum(
                aggregated, np.minimum(fired_rule["activation"], consequent_set)
            )
        return aggregated

    def defuzzify(self, aggregated: NDArray) -> float:
        """Stage 4 -- defuzzification: centroid of the aggregated membership.

        Returns ``sum(x * mu(x)) / sum(mu(x))`` over the sampled universe.
        """
        total = float(np.sum(aggregated))
        if total <= 0.0:
            return 0.0
        return float(np.sum(self.OUTPUT_UNIVERSE * aggregated) / total)

    def infer(self, contrast: float, edge_density: float) -> tuple[int, dict[str, Any]]:
        """Run the full Mamdani inference pipeline for the given crisp inputs.

        Args:
            contrast: Contrast input in 0-100.
            edge_density: Edge density input in 0-100.

        Returns:
            A tuple of the crisp threshold (rounded and clipped to 0-255) and
            the full diagnostics dict exposed through ``PipelineOutput.fuzzy_meta``.
        """
        memberships = self.fuzzify(contrast, edge_density)
        fired_rules = self.evaluate_rules(memberships)
        aggregated = self.aggregate(fired_rules)
        defuzzified = self.defuzzify(aggregated)
        threshold = int(np.clip(round(defuzzified), 0, 255))
        diagnostics: dict[str, Any] = {
            "inputs": {"contrast": float(contrast), "edge_density": float(edge_density)},
            "memberships": memberships,
            "fired_rules": [
                {key: value for key, value in fired_rule.items() if key != "consequent"}
                for fired_rule in fired_rules
            ],
            "defuzzified": defuzzified,
            "threshold": threshold,
        }
        return threshold, diagnostics


def fuzzy_auto_threshold(image_gray: NDArray) -> FuzzyThresholdResult:
    """Automatically select a Canny threshold with the fuzzy controller.

    Args:
        image_gray: Input grayscale image ``(H, W)``.

    Returns:
        A ``FuzzyThresholdResult`` carrying the crisp threshold and the full
        diagnostics (fuzzified inputs, fired rules, defuzzified centroid).
    """
    stats = compute_image_stats(image_gray)
    threshold, diagnostics = FuzzyController().infer(
        stats["contrast"], stats["edge_density"]
    )
    return FuzzyThresholdResult(threshold=threshold, diagnostics=diagnostics)
