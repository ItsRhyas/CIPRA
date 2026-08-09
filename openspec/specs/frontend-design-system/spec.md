# Spec: frontend-design-system

## Purpose

The visual identity foundation for CIPRA: the `ci-*` token system, three-font type stack, graph-paper grid utilities, layout shell, and cross-cutting accessibility rules that define CIPRA's cool-slate engineering aesthetic and govern every component rendered in the app.

## Requirements

### Requirement: Design Tokens

The system MUST define a `ci-*` semantic color palette in `tailwind.config.ts` covering `bg`, `surface`, `text`, `muted`, `accent`, `accent-hover`, `accent-subtle`, `rule`, `rule-strong`, `danger`, `danger-bg`, `warning`, and `warning-bg`. The palette SHALL avoid warm earth tones, near-black, and broadsheet defaults. Each token MUST be used at least once; orphaned tokens SHOULD be removed.

#### Scenario: token coverage

- GIVEN the redesign is merged
- WHEN auditing token usage
- THEN every defined `ci-*` token appears in at least one component or utility
- AND no token is defined but unused

### Requirement: Typography System

The system MUST provide three font families via `next/font/google` exposed as CSS variables `--font-display` (DM Serif Display), `--font-body` (Inter), and `--font-mono` (JetBrains Mono). The body MUST default to `font-body`; `font-display` SHALL be reserved for the `h1`; `font-mono` SHALL be used only for the G-Code `<pre>` block. The type scale MUST include `text-2xs` and `tracking-precise`.

#### Scenario: font roles

- GIVEN the layout renders
- WHEN inspecting the application
- THEN body text uses `font-body`
- AND the h1 uses `font-display`
- AND the G-Code pre block uses `font-mono`

### Requirement: Grid Utility

The system MUST provide a `.bg-grid` utility rendering a 24px coordinate grid. The grid MUST be a visible identity element (opacity 6–8%) evoking engineering graph paper. A `.bg-grid-subtle` variant MAY exist at lower opacity for non-signature surfaces.

#### Scenario: signature legibility

- GIVEN `.bg-grid` is applied to the app background
- WHEN viewing the interface
- THEN the grid is visible without competing with content
- AND the grid pattern reads as graph paper at 24px spacing

### Requirement: Focus Management

The system MUST provide a `.focus-ring` utility and a base `:focus-visible` rule that apply a unified focus ring across all interactive elements. Focus styling SHALL NOT rely on outline removal without replacement.

#### Scenario: keyboard focus visible

- GIVEN any interactive control is focused via keyboard
- WHEN `:focus-visible` matches
- THEN a consistent focus ring renders
- AND mouse-click focus does not show the ring

### Requirement: Accessibility Foundations

The system MUST honor `prefers-reduced-motion` globally. The system MUST provide an `sr-only` utility for screen-reader-only content.

#### Scenario: reduced motion

- GIVEN the user's OS preference is reduced motion
- WHEN the app renders animated transitions
- THEN animations are suppressed or neutralized

### Requirement: Cross-Browser Range Input Styling

Range inputs MUST be styled consistently across WebKit andMozilla via a consolidated `@layer components` rule using both `::-webkit-slider-thumb` and `::-moz-range-thumb` pseudo-elements.

#### Scenario: consistent thumb appearance

- GIVEN the app is opened in Chrome and Firefox
- WHEN rendering a range input
- THEN the slider thumb appears with the same token-derived styling in both browsers

### Requirement: Layout Shell

The application MUST render a single-column flow constrained to `max-w-3xl`. The footer (Convert/Reset bar) MUST be sticky to the viewport. The body MUST scroll between a top header band and the sticky footer.

#### Scenario: sticky footer

- GIVEN the parameter list is longer than the viewport
- WHEN the user scrolls down
- THEN the Convert/Reset bar remains pinned to the bottom of the viewport
- AND the header scrolls away

### Requirement: UI Language

All user-facing UI copy (labels, tooltips, empty states, error messages, button text) MUST be in the user's selected locale, defaulting to English. User-facing string values MUST be sourced from the i18n dictionaries via the `useT()` hook rather than hardcoded literals.

(Previously: UI copy was required to be in English only.)

#### Scenario: no Spanish residue

- GIVEN any component renders and the selected locale is `en`
- WHEN auditing copy
- THEN no Spanish strings remain in user-facing surfaces
- AND no hardcoded English literals remain either

#### Scenario: selected locale applies

- GIVEN the user selects the `es` locale via the `LanguageSwitcher`
- WHEN any component renders user-facing copy
- THEN the Spanish translations from the `es` dictionary are returned by `t()`
- AND the UI renders in Spanish without code changes

#### Scenario: EN default for first-time visitors

