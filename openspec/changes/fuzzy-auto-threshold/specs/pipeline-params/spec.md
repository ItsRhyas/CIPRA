# Delta for pipeline-params

## MODIFIED Requirements

### Requirement: Canny Threshold Wiring

The system MUST use `threshold` as the Canny low boundary, with `high = min(threshold * 2, 255)`. When `auto_threshold` is true, the system MUST ignore `params.threshold` and use the fuzzy controller's selected threshold instead.
(Previously: threshold was always used as the Canny low boundary with no override.)

#### Scenario: nominal threshold

- GIVEN `params.threshold = 100` and `auto_threshold` is false
- WHEN preprocess runs Canny edge detection
- THEN Canny low is 100 and high is 200

#### Scenario: high clip

- GIVEN `params.threshold = 200` and `auto_threshold` is false
- WHEN preprocess runs Canny
- THEN Canny high is clipped to 255, never 400

#### Scenario: threshold ignored when auto_threshold is true

- GIVEN `params.threshold = 127` and `auto_threshold = true`
- WHEN the pipeline runs
- THEN the Canny low threshold is the fuzzy controller's output, not 127

## ADDED Requirements

### Requirement: Auto-Threshold Parameter Validation

The system MUST accept `auto_threshold` as a boolean with default `false` in `ConvertParams`, the serializer, and the API contract. The serializer MUST reject non-boolean values (`"true"`, `1`, `None`, etc.) with a 400 status and a message containing `auto_threshold`.

#### Scenario: valid boolean accepted

- GIVEN a request with `params.auto_threshold = true`
- WHEN the serializer validates
- THEN `ConvertParams.auto_threshold` is True

#### Scenario: non-boolean rejected with 400

- GIVEN a request with `params.auto_threshold = "yes"`
- WHEN the serializer validates
- THEN validation fails with a 400 status and an error mentioning `auto_threshold`

### Requirement: Fuzzy Meta Propagation

`PipelineOutput.fuzzy_meta` MUST be an optional field (default `None`). The HTTP response MUST include `meta.fuzzy` only when `pipeline_output.fuzzy_meta is not None`. `stages_run` MUST include the literal `"fuzzy"` only when `auto_threshold` is true. When `auto_threshold` is false, the legacy `stages_run` (`["preprocess", "edges", "contours", "simplify"]`) and the absence of `meta.fuzzy` MUST be preserved.

#### Scenario: enabled returns fuzzy meta

- GIVEN a valid request with `auto_threshold = true`
- WHEN the convert endpoint responds
- THEN `meta.fuzzy` contains inputs, memberships, fired_rules, defuzzified, threshold
- AND "fuzzy" is in meta.stages_run
- AND the fuzzy threshold is in [0,255]

#### Scenario: disabled omits fuzzy meta

- GIVEN a default request (auto_threshold omitted)
- WHEN the convert endpoint responds
- THEN `meta.fuzzy` is absent
- AND meta.stages_run is exactly ["preprocess", "edges", "contours", "simplify"]

#### Scenario: orchestrator disabled path preserves legacy

- GIVEN `ConvertParams(auto_threshold=False)` (the default)
- WHEN the orchestrator runs
- THEN stages_run is ["preprocess", "edges", "contours", "simplify"] and fuzzy_meta is None

### Requirement: Auto-Threshold UI Toggle

The frontend MUST provide a switch labeled for automatic threshold in the parameters panel. When the switch is OFF (default), the threshold slider (range and number inputs) MUST be enabled and interactive. When the switch is ON, the threshold slider MUST be blocked (disabled, not draggable) and the request MUST send `auto_threshold: true`. When OFF, the request MUST send `auto_threshold: false` and the slider must be honored. The switch MUST respect the panel's global disabled state (e.g. while uploading). Applying an image-type preset MUST reset `auto_threshold` to false so the preset threshold takes effect predictably.

#### Scenario: switch off honors slider

- GIVEN the auto-threshold switch is OFF
- WHEN the user drags the threshold slider to 150
- THEN the request sends `auto_threshold: false` and `threshold: 150`
- AND the backend uses 150 as the Canny low threshold

#### Scenario: switch on blocks slider

- GIVEN the auto-threshold switch is ON
- WHEN the parameter panel renders
- THEN the threshold slider (range and number inputs) is disabled
- AND a request sends `auto_threshold: true`

#### Scenario: switch default is off

- GIVEN the app loads with default parameters
- WHEN the parameter panel renders
- THEN the auto-threshold switch is OFF and the threshold slider is enabled

#### Scenario: panel disabled during upload blocks switch

- GIVEN the panel is in a global disabled state (uploading)
- WHEN the user tries to toggle the auto-threshold switch
- THEN the switch does not change state

#### Scenario: preset resets auto threshold

- GIVEN the auto-threshold switch is ON
- WHEN the user applies an image-type preset (e.g. line_art)
- THEN `auto_threshold` resets to false and the preset's threshold takes effect
