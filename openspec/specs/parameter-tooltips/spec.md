# Spec: parameter-tooltips

## Requirements

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
