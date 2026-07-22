# Delta Specs: improve-gcode-output

Concatenated delta specs across three domains. No existing main specs live under
`openspec/specs/`; these deltas describe the change relative to current code
behavior and seed the future main specs at archive time.

## Domain: gcode-path-structure

### ADDED Requirements

### Requirement: Per-Path Boundary Preservation

The system MUST preserve per-contour boundaries from the simplify stage output through G-Code formatting. The `PipelineOutput.coordinates` type MUST be `list[list[tuple[float, float]]]`, and no stage between simplify and `format_gcode` MUST flatten the structure.

#### Scenario: Multiple disconnected contours

- GIVEN the simplify stage produces two disconnected ordered contours
- WHEN the orchestrator extracts coordinates and the formatter renders G-Code
- THEN the output contains two `G0`/`M3`/`G1`…/`M5` blocks, one per contour
- AND no `G1` move connects the end of one contour to the start of the next

#### Scenario: Empty contours

- GIVEN simplify returns no paths
- WHEN `format_gcode` receives an empty path list
- THEN the output is `G21 G90\nM5\n` with a "No paths" warning

#### Scenario: Golden fixture regression

- GIVEN the existing `multi_path.gcode` golden fixture
- WHEN `test_format_gcode_multiple_paths` runs against a nested two-contour input produced end-to-end by the pipeline
- THEN the rendered output matches the fixture byte-for-byte

## Domain: pipeline-params

### ADDED Requirements

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

### MODIFIED Requirements

### Requirement: ConvertParams Defaults

The default `simplify_tolerance` MUST be 1.0 in `types.py`, the serializer, and the API contract — a single reconciled value across all layers.

(Previously: `types.py` used 2.0 while the serializer and API contract used 1.0, producing divergent behavior depending on entry point.)

#### Scenario: default tolerance from API

- GIVEN a client omits `simplify_tolerance`
- WHEN `ConvertParams` is constructed via the serializer
- THEN `simplify_tolerance` is 1.0

#### Scenario: default tolerance from orchestrator

- GIVEN `ConvertParams()` is constructed directly with no arguments
- THEN `simplify_tolerance` is 1.0

### REMOVED Requirements

### Requirement: tool_offset_mm

(Reason: No consumer in the pipeline or formatter reads `tool_offset_mm`; it is dead configuration.)
(Migration: Reintroduce when the robotics team defines offset-aware kinematics. Until then, `ScaraConfig`, the serializer, and `api-contract.json` MUST NOT declare the field.)

### Requirement: origin

(Reason: Only `"bottom-left"` is implemented and no branch consumes the value; it is dead configuration.)
(Migration: Reintroduce when multi-origin support is required. Until then, `ScaraConfig`, the serializer, and `api-contract.json` MUST NOT declare the field.)

## Domain: parameter-tooltips

### ADDED Requirements

### Requirement: Parameter Descriptions

The frontend `ParameterPanel` MUST show a brief description per parameter, surfaced as a hover tooltip or subtle adjacent helper text, sourced from `api-contract.json`.

#### Scenario: tooltip on hover

- GIVEN the `ParameterPanel` is rendered
- WHEN the user hovers on the "scale" label
- THEN a tooltip appears explaining that increasing `scale` enlarges output coordinates

#### Scenario: non-distracting

- GIVEN the `ParameterPanel` is rendered
- WHEN no parameter label is hovered
- THEN no description overlaps or obscures the input controls

### Requirement: Description Content

Each parameter description MUST explain how varying the parameter affects the result, not merely restate the field name.

#### Scenario: threshold description

- GIVEN the description for `threshold`
- THEN it states that lower values detect more edges (denser paths) and higher values detect fewer

#### Scenario: simplify_tolerance description

- GIVEN the description for `simplify_tolerance`
- THEN it states that higher values simplify contours more aggressively (fewer points)