# Delta for frontend-design-system

## MODIFIED Requirements

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