# Spec: pipeline-params

## Requirements

### Requirement: Coordinate Scaling

The system MUST apply `scale` as a multiplier to output coordinates after pixel-to-millimeter conversion.

#### Scenario: scale doubles output

- GIVEN `params.scale = 2.0`
- WHEN the pipeline emits coordinates
- THEN every `(x, y)` is multiplied by 2.0 before formatting

### Requirement: Canny Threshold Wiring

The system MUST use `threshold` as the Canny low boundary, with `high = min(threshold * 2, 255)`.

#### Scenario: nominal threshold

- GIVEN `params.threshold = 100`
- WHEN preprocess runs Canny edge detection
- THEN Canny low is 100 and high is 200

#### Scenario: high clip

- GIVEN `params.threshold = 200`
- WHEN preprocess runs Canny
- THEN Canny high is clipped to 255, never 400

### Requirement: F-Code Emission

The system MUST emit `F` feed codes driven by `travel_speed` on every `G0` move and `draw_speed` on every `G1` move.

#### Scenario: speeds configured

- GIVEN `ScaraConfig.travel_speed = 3000` and `draw_speed = 1500`
- WHEN `format_gcode` renders paths
- THEN every `G0` line carries `F3000` and every `G1` line carries `F1500`

### Requirement: ConvertParams Defaults

The default `simplify_tolerance` MUST be 1.0 in `types.py`, the serializer, and the API contract — a single reconciled value across all layers.

#### Scenario: default tolerance from API

- GIVEN a client omits `simplify_tolerance`
- WHEN `ConvertParams` is constructed via the serializer
- THEN `simplify_tolerance` is 1.0

#### Scenario: default tolerance from orchestrator

- GIVEN `ConvertParams()` is constructed directly with no arguments
- THEN `simplify_tolerance` is 1.0
