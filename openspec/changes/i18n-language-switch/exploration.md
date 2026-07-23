# Exploration: i18n-language-switch

> **Phase**: sdd-explore (read-only investigation)
> **Change**: `i18n-language-switch`
> **Mode**: OpenSpec (artifact at `openspec/changes/i18n-language-switch/exploration.md`)

---

## Current State

CIPRA's frontend is a **single-page Next.js 14 App Router** application with a hand-built component library. There is **no internationalization layer** today: every user-facing string is a hardcoded English literal in JSX. The brand copy and one descriptive subtitle live in `app/layout.tsx`'s `metadata` and the inline `<header>` in `app/page.tsx` (`CIPRA`, `Pixel to path, precisely`). The `<html>` root has `lang="en"` baked in.

UI strings are scattered across **8 files** (12 if you count the `EmptyState` callers). The user wants a Spanish/English switch in the **sticky bottom bar**, alongside the existing `Reset` and `Convert` buttons (see `app/page.tsx` lines 245–275 — the `<footer>` block is the only candidate placement).

The frontend's dependency surface is intentionally minimal: `package.json` lists only `next`, `react`, `react-dom` at runtime. **No i18n library is installed.** The codebase's style is "no UI library, no state library" — every control is a hand-rolled component (`Toggle`, `Tooltip`, `PillButton`, `NumericParamRow` are all file-local). The design system spec (`openspec/specs/frontend-design-system/spec.md`, requirement "UI Language") currently states: *"All user-facing UI copy (labels, tooltips, empty states, error messages, button text) MUST be in English"* — a clause this change will need to **MODIFY** rather than delete.

`useConvert.ts` returns backend error messages verbatim, and `lib/api.ts` injects `Request failed with status ${response.status}` for non-JSON failures. These pass through the error block in `page.tsx` and are rendered raw. **Backend-driven strings are out of scope for client i18n** — only frontend-authored copy is translatable here.

The sticky footer markup is intentionally simple (two flex children, no nested layout system). A language switcher needs to coexist with the existing `Reset` + `Convert` button group without restructuring the bar.

### Catalog of hardcoded user-facing strings (per file)

#### `app/layout.tsx`
- `<html lang="en">` — root language attribute
- `metadata.title = 'CIPRA — Pixel to Path'`
- `metadata.description = 'Convert images into G-Code for your SCARA robotic arm.'`

#### `app/page.tsx`
- `CIPRA` (h1, brand)
- `Pixel to path, precisely` (tagline, p)
- `Real-time` (Toggle label)
- `Live` (live indicator)
- `Regenerates paths automatically when parameters change.` (description)
- `aria-label="Conversion views"` (tablist)
- `Generating&hellip;` (uploading indicator)
- `Reset` (footer button)
- `Converting&hellip;` / `Convert` (footer button, state-conditional)
- Tab labels: `Preview`, `Paths`, `G-Code`

#### `components/ParameterPanel.tsx`
- Work-area preset names: `A4 Portrait`, `A4 Landscape`, `A3`, `Letter`
- `Custom` (work-area fallback label, also default `workAreaPreset` value)
- Section label: `Image type`
- Numeric labels: `Scale`, `Threshold`, `Simplify tolerance`
- `Variant` (label)
- `Reset` button + `aria-label="Reset variant to default"` + `aria-label={`Reset ${label.toLowerCase()} to default`}` (composed)
- Tooltips: `Scales the final drawing size. 1.0 keeps the original size.`, `Edge detection sensitivity. Lower values capture more detail.`, `Controls path detail. Higher values produce smoother but less detailed lines.`, `Image preprocessing mode. "balanced" uses automatic threshold detection.`
- `Transform` (SectionLabel)
- Pill labels: `Flip H`, `Flip V`
- `Work area` (SectionLabel)
- `Show` / `Hide` (collapsible trigger)
- `Preset` (label)
- `W (mm)`, `H (mm)` (labels)
- `Travel speed (mm/min)`, `Draw speed (mm/min)` (labels)
- `Default` (placeholder)
- `Reset defaults` (button)
- Variant options: `Fast`, `Detailed`, `Balanced` (derived via `v.charAt(0).toUpperCase() + v.slice(1)`)

