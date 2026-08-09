# Delta Spec: parameter-tooltips

## ADDED Requirements

### Requirement: Paired Slider + Number Input

Each numeric parameter exposed by `ParameterPanel` MUST render a paired `<input type="number">` beside its slider. Both inputs MUST be bidirectionally bound to the same state and MUST stay in sync in real time. The number input MUST respect the same `min`, `max`, and `step` as its slider.

#### Scenario: editing slider updates number input

- GIVEN the parameter panel is rendered for the `scale` parameter
- WHEN the user drags the slider to 1.5
- THEN the paired number input shows 1.5

#### Scenario: editing number input updates slider

- GIVEN the `scale` slider shows 1.0
- WHEN the user types 2.5 in the paired number input
- THEN the slider thumb moves to 2.5
- AND the bound state is set to 2.5

#### Scenario: number input enforces bounds and step

- GIVEN the `threshold` parameter has `min=0`, `max=255`, `step=1`
- WHEN the user types 300 in the number input
- THEN the value is clamped to 255 before being committed to state

### Requirement: Per-Parameter Reset Control

Each parameter row MUST expose a dedicated per-parameter reset control (↺ icon or "reset" text label) that restores only that parameter to its default value, leaving all other parameters unchanged.

#### Scenario: per-parameter reset restores only one parameter

- GIVEN the user has changed `scale` to 2.0 and `threshold` to 50
- WHEN the user clicks the per-parameter reset control for `scale`
- THEN `scale` returns to its default
- AND `threshold` remains at 50

#### Scenario: per-parameter reset coexists with global reset

- GIVEN the parameter panel is rendered
- THEN both a per-parameter reset (per row) and a global "Reset defaults" button are present
- WHEN the user clicks the global reset
- THEN every parameter returns to its default

### Requirement: CSS Tooltip Component

`ParameterPanel` MUST surface each parameter description via a custom CSS tooltip component replacing the native HTML `title` attribute. The tooltip MUST be visible on both `:hover` and `:focus` for keyboard accessibility, MUST NOT depend on any external tooltip library (no Radix, Headless UI, or Popper.js), MUST be styled with Tailwind or inline CSS (subtle dark background, light text), and MUST position above or beside the label on desktop and adapt position on mobile to avoid off-screen clipping.

#### Scenario: tooltip visible on hover

- GIVEN the parameter panel is rendered
- WHEN the user hovers on the `scale` parameter label
- THEN the CSS tooltip appears with the description text

#### Scenario: tooltip visible on keyboard focus

- GIVEN the user tabs to the `scale` parameter label
- WHEN the label receives focus
- THEN the CSS tooltip appears
- AND it remains visible while focus is held

#### Scenario: no external tooltip dependency

- WHEN the frontend dependency manifest is inspected
- THEN no tooltip library (Radix Tooltip, Headless UI, Popper.js, Floating UI) is required

#### Scenario: tooltip text in Spanish

- GIVEN the description for `threshold`
- THEN the tooltip text is rendered in Spanish and explains how varying the parameter affects the result

## MODIFIED Requirements

### Requirement: Parameter Descriptions

The frontend `ParameterPanel` MUST show a brief description per parameter surfaced via the CSS Tooltip Component (defined above) on `:hover` and `:focus`, sourced from `api-contract.json`. The native HTML `title` attribute MUST NOT be used.

(Previously: descriptions were surfaced via a hover tooltip or subtle adjacent helper text without specifying the tooltip mechanism.)

#### Scenario: tooltip on hover

- GIVEN the `ParameterPanel` is rendered
- WHEN the user hovers on the "scale" label
- THEN the CSS tooltip appears explaining that increasing `scale` enlarges output coordinates

#### Scenario: tooltip on focus

- GIVEN the `ParameterPanel` is rendered
- WHEN the user focuses the "scale" label via keyboard
- THEN the CSS tooltip appears with the same content as on hover

#### Scenario: non-distracting

- GIVEN the `ParameterPanel` is rendered
- WHEN no parameter label is hovered or focused
- THEN no tooltip overlaps or obscures the input controls

## REMOVED Requirements

### Requirement: Description Content

(Reason: The behavior is preserved and folded into the CSS Tooltip Component requirement, where tooltip text in Spanish is specified per parameter. The standalone requirement is no longer needed.)
(Migration: Existing description content for `threshold` and `simplify_tolerance` MUST be retained verbatim and delivered via the new CSS tooltip text.)