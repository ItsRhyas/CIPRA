# image-type-presets Specification

## Purpose

Provide one-click parameter presets for common image types so users get sensible defaults without manually tuning individual sliders.

## Requirements

### Requirement: Image Type Selector

The system MUST provide an image type selector at the top of ParameterPanel with options: Photo, Line Art, Sketch, Text.

- GIVEN ParameterPanel is rendered
- WHEN the user views the top of the panel
- THEN the image type selector shows Photo, Line Art, Sketch, and Text options

### Requirement: Preset Parameter Values

Selecting a preset MUST set threshold, simplify_tolerance, variant, and scale to the following values.

| Preset | threshold | simplify_tolerance | variant | scale |
|--------|-----------|--------------------|---------|-------|
| Photo | 100 | 2.0 | balanced | 1.0 |
| Line Art | 180 | 0.5 | fast | 1.0 |
| Sketch | 150 | 1.0 | balanced | 1.0 |
| Text | 200 | 0.3 | fast | 1.0 |

- GIVEN the image type selector shows "Photo"
- WHEN the user selects "Photo"
- THEN threshold=100, simplify_tolerance=2.0, variant=balanced, scale=1.0

#### Scenario: manual param edit switches to Custom

- GIVEN a preset (e.g. Photo) is selected
- WHEN the user manually changes any of threshold, simplify_tolerance, variant, or scale
- THEN the image type selector switches to a "Custom" sentinel value

#### Scenario: reselecting same preset resets params

- GIVEN the user has manually tweaked parameters away from a preset
- WHEN the user reselects that same preset from the selector
- THEN all four parameters reset to that preset's defined values