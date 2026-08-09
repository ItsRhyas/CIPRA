# Spec: frontend-i18n

## Purpose

Client-side internationalization for CIPRA: EN/ES locale switching via a React Context provider, a typed `useT` hook, flat dictionary maps, a two-pill `LanguageSwitcher`, `<html lang>` synchronization, and `localStorage` persistence — all with zero new runtime dependencies.

## Requirements

### Requirement: Locale Type and Dictionaries

The system MUST define `Locale = 'en' | 'es'` as the sole accepted locale union. The system MUST ship two flat dictionaries (`en.ts`, `es.ts`) typed as `Record<string, string>` covering every user-facing string in the app (~70 keys). Dictionary structure MUST be enforced by a shared `Dictionary` type so missing keys surface at compile time.

#### Scenario: full string coverage

- GIVEN all components are migrated
- WHEN auditing dictionary keys
- THEN every user-facing string resolves to a key present in both `en` and `es` dictionaries
- AND no hardcoded English string remains in rendered UI

#### Scenario: type-safe keys

- GIVEN a developer calls `t('some.key')`
- WHEN the key does not exist in the dictionary type
- THEN TypeScript reports a compile error

### Requirement: I18nProvider Context

The system MUST expose an `I18nProvider` (`'use client'` React Context) providing `{ locale, setLocale, t }`. The provider MUST wrap the application's children via a client wrapper mounted from `app/layout.tsx`. The provider MUST NOT introduce new runtime dependencies.

#### Scenario: context availability

- GIVEN the application renders
- WHEN a descendant component calls `useT()`
- THEN it receives the active `locale`, a `setLocale` function, and a `t` function
- AND no "provider missing" runtime error occurs

#### Scenario: server component boundary

- GIVEN `app/layout.tsx` is a Server Component
- WHEN the provider is injected
- THEN a dedicated client wrapper (`I18nProviderWrapper`) bridges the server boundary
- AND no `useState` runs in a Server Component

### Requirement: useT Hook and Interpolation

The system MUST provide a `useT()` hook returning `t(key, vars?)`. The `t` function MUST replace `{varName}` tokens in the resolved string with values from `vars`. Interpolation MUST be regex-based; the system MUST NOT add a template engine dependency.

#### Scenario: plain key lookup

- GIVEN the active locale is `en`
- WHEN `t('cta.convert')` is called
- THEN the English string for `cta.convert` is returned

#### Scenario: variable interpolation

- GIVEN the active locale is `en` and the dictionary entry is `"Drop {count} image(s)"`
- WHEN `t('dropzone.count', { count: 3 })` is called
- THEN the returned string is `"Drop 3 image(s)"`

#### Scenario: missing variable token

- GIVEN a dictionary entry contains `{foo}` and `vars` omits `foo`
- WHEN interpolation runs
- THEN the literal `{foo}` is preserved in the output
- AND no exception is thrown

### Requirement: Default Locale

The system MUST default to `en` for first-time visitors when no `localStorage` value exists.

#### Scenario: first visit

- GIVEN a user with no `localStorage['cipra-lang']` visits the app
- WHEN the provider initializes
- THEN `locale` resolves to `en`
- AND the UI renders in English

### Requirement: localStorage Persistence

The system MUST persist the selected locale under `localStorage` key `cipra-lang`. The selected locale MUST survive page reloads.

#### Scenario: persist on switch

- GIVEN the user clicks `ES`
- WHEN the provider applies the new locale
- THEN `localStorage['cipra-lang']` is set to `'es'`
- AND `locale` is `es`

#### Scenario: read on reload

- GIVEN `localStorage['cipra-lang'] === 'es'`
- WHEN the user reloads the page
- THEN the provider initializes with `locale === 'es'`
- AND the UI renders in Spanish without user interaction

#### Scenario: invalid stored value

- GIVEN `localStorage['cipra-lang']` is `'fr'` (or any non-`en`/`es` value)
- WHEN the provider initializes
- THEN `locale` falls back to `en`
- AND the invalid value is overwritten to `'en'`

### Requirement: html lang Synchronization

The system MUST set `document.documentElement.lang` to the active locale on mount and on every locale change. The server-side default `<html lang="en">` MUST remain so the initial server-render frame is valid.

#### Scenario: sync on mount

- GIVEN the persisted locale is `es`
- WHEN the provider mounts client-side
- THEN `document.documentElement.lang` becomes `'es'`

#### Scenario: intermediate frame

- GIVEN the user opens the app with a persisted `es` locale
- WHEN the initial server-render returns and before the provider mounts
- THEN the document reports `lang="en"` (server default)
- AND this single-frame flash is documented, expected behavior

#### Scenario: sync on switch

- GIVEN the active locale is `en`
- WHEN the user clicks `ES`
- THEN `document.documentElement.lang` updates to `'es'` within the same render cycle

### Requirement: LanguageSwitcher Component

The system MUST render a `LanguageSwitcher` as two-pill toggle (`EN` / `ES`) reusing `ci-*` design tokens. The switcher MUST be placed in the sticky footer bar. The active pill MUST be visually distinct from the inactive pill.

#### Scenario: two-pill layout

- GIVEN the footer renders
- WHEN the switcher mounts
- THEN exactly two controls (`EN`, `ES`) appear
- AND no other locales are listed

#### Scenario: active state styling

- GIVEN the active locale is `en`
- WHEN the switcher renders
- THEN the `EN` pill shows active styling distinct from the `ES` pill
- AND clicking `ES` activates the ES locale

#### Scenario: keyboard operable

- GIVEN a user tabs to the switcher
- WHEN focus lands on an inactive pill
- THEN pressing Enter or Space switches the locale

### Requirement: Fallback Behavior for Missing Keys

The `t` function MUST fall back to the literal key string when a key is missing from the active locale's dictionary. In development mode, the system MUST also emit a `console.warn` identifying the missing key and locale.

#### Scenario: missing key in active locale

- GIVEN the `es` dictionary lacks `foo.bar` but `en` has it
- WHEN locale is `es` and `t('foo.bar')` is called
- THEN the literal string `'foo.bar'` is returned
- AND a `console.warn` fires (dev mode only)

#### Scenario: missing key in all locales

- GIVEN neither dictionary defines `baz`
- WHEN `t('baz')` is called in any locale
- THEN the literal `'baz'` is returned
- AND a `console.warn` fires (dev mode only)
- AND the UI does not crash