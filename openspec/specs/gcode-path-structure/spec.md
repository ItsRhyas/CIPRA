# Spec: gcode-path-structure

## Requirements

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