#### `components/ImageDropzone.tsx`
- Internal error codes: `unsupported type`, `file too large`
- `Uploading&hellip;` (disabled state)
- `Drop an image here, or click to browse` (CTA)
- `PNG, JPEG, or WebP &mdash; up to {MAX_SIZE_MB} MB` (hint)
- `Unsupported file type. Use PNG, JPEG, or WebP.`
- `File exceeds the {MAX_SIZE_MB} MB limit.`
- `{(file.size / 1024 / 1024).toFixed(2)} MB` (size readout)

#### `components/CanvasPreview.tsx`
- `Upload an image to preview` (EmptyState child)
- `aria-label="Image preview"`

#### `components/GCodeViewer.tsx`
- `Convert an image to see the toolpath` — **drawn on canvas via `ctx.fillText`** (line 117) — special case: must be passed in as a prop or via context
- `Some G-Code lines were not recognized and have been omitted.`
- `aria-label="G-Code toolpath visualization"`
- `A4` in `console.warn` messages (developer copy, not user-facing; should be left English or omitted from translations)

#### `components/GCodeOutput.tsx`
- `Copy`, `Copied`, `Copy failed` (state-conditional copy label)
- `Convert an image to generate G-Code` (EmptyState child)
- `Download .gcode` (button)
- `G-Code copied to clipboard` (sr-only, `aria-live`)
- `Failed to copy G-Code` (sr-only)
- `output.gcode` (download filename — keep as filename literal; not translated)

#### `components/WarningsList.tsx`
- `Warnings` (h3)

#### `hooks/useConvert.ts`
- `An unexpected error occurred` (fallback error string)

#### `lib/presets.ts`
- `IMAGE_TYPE_LABELS`: `Photo`, `Line Art`, `Sketch`, `Text`, `Custom`

#### Components with **no hardcoded user-facing text** (props-driven)
- `components/EmptyState.tsx` — pure pass-through
- `components/Toggle.tsx` — takes `label` prop
- `components/Tooltip.tsx` — takes `text` prop

### Sticky footer (placement site)

`app/page.tsx` lines 245–275:

```tsx
<footer className="sticky bottom-0 z-20 border-t border-ci-rule bg-white/95 backdrop-blur-sm">
  <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
    <div className="flex items-center gap-4">
      {isUploading && <p ...>Generating&hellip;</p>}
    </div>
    <div className="flex items-center gap-3">
      <button onClick={handleReset} ...>Reset</button>
      <button onClick={handleConvert} ...>{isUploading ? 'Converting&hellip;' : 'Convert'}</button>
    </div>
  </div>
</footer>
```

The left `<div>` already hosts the `isUploading` status indicator. The right group holds `Reset` + `Convert`. The switcher fits as **a third sibling in the right group**, before `Reset`, or as a new group on the far left. A two-segment pill (EN | ES) is the conventional pattern for two-locale apps and matches the muted-pill aesthetic of the `PillButton` component.

---

## Affected Areas

