# Delta for pipeline-params

## ADDED Requirements

### Requirement: Rotation and Inversion Preprocessing Stage

The system MUST apply image rotation via `cv2.rotate` and color inversion via `cv2.bitwise_not` as a preprocessing stage that runs BEFORE the existing blur/threshold steps. Rotation MUST be applied first (physical transform), then inversion (color transform).

`rotation_deg` MUST accept only the values 0, 90, 180, or 270. `invert` MUST be a boolean.

#### Scenario: rotate 90 degrees

- GIVEN `params.rotation_deg = 90` and `invert = False`
- WHEN preprocess runs
- THEN the input image is rotated 90 degrees before blur/threshold
- AND `cv2.bitwise_not` is NOT applied

#### Scenario: invert colors

- GIVEN `params.rotation_deg = 0` and `invert = True`
- WHEN preprocess runs
- THEN no rotation is applied
- AND the image colors are inverted via `cv2.bitwise_not`

#### Scenario: rotate 180 and invert

- GIVEN `params.rotation_deg = 180` and `invert = True`
- WHEN preprocess runs
- THEN the image is first rotated 180 degrees
- AND then its colors are inverted

#### Scenario: invalid rotation value rejected

- GIVEN a client submits `rotation_deg = 45`
- WHEN the API validates the request
- THEN the server responds with HTTP 400

#### Scenario: defaults apply no transform

- GIVEN `rotation_deg = 0` and `invert = False`
- WHEN preprocess runs
- THEN the image is neither rotated nor inverted, preserving existing behavior

### Requirement: Rotation and Invert Serializer Parsing

The serializer MUST parse `rotation_deg` and `invert` from the params JSON, defaulting to 0 and False respectively when absent.

- GIVEN the params JSON omits both fields
- WHEN `ConvertParams` is constructed via the serializer
- THEN `rotation_deg = 0` and `invert = False`

### Requirement: API Contract Documentation

`api-contract.json` MUST document both `rotation_deg` (int, enum 0/90/180/270, default 0) and `invert` (bool, default false) fields.

### Requirement: Frontend Rotation and Invert Controls

The frontend MUST expose rotation buttons labeled 0° (none), 90° (right), 180° (flip), 270° (left) and an invert toggle that reflects its state via an inverted-preview icon or label.

- GIVEN the ParameterPanel is rendered
- WHEN the user clicks the "90° (right)" rotation button
- THEN `rotation_deg` is set to 90 in the request params

#### Scenario: invert toggle reflects state

- GIVEN the invert toggle is OFF
- WHEN the user enables the invert toggle
- THEN the toggle shows an inverted-preview indicator
- AND `invert = True` is set in the request params

## MODIFIED Requirements

### Requirement: ConvertParams Defaults

The default `simplify_tolerance` MUST be 1.0 in `types.py`, the serializer, and the API contract — a single reconciled value across all layers. `rotation_deg` MUST default to 0 and `invert` MUST default to False in `types.py`, the serializer, and the API contract.

(Previously: only `simplify_tolerance=1.0` was reconciled; rotation/invert fields did not exist)

#### Scenario: default tolerance from API

- GIVEN a client omits `simplify_tolerance`
- WHEN `ConvertParams` is constructed via the serializer
- THEN `simplify_tolerance` is 1.0

#### Scenario: default tolerance from orchestrator

- GIVEN `ConvertParams()` is constructed directly with no arguments
- THEN `simplify_tolerance` is 1.0

#### Scenario: default rotation and invert from API

- GIVEN a client omits `rotation_deg` and `invert`
- WHEN `ConvertParams` is constructed via the serializer
- THEN `rotation_deg` is 0 and `invert` is False