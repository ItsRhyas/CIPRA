# Spec: parameter-tooltips

## Requirements

### Requirement: Parameter Descriptions

The frontend `ParameterPanel` MUST show a brief description per parameter, surfaced as a hover tooltip or subtle adjacent helper text, sourced from `api-contract.json`. The tooltip MUST render using `ci-*` tokens (`ci-text` background on a dark tooltip surface) and English copy. Tooltip positioning MUST use `mb-1.5` and `leading-none` for tight, legible placement.

#### Scenario: tooltip on hover

- GIVEN the `ParameterPanel` is rendered
- WHEN the user hovers on the "scale" label
- THEN a tooltip appears explaining that increasing `scale` enlarges output coordinates
- AND the tooltip uses `ci-*` token-derived colors

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

### Requirement: ParameterPanel Visual Restyling

The `ParameterPanel` MUST be restyled using the `ci-*` design tokens. Backgrounds, borders, labels, and inputs SHALL use semantic tokens (`ci-bg`, `ci-surface`, `ci-text`, `ci-muted`, `ci-rule`, `ci-accent`, `ci-accent-subtle`) rather than raw Tailwind defaults. Numeric readouts MUST use `tabular-nums`; labels and captions MUST use `tracking-precise`.

#### Scenario: token migration

- GIVEN the redesigned ParameterPanel renders
- WHEN inspecting its classes
- THEN colors derive from `ci-*` tokens
- AND no raw `bg-white` or default `gray-*` utilities remain
- AND numeric values render with `tabular-nums`

### Requirement: PillButton Component

The image-type presets in `ParameterPanel` MUST be rendered by an extracted `PillButton` component. `PillButton` MUST accept a label, selected state, and selection handler. It SHALL remain file-scoped (not promoted to a shared module).

#### Scenario: preset selection

- GIVEN ParameterPanel renders the image type presets
- WHEN the user clicks a preset pill
- THEN the pill signals selection via `ci-accent` styling
- AND only one pill is selected at a time

### Requirement: SectionLabel Component

Parameter sections in `ParameterPanel` MUST be headed by an extracted `SectionLabel` component rendering an uppercase eyebrow (`text-2xs uppercase tracking-wider`) with `ci-muted` text. It SHALL remain file-scoped.

#### Scenario: section heading

- GIVEN ParameterPanel renders multiple parameter sections
- WHEN each section renders
- THEN it is preceded by a SectionLabel eyebrow in uppercase muted text

### Requirement: NumericParamRow Restyling

The already-extracted `NumericParamRow` MUST be visually refreshed to use `ci-*` tokens for its label, input, and reset affordance, consistent with the restyled panel.

#### Scenario: row token consistency

- GIVEN a NumericParamRow renders within the panel
- WHEN inspecting its styling
- THEN its tokens match the surrounding ParameterPanel tokens

### Requirement: Real-Time Toggle Restyling and Positioning

The real-time generation toggle MUST be restyled to the smaller, tighter geometry (`h-5 w-9`) and visually integrated with the panel. The toggle's live state MUST surface a `Live` indicator. The real-time toggle SHOULD be positioned so it is discoverable rather than buried at the bottom of a long panel; promoting it to the sticky footer or a higher position is RECOMMENDED.

#### Scenario: live indicator

- GIVEN the real-time toggle is enabled
- WHEN the bottom sticky bar renders
- THEN a `Live` indicator is shown signaling active real-time mode

#### Scenario: discoverable position

- GIVEN the ParameterPanel is long
- WHEN the user looks for the real-time control
- THEN the toggle is not hidden as the last item in the panel

### Requirement: Work Area Preset Display

The work area preset MUST be displayed as a derived value computed from `work_area_w_mm` and `work_area_h_mm` via `useMemo` (or inline derivation). The preset MUST NOT be mirrored through a `useEffect` + `useState` pair. Selecting a preset MUST apply the preset's dimensions via `onChange`; a non-matching W/H pair MUST display `Custom`.

#### Scenario: custom detection

- GIVEN the user enters W=200 and H=200 (no preset match)
- WHEN the preset select renders
- THEN it displays `Custom`

#### Scenario: preset application

- GIVEN the user selects the A4 preset
- WHEN the select onChange fires
- THEN `work_area_w_mm` and `work_area_h_mm` update to the A4 values

### Requirement: English Copy Throughout ParameterPanel

All labels, tooltips, section headings, empty copy, and button text within `ParameterPanel` MUST be in English. Decorative glyphs (`✓`, `✗`, `↺`) MUST be replaced with plain text equivalents.

#### Scenario: plain text affordances

- GIVEN ParameterPanel renders reset controls
- WHEN the user reads them
- THEN they read "Reset" (text), not decorative glyphs

### Requirement: Toggle Translate Values on Spacing Scale

The `Toggle` component MUST derive its enabled/disabled translate values from the Tailwind spacing scale or a CSS custom property. The translate MUST NOT use arbitrary off-scale pixel literals (`translate-x-[18px]` / `translate-x-[3px]`).

#### Scenario: no magic pixels

- GIVEN the Toggle component is inspected
- WHEN the enabled and disabled translates are examined
- THEN the values reference spacing-scale tokens or a CSS variable
- AND no arbitrary pixel literals appear in the translate classes