| File | Why it's affected | LoC Δ (est.) |
|------|-------------------|--------------|
| `app/layout.tsx` | `<html lang>` must become dynamic (client-rendered) or wrapped in a client component that flips the attribute via `useEffect` | +6 / -1 |
| `app/page.tsx` | Wrap with `I18nProvider`; add `<LanguageSwitcher>` to footer; replace ~7 hardcoded literals; thread locale to `<html lang>` | +20 / -8 |
| `components/ParameterPanel.tsx` | ~30 strings: section labels, slider labels, tooltips, work-area presets, button copy, variant options, aria-labels | +6 / -28 (refactor: extract labels map; tooltips become prop objects) |
| `components/ImageDropzone.tsx` | CTA, hint, error messages, `Uploading…` | +3 / -6 |
| `components/CanvasPreview.tsx` | EmptyState child + `aria-label` | +1 / -2 |
| `components/GCodeViewer.tsx` | Canvas fallback text (pass as prop), warning banner, `aria-label` | +2 / -3 |
| `components/GCodeOutput.tsx` | Copy/Download labels + sr-only messages | +2 / -5 |
| `components/WarningsList.tsx` | `Warnings` heading | +0 / -1 |
| `hooks/useConvert.ts` | Fallback error string | +1 / -1 |
| `lib/presets.ts` | `IMAGE_TYPE_LABELS` becomes a key set; localized labels live in dictionaries | +0 / -1 |
| `lib/i18n/I18nProvider.tsx` | **NEW** — context, state, localStorage hydration, `<html lang>` sync | +60 (new) |
| `lib/i18n/useT.ts` | **NEW** — typed `t(key, vars?)` hook with ICU-lite interpolation | +20 (new) |
| `lib/i18n/dictionaries/en.ts` | **NEW** — flat or nested string map (~70 keys) | +90 (new) |
| `lib/i18n/dictionaries/es.ts` | **NEW** — Spanish translations of same keys | +90 (new) |
| `lib/i18n/types.ts` | **NEW** — `Locale = 'en' \| 'es'`, dictionary type | +15 (new) |
| `components/LanguageSwitcher.tsx` | **NEW** — two-segment pill (`EN` / `ES`) matching `PillButton` aesthetic | +35 (new) |
| `openspec/specs/frontend-design-system/spec.md` | **MODIFY** requirement "UI Language" — relax "MUST be in English" to "MUST be in user's selected locale" | +6 / -4 |

**No backend changes.** `shared/api-contract.json` is untouched. The only spec deltas are the `frontend-design-system` requirement edit plus a new spec at `frontend-i18n` documenting locale, switcher behavior, persistence, and the `<html lang>` contract.

---

## Approaches

### Option A — Custom React Context + flat dictionary (zero new deps)

Hand-roll a tiny i18n layer: a client-side `I18nProvider` exposes `{ locale, setLocale, t }` via `React.createContext`. A `useT()` hook returns a `t(key, vars?)` function that reads from a frozen `Record<Locale, Record<string, string>>` dictionary, with simple `{varName}` interpolation. `LanguageSwitcher` is a two-pill `EN`/`ES` component.

- **Pros**
  - Matches the codebase's "no external UI/state libs" philosophy — the only runtime deps (`next`, `react`, `react-dom`) stay the same.
  - Trivially readable: a new contributor opens `dictionaries/en.ts` and sees every string in one file.
  - SSR-safe: provider is a client component; dictionaries are static imports, no async loading.
  - `localStorage` persistence is ~5 lines of `useEffect`/`useState`; no hydration mismatch if we read on mount and tolerate a one-frame `lang="en"` flash (acceptable per the design system spec).
  - Composition for aria-labels (`Reset ${label} to default`) is straightforward with `{label}` interpolation.
  - Type safety: `Dictionary` type is hand-written, so `t('nonexistent.key')` is a TS error.
  - Switching to a third locale later is one new file + one `Locale` union member.
- **Cons**
  - No plural/gender support out of the box — for EN/ES (two locales, no pluralization differences that matter for ~70 short labels) this is fine. ICU plural categories (`{count, plural, one {# file} other {# files}}`) would need a hand-rolled helper if added later.
  - We must hand-write the dictionary; no `.po` / `.json` auto-loading from Transifex/etc. (out of scope anyway).
  - Variable interpolation is regex-based; a malicious `key` containing `}` could in theory misbehave — mitigated by the `Dictionary` type restricting keys to known strings.
- **Effort**: Low. ~250 LoC of new code, ~60 LoC of edits across 9 files.

### Option B — `next-intl`

Route-based i18n library designed for App Router. Uses `[locale]/` segment, middleware for locale detection, and ICU MessageFormat under the hood.