- GIVEN a first-time visitor with no `localStorage['cipra-lang']` value
- WHEN the app renders
- THEN all user-facing copy is in English via `t()` lookups against the `en` dictionary

### Requirement: Tab Pattern Accessibility

The tab strip (Preview / Paths / G-Code) MUST implement the WAI-ARIA tab pattern. Each tab button MUST have a unique `id` and `aria-controls` linking to its panel. Each tab MUST have its own `role="tabpanel"` element with matching `aria-labelledby`. Keyboard navigation MUST support ArrowLeft, ArrowRight, Home, and End. The active tab MUST have `tabIndex={0}`; inactive tabs MUST have `tabIndex={-1}`. On keyboard activation, focus MUST move to the newly selected tab.

#### Scenario: keyboard navigation wired

- GIVEN the tab strip is focused on the first tab
- WHEN the user presses ArrowRight
- THEN focus and selection move to the second tab
- AND the corresponding panel is shown

#### Scenario: home and end

- GIVEN the tab strip is focused
- WHEN the user presses Home (or End)
- THEN the first (or last) tab is activated and focused

#### Scenario: aria association

- GIVEN a screen reader inspects the tablist
- WHEN it reads an active tab
- THEN it announces the tab's name, role, selected state, and controls relationship to the panel
- AND the paired panel is labelled by that tab

#### Scenario: roving tabindex

- GIVEN multiple tabs are rendered
- WHEN tabbing through the page
- THEN only the active tab is in the tab order (tabIndex 0)
- AND inactive tabs are skipped (tabIndex -1)

#### Scenario: collision-safe ids

- GIVEN the page could be mounted more than once
- WHEN ids are generated
- THEN they use `useId()` (React 18+) so two instances do not collide

### Requirement: ImageDropzone Keyboard Activation

The `ImageDropzone` MUST respond to Enter and Space keyboard events by triggering the file picker. The control MUST be operable without a mouse.

#### Scenario: enter opens file dialog

- GIVEN ImageDropzone is focused via keyboard
- WHEN the user presses Enter
- THEN the native file picker opens

#### Scenario: space opens file dialog

- GIVEN ImageDropzone is focused via keyboard
- WHEN the user presses Space
- THEN the native file picker opens

### Requirement: Invalid Work Area Dimension Warning

`GCodeViewer` MUST emit a `console.warn` when work area dimensions are invalid (NaN, zero, or negative) before falling back to A4 defaults. The fallback is defensive; the warn is the signal that an upstream contract was violated.

#### Scenario: warn on invalid dimensions

- GIVEN GCodeViewer receives `workAreaW = 0`
- WHEN the component validates dimensions
- THEN it emits a `console.warn` describing the invalid input
- AND falls back to A4 defaults
- AND does not crash

### Requirement: Work Area Dimension Memoization

`GCodeViewer` dimension calculations (effective width/height, aspect ratio, canvas dimensions) MUST be memoized via `useMemo` so they are not recomputed on every render unless their inputs change.

#### Scenario: stable on unchanged props

- GIVEN GCodeViewer is rendered with fixed props
- WHEN the parent re-renders for unrelated reasons
- THEN the dimension object identity is stable across renders

### Requirement: Centralized Grid Spacing Variable

The 24px grid spacing MUST be defined once as a CSS custom property (`--grid-cell`) and shared between the `.bg-grid` utility and the `GCodeViewer` canvas grid. The two MUST NOT duplicate the literal `24` independently.

#### Scenario: single source of truth

- GIVEN a maintainer wants to change grid spacing
- WHEN they update `--grid-cell`
- THEN both the CSS grid utility and the canvas grid reflect the new value
- AND no second hardcoded `24` needs updating

### Requirement: EmptyState Component

The duplicated empty-state markup across `CanvasPreview` and `GCodeOutput` MUST be extracted into a shared `EmptyState` component. Only the copy varies; the shell (`flex h-64 rounded-lg border border-ci-rule bg-ci-bg/60`) MUST be identical.

#### Scenario: consistent empty state

- GIVEN CanvasPreview has no image loaded
- AND GCodeOutput has no output generated
- WHEN both render their empty state
- THEN both use the `EmptyState` component with identical styling
- AND only the descriptive copy differs

### Requirement: Y-Axis Flip Documentation

`GCodeViewer` MUST retain a comment explaining that the Y axis is flipped so G-Code coordinates (origin bottom-left) map to canvas coordinates (origin top-left), because this behavior is non-obvious.

#### Scenario: non-obvious behavior documented

- GIVEN a maintainer reads GCodeViewer
- WHEN they encounter the Y-axis flip
- THEN a comment explains the coordinate-space rationale