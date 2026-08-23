# Spec: fuzzy-auto-threshold

## Purpose

Mamdani fuzzy controller selecting the Canny low threshold from contrast and edge density (Unit V — Fuzzy Logic).

## Requirements

### Requirement: Membership Functions and Linguistic Variables

The system MUST provide `trimf` and `trapmf` (clipped to [0,1]; zero-width vertices yield 1.0 for non-negative input). Inputs on 0-100, output on 0-255, with these exact parameters:

| Variable | Label | Type | Params |
|----------|-------|------|--------|
| contrast | bajo | trapmf | 0,0,10,25 |
| contrast | medio | trimf | 15,35,55 |
| contrast | alto | trapmf | 45,70,100,100 |
| edge_density | baja | trapmf | 0,0,5,15 |
| edge_density | media | trimf | 10,25,40 |
| edge_density | alta | trapmf | 30,55,100,100 |
| threshold | bajo | trapmf | 0,0,30,60 |
| threshold | medio | trimf | 45,80,115 |
| threshold | alto | trapmf | 90,140,255,255 |

#### Scenario: trimf vertices

- GIVEN `trimf(x, 0, 10, 20)` and x in {0, 10, 20}
- THEN mu = {0, 1, 0}

#### Scenario: fuzzify known inputs

- GIVEN `fuzzify(20, 20)`
- THEN contrast.bajo=1/3, medio=0.25; edge_density.media=2/3

### Requirement: SI-ENTONCES Rule Base

Nine SI-ENTONCES rules over the full 3x3 grid (AND = min):

| Rule | contrast | edge_density | threshold |
|------|----------|--------------|-----------|
| R1 | bajo | baja | bajo |
| R2 | bajo | media | bajo |
| R3 | bajo | alta | medio |
| R4 | medio | baja | medio |
| R5 | medio | media | medio |
| R6 | medio | alta | alto |
| R7 | alto | baja | medio |
| R8 | alto | media | alto |
| R9 | alto | alta | alto |

#### Scenario: single rule full activation

- GIVEN contrast=5, edge_density=5
- THEN only R1 fires, activation 1.0

#### Scenario: partial multi-rule firing

- GIVEN contrast=20, edge_density=20
- THEN only R2 (1/3) and R5 (0.25) fire

### Requirement: Mamdani Inference and Diagnostics

Four stages: `fuzzify`, `evaluate_rules` (activation = min of antecedents; only > 0), `aggregate` (max of min(activation, consequent_set) over 0-255), `defuzzify` (centroid, else 0.0 at zero mass). The threshold MUST round and clip the centroid to [0,255]. Diagnostics MUST carry exactly `inputs` {contrast, edge_density}, `memberships`, `fired_rules` (each `{rule, text, activation}` > 0; no `consequent`), `defuzzified`, and `threshold`.

#### Scenario: centroid and threshold in range

- GIVEN `infer(20, 20)`
- THEN defuzzified and threshold in [0,255]

#### Scenario: diagnostics keys

- GIVEN `fuzzy_auto_threshold(synthetic_image).diagnostics`
- THEN keys = {inputs, memberships, fired_rules, defuzzified, threshold}
- AND each fired_rule = {rule, text, activation} > 0

### Requirement: Image Statistics

`compute_image_stats` MUST return `{contrast, edge_density}` in 0-100: contrast = `std(image)/255*100`; edge_density = share of pixels whose gradient magnitude exceeds `EDGE_GRADIENT_THRESHOLD` (25.0). 3-channel input MUST be reduced via the channel mean.

#### Scenario: blank and RGB fallback

- GIVEN flat 50x50 (val 255) and flat (20,20,3) images
- THEN blank yields contrast=0, edge_density=0
- AND 3-channel is reduced via the channel mean

### Requirement: Determinism, Degenerate Images, and OpenCV Independence

`fuzzy_auto_threshold` MUST be deterministic (same image, same threshold) and OpenCV-independent. With OpenCV missing, the fuzzy stage MUST still run on the preprocess output (RGB fallback) and emit a valid `fuzzy_meta`. A blank image MUST yield threshold < 40; a low-contrast image MUST yield a strictly lower threshold than a high-contrast one.

#### Scenario: deterministic repeat

- GIVEN synthetic image
- WHEN `fuzzy_auto_threshold` is called twice
- THEN both thresholds are equal, in [0,255]

#### Scenario: blank image low threshold

- GIVEN a 100x100 uniform 255 image
- THEN threshold is in [0, 40)

#### Scenario: monotonic contrast

- GIVEN a uniform low-contrast image and a high-contrast image
- THEN low-contrast < high-contrast threshold

#### Scenario: OpenCV missing

- GIVEN `cv2` is unavailable and `auto_threshold=True`
- WHEN the orchestrator runs
- THEN "fuzzy" is in stages_run and fuzzy_meta is not None
