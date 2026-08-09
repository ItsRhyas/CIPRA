# work-area-config Specification

## Purpose

Expose SCARA work area dimensions to the user through presets and custom width/height inputs, and forward those values in the API request.

## Requirements

### Requirement: Work Area Presets

The system MUST provide a preset selector with the following options; selecting a preset MUST populate the width (W) and height (H) inputs accordingly.

| Preset | W (mm) | H (mm) |
|--------|--------|--------|
| A4 portrait | 210 | 297 |
| A4 landscape | 297 | 210 |
| A3 | 297 | 420 |
| Letter | 216 | 279 |
| Custom | user-defined | user-defined |

- GIVEN the Work Area section is visible in ParameterPanel
- WHEN the user selects the "A4 portrait" preset
- THEN W is set to 210 and H is set to 297

#### Scenario: manual edit switches to Custom

- GIVEN a non-Custom preset is selected
- WHEN the user edits W or H manually
- THEN the preset selector switches to "Custom"

### Requirement: Work Area Validation

The system MUST require W and H to be positive numbers greater than zero.

- GIVEN the user is editing W or H
- WHEN the user enters a value of 0 or a negative number
- THEN a validation error is shown and the value is not accepted

### Requirement: Work Area Values Sent to API

The system MUST include the configured W, H, travel_speed, and draw_speed in the `scara` object of the conversion API request.

- GIVEN the user has configured W=210, H=297
- WHEN a conversion request is sent
- THEN the request body's `scara` object contains `work_area: {w: 210, h: 297}`

#### Scenario: speed defaults null

- GIVEN the user leaves travel_speed and draw_speed unset
- WHEN the `scara` object is built
- THEN travel_speed and draw_speed are null and no F-codes are emitted

### Requirement: Frontend DEFAULTS Scara Block

The frontend `DEFAULTS` object MUST include a `scara` block initialized with A4 portrait defaults and null speed values.

- GIVEN the application initializes
- WHEN `DEFAULTS` is read
- THEN it contains a `scara` block with work_area W=210, H=297 and null speeds