# Spec: gcode-viewer

## Purpose

Behavior of the frontend `GCodeViewer` canvas that renders emitted G-code paths relative to the configured pen-planner work area. Ensures the viewer reflects the user's configured `work_area` rather than a hardcoded A4 sheet.

## Requirements

### Requirement: Dynamic Work Area Props

`GCodeViewer` MUST accept `workAreaW` and `workAreaH` props (in millimeters) and MUST use them to size the rendered canvas. When the props are not provided, the viewer MUST default to 210x297 mm (A4 portrait).

#### Scenario: default A4 when props omitted

- GIVEN `GCodeViewer` is rendered without `workAreaW` and `workAreaH`
- THEN the canvas is sized for a 210x297 mm work area

#### Scenario: custom work area reflected

- GIVEN `GCodeViewer` is rendered with `workAreaW=200` and `workAreaH=200`
- THEN the canvas aspect ratio matches a 200x200 mm square
- AND the rendered grid boundary corresponds to 200x200 mm, not 210x297 mm

#### Scenario: invalid prop falls back to default

- GIVEN `GCodeViewer` is rendered with `workAreaW=0` or `workAreaH=undefined`
- THEN the viewer falls back to the 210x297 mm default
- AND a warning is emitted to the developer console

### Requirement: Proportional Canvas Scaling

The canvas dimensions MUST scale proportionally from the work-area dimensions, preserving the work-area aspect ratio at any rendered size.

#### Scenario: square work area renders square canvas

- GIVEN `workAreaW=200` and `workAreaH=200`
- WHEN the viewer renders at a 500px wide container
- THEN the canvas height equals 500px (1:1 aspect ratio)

#### Scenario: A4 work area renders tall canvas

- GIVEN default 210x297 mm work area
- WHEN the viewer renders at a 420px wide container
- THEN the canvas height is approximately 594px (297/210 ratio)

### Requirement: Stroke Coordinate Mapping

Stroke coordinates MUST map correctly to the scaled canvas using the same `fit` and centering logic as the backend pipeline so that what the user sees matches the G-code output.

#### Scenario: stroke position maps within canvas bounds

- GIVEN a stroke at work-area coordinate (105, 148.5) on a 210x297 work area
- WHEN the viewer renders at any container size
- THEN the stroke appears at the horizontal and vertical center of the canvas

#### Scenario: stroke at origin appears at corner

- GIVEN a stroke at work-area coordinate (0, 0) with bottom-left origin
- WHEN the viewer renders
- THEN the stroke appears at the bottom-left corner of the rendered canvas

#### Scenario: out-of-bounds stroke still handled

- GIVEN a stroke whose X coordinate exceeds `workAreaW`
- THEN the viewer MUST NOT crash
- AND the stroke is clipped or rendered beyond the visible work-area boundary without corrupting other strokes