- **Pros**
  - Industry standard for Next.js App Router; full ICU support (plurals, genders, number/date formatting).
  - Locale-prefixed URLs (`/es`, `/en`) are automatic.
  - Server Component compatible via `getTranslations`.
- **Cons**
  - **Massive overkill for a single-page app** with one switcher. Requires middleware, a `[locale]` segment, a `i18n.ts` request config, and a routing restructure. CIPRA has zero existing localized routes.
  - Pulls in dependencies (`next-intl`, indirectly `intl-messageformat`).
  - Locale persistence model is URL-driven; adding `localStorage` "remember my choice" requires extra glue.
  - Deviates from the project's "minimal deps" stance.
  - Dictionary files are JSON/TS, but the API is heavier (`useTranslations('namespace')` calls everywhere — verbose for a 70-string app).
- **Effort**: Medium-High. Middleware + route restructure + rename `app/page.tsx` → `app/[locale]/page.tsx` + migration of every component call site. ~400-500 LoC churn for marginal value.

### Option C — `react-i18next`

Mature React binding for i18next. Component-level, no URL coupling.

- **Pros**
  - Strong ecosystem; well-known API; lazy-loaded namespaces.
  - Pluggable backends (localStorage, fetch, etc.).
- **Cons**
  - Needs `<Suspense>` boundaries or `useSuspense` flag; CSR-only without extra wiring for App Router.
  - Heavyweight for a 2-locale app: ~50KB gzipped + ICU runtime.
  - Dictionary structure is nested JS objects; type safety requires `i18next-typescript` plugin or hand-rolled module augmentation.
  - Conflicts with the project's "hand-built, no library" aesthetic.
  - App Router Server Components don't get translation support without the `i18next-browser-languagedetector` shim.
- **Effort**: Medium. ~300 LoC of glue + provider setup + 12 component call-site migrations.

---

## Comparison

| Criterion | A: Custom Context | B: next-intl | C: react-i18next |
|-----------|-------------------|--------------|------------------|
| New runtime deps | 0 | 1–2 | 1–2 |
| App Router fit | Native (client) | Native (server+client) | Client only |
| Routes / middleware needed | No | Yes (`[locale]` segment) | No |
| LoC added | ~250 new | ~400–500 | ~300 new + glue |
| LoC edited across files | ~60 | ~200 (route migrate) | ~80 |
| ICU plurals | Hand-roll if needed | Built-in | Built-in |
| Type safety | Hand-rolled `Dictionary` type | Good (typed keys) | Requires plugin |
| Persistence (localStorage) | 5 lines | Extra config | Plugin |
| Aligns with codebase style | **Yes** | No (heavy) | No (heavy) |
| Future 3rd locale | 1 file + 1 union member | 1 file + route | 1 file + config |

---

## Recommendation

**Adopt Option A (Custom React Context).** Rationale:

1. **Scope match.** CIPRA is a single-page App Router app with ~70 user-facing strings and 2 locales (EN/ES). Both target languages are LTR, share the same plural morphology for the strings in use, and have no gender inflection. ICU MessageFormat and locale-prefixed routing solve problems this app does not have.
2. **Project alignment.** Every other control in the codebase is hand-rolled (`Toggle`, `Tooltip`, `PillButton`, `NumericParamRow`, `EmptyState`, the `focus-ring` utility, the `ci-*` token system). Pulling in `next-intl` or `react-i18next` would be the **first external UI/state dependency at runtime** since launch, breaking a deliberate pattern.
3. **Discoverability.** A future contributor adding a new string will open `lib/i18n/dictionaries/en.ts`, see the existing key, and add a translation — no plugin indirection, no `useTranslations('namespace')` ceremony, no async loading state to reason about.
4. **Performance.** No additional bundle weight; both dictionaries are static-imported in the provider.
5. **Reversibility.** The `t()` function is a thin wrapper; if a 3rd locale or ICU plurals arrive later, swapping to `next-intl` is mechanical: replace the dictionary read with `getTranslations('common')` and remove the context. The component call sites do not need to change (we can keep the `t(key, vars?)` signature).
6. **TypeScript alignment.** Hand-rolled `Dictionary` type gives compile-time errors on missing keys; no `as const` dance.

### Concrete design sketch

```
lib/i18n/
├── types.ts          // Locale = 'en' | 'es'; Dictionary type
├── dictionaries/
│   ├── en.ts         // ~70 keys
│   └── es.ts         // ~70 keys
├── I18nProvider.tsx  // 'use client'; context, localStorage, <html lang> sync
└── useT.ts           // hook: returns (key, vars?) => string
components/
└── LanguageSwitcher.tsx  // two-pill EN/ES, reuses ci-* tokens
```

`I18nProvider` mounts in `app/page.tsx` (or as a wrapper around `{children}` in `app/layout.tsx` — but `layout.tsx` is a Server Component, so a small client wrapper or a `useEffect` in the provider that updates `document.documentElement.lang` is required). Recommended placement: a client-side `<I18nProvider>` in `app/layout.tsx` wrapping `{children}`.

`LanguageSwitcher` lives in the sticky footer, before `Reset` (left of the action group). Two pills: `EN` and `ES`. Active state matches the `PillButton` "selected" style.

### `lang` attribute strategy

`<html lang="en">` is set server-side as a sensible default (en is the source of truth; no `es` page exists server-side anyway). On the client, the `I18nProvider` runs a one-time `useEffect` that reads `localStorage` and, if a different locale is stored, calls `document.documentElement.lang = locale`. This is a **single-frame flash** for returning users but acceptable; the alternative (defer the entire page until `localStorage` reads) is a worse tradeoff. The design system spec must acknowledge this.

### Composition pattern for parameterized strings

`ParameterPanel` builds `aria-label={`Reset ${label.toLowerCase()} to default`}`. Under the new model: `t('parameter.resetAria', { label: label.toLowerCase() })` with dictionary entry `parameter.resetAria: "Reset {label} to default"`. The interpolation helper does a single `replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')`. Plurals are not needed for these strings.

### `GCodeViewer` canvas text special case

The fallback text `"Convert an image to see the toolpath"` is drawn via `ctx.fillText`. The component must accept a new prop `fallbackText: string` (or read context directly via `useT`). Recommended: prop, because the canvas is decoupled from the rest of the app tree and a prop keeps the visual surface explicit. The `Warnings` banner copy in the same component is a normal React node and uses `t()` directly.

### `IMAGE_TYPE_LABELS` migration

`lib/presets.ts` currently exposes the labels as values. The dictionary owns all UI copy, so `presets.ts` should keep the *type union* and rename the export to `IMAGE_TYPE_KEYS` (or just keep the type as `ImageType`). The actual `'Photo'` / `'Foto'` labels move into `dictionaries/en.ts` under `imageType.photo`, etc. Components call `t(`imageType.${type}`)`.

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `<html lang>` SSR/CSR mismatch warning in dev | Medium | Server default stays `en`; client `useEffect` updates only on mount. Acceptable single-frame flash. Spec the behavior explicitly so it's not treated as a bug. |
| Dictionary drift between `en.ts` and `es.ts` (missing key in one) | Medium | Hand-rolled `Dictionary` type with `Record<Locale, ...>` makes the *contract* typed; runtime check in `t()` falls back to the key string in dev (with `console.warn`) so drift is loud, not silent. Optionally add a build-time script that diffs the two files. |
| `useConvert.error` renders backend message verbatim | Low (out of scope) | Document as known limitation in the spec. Backend i18n is a separate change. Frontend can wrap the error in a "Conversion failed" prefix that IS translated. |
| Composed aria-labels (e.g., `Reset scale to default`) lose the parameter name in translation | Medium | Use the same `{label}` interpolation pattern in both locales. The "Reset" verb is shared; only the noun varies. Document the interpolation contract. |
| `localStorage` not available (e.g., private mode, SSR) | Low | `try/catch` around `localStorage.getItem`; fall back to `'en'` silently. The design system already calls out "no test infra"; this is a runtime resilience concern, not a test concern. |
| Bundle size grows when both dictionaries ship to the client | Very Low | Both are < 5KB raw, ~1.5KB gzipped each. Total i18n overhead < 4KB. Acceptable. |
| `app/layout.tsx` is a Server Component and can't host `I18nProvider` directly | Medium | Either (a) split into a client `I18nProviderWrapper` that lives in `app/layout.tsx` as `<I18nProviderWrapper>{children}</I18nProviderWrapper>`, or (b) mount the provider in `app/page.tsx` and accept that the layout shell (`<html lang>`) defaults to `en` until the page hydrates. Option (a) is cleaner. |
| Refactor touches 12+ files, may exceed the 400-line review budget | Medium | The translation work is mechanical and safe. Recommended delivery: one PR with the provider/dictionaries/switcher (~200 LoC new), then a second PR for component call-site migrations (~100 LoC churn across 9 files). Chained PRs are appropriate here. |
| Existing spec `frontend-design-system` "UI Language" requirement is in conflict | Low | Mark that requirement as **MODIFIED** in the delta spec; the new `frontend-i18n` capability subsumes it. |
| `presets.ts` `IMAGE_TYPE_LABELS` rename breaks any import | Low | Only `ParameterPanel.tsx` imports it. Update both atomically. |

---

## Open Questions

1. **Locale default for first-time visitors.** Spanish-speaking users? English? Project origin is Spanish (`Vista previa`, etc. were the pre-redesign copy). Proposal: default to **`en`** to match the current state and let users opt in. Alternative: detect `navigator.language` and default to `es` if it starts with `es`. Needs a user-facing decision — flagging in proposal.
2. **Switcher visual style.** Two-pill segmented control (EN | ES) vs. dropdown vs. globe icon + current locale. Two-pill matches the `PillButton` aesthetic already in the parameter panel. **Recommendation: two-pill.** Needs visual confirmation from the design system owner.
3. **Should `Warnings` (the h3 heading) and backend-rendered error text be translated at all?** `Warnings` is a section heading; yes. Backend error text: no (out of scope), but we should add a translated prefix like `Conversion failed: {backendError}` so the wrapping is localizable.
4. **Variant names** (`fast`, `detailed`, `balanced`) are *backend values* sent over the wire. Today they're capitalized for display via `v.charAt(0).toUpperCase() + v.slice(1)`. Under i18n: keep the wire value, translate the *label* (`Fast` → `Rápido`, `Detailed` → `Detallado`, `Balanced` → `Equilibrado`). The `<option value>` must stay as the backend enum.

---

## Ready for Proposal

**Yes.** The exploration is complete, the recommendation is concrete, and the spec deltas are small and well-scoped. The orchestrator can proceed to `sdd-propose` with the following handoff context:

- **Recommended approach**: Option A (Custom React Context + flat dictionary).
- **Scope boundary**: Frontend only. No backend, no API contract change.
- **New files**: `lib/i18n/{types.ts, I18nProvider.tsx, useT.ts, dictionaries/en.ts, dictionaries/es.ts}`, `components/LanguageSwitcher.tsx`.
- **Modified files**: `app/layout.tsx`, `app/page.tsx`, all 8 component files with user-facing strings, `hooks/useConvert.ts`, `lib/presets.ts`, `openspec/specs/frontend-design-system/spec.md`.
- **Spec domain**: New domain `frontend-i18n` plus a MODIFIED delta on `frontend-design-system` requirement "UI Language".
- **Open questions to resolve at propose time**: (1) default locale for first visit, (2) switcher visual style confirmation, (3) variant label localization.
- **Delivery**: Recommend **chained PRs** — PR1 = foundation (provider + dictionaries + switcher + layout wiring), PR2 = component migrations. Total ~300 LoC; PR2 is the heavier file churn and benefits from isolated review.
