# Design: i18n Language Switch

## Technical Approach

Custom React Context + flat dictionary pattern — zero new dependencies. A client-side `I18nProvider` wraps the app, exposing `{ locale, setLocale, t }` via context. Dictionaries are flat `Record<string, string>` maps (~70 keys each). `localStorage` persists the user's choice; `<html lang>` syncs via `useEffect`. All existing components replace hardcoded strings with `t('key')` calls.

This matches CIPRA's hand-rolled, zero-dependency aesthetic. No routing changes, no SSR locale detection, no third-party i18n library.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| i18n library | Custom React Context | `next-intl`, `react-i18next` | Zero deps; ~70 keys doesn't justify a library; matches project's hand-rolled pattern |
| Dictionary structure | Flat `Record<string, string>` | Nested objects (`{ app: { title: '...' } }`) | Simpler type checking; dot-keys are grep-friendly; no deep-merge logic needed |
| Persistence | `localStorage` key `cipra-lang` | Cookie, `sessionStorage` | Survives reloads; no server round-trip; consistent with client-only architecture |
| `<html lang>` sync | `useEffect` on mount + locale change | Server-side injection, `<Script>` | Server default `en` avoids flash for majority; client corrects on mount for returning ES users |
| Provider integration | Client wrapper component in `layout.tsx` | Make layout a client component | `layout.tsx` must stay Server Component for `Metadata` export; wrapper isolates client boundary |
| GCodeViewer canvas text | `fallbackText` prop | `useT()` inside GCodeViewer | Canvas `fillText` runs in `useEffect` (imperative); prop keeps GCodeViewer decoupled from i18n context |
| `presets.ts` labels | Export `IMAGE_TYPE_KEYS` (string array) | Keep `IMAGE_TYPE_LABELS` | Labels move to dictionaries; `presets.ts` owns data, not presentation |

## Data Flow

```
app/layout.tsx (Server Component)
  └── <I18nProviderWrapper> (Client Component)
        ├── reads localStorage('cipra-lang') → initial locale
        ├── useEffect → document.documentElement.lang = locale
        │
        └── I18nContext.Provider { locale, setLocale, t }
              │
              ├── LanguageSwitcher → setLocale('en' | 'es')
              │     └── writes localStorage('cipra-lang')
              │
              ├── useT() hook → t(key, vars?)
              │     └── dictionary[locale][key] with {var} interpolation
              │
              └── Components call t('key') for all UI strings
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/lib/i18n/types.ts` | Create | `Locale` union type, `Dictionary` type alias |
| `frontend/lib/i18n/dictionaries/en.ts` | Create | English flat dictionary (~70 keys) |
| `frontend/lib/i18n/dictionaries/es.ts` | Create | Spanish flat dictionary (~70 keys) |
| `frontend/lib/i18n/I18nProvider.tsx` | Create | Client context provider: `localStorage` read/write, `<html lang>` sync, `t()` function |
| `frontend/lib/i18n/useT.ts` | Create | Hook returning `t(key, vars?)` with `{var}` regex interpolation |
| `frontend/components/LanguageSwitcher.tsx` | Create | Two-pill EN/ES component using `ci-*` tokens |
| `frontend/app/layout.tsx` | Modify | Import and wrap `{children}` with `<I18nProviderWrapper>` |
| `frontend/app/page.tsx` | Modify | Add `<LanguageSwitcher>` to footer; replace ~7 hardcoded strings with `t()` calls |
| `frontend/components/ParameterPanel.tsx` | Modify | Replace ~30 strings with `t()` calls; import `IMAGE_TYPE_KEYS` instead of `IMAGE_TYPE_LABELS` |
| `frontend/components/ImageDropzone.tsx` | Modify | Replace CTA, hint, error display strings with `t()` (keep internal error codes `'unsupported type'` / `'file too large'`) |
| `frontend/components/CanvasPreview.tsx` | Modify | EmptyState text + aria-label via `t()` |
| `frontend/components/GCodeViewer.tsx` | Modify | Add `fallbackText` prop for canvas text; warning message + aria-label via `t()` |
| `frontend/components/GCodeOutput.tsx` | Modify | Copy/Download labels + sr-only messages via `t()` |
| `frontend/components/WarningsList.tsx` | Modify | Heading via `t()` |
| `frontend/hooks/useConvert.ts` | Modify | Fallback error string via `t()` |
| `frontend/lib/presets.ts` | Modify | Replace `IMAGE_TYPE_LABELS` with `IMAGE_TYPE_KEYS: ImageType[]` |

## Interfaces / Contracts

```ts
// lib/i18n/types.ts
export type Locale = 'en' | 'es';
export type Dictionary = Record<string, string>;

// lib/i18n/I18nProvider.tsx — context shape
interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

// lib/i18n/useT.ts — hook return
type UseT = (key: string, vars?: Record<string, string | number>) => string;

// components/LanguageSwitcher.tsx — no props
export function LanguageSwitcher(): JSX.Element;

// components/GCodeViewer.tsx — new prop
interface GCodeViewerProps {
  gcode: string | null;
  workAreaW?: number;
  workAreaH?: number;
  fallbackText?: string;  // NEW: canvas placeholder text, defaults to t('viewer.empty')
}

// lib/presets.ts — changed export
export const IMAGE_TYPE_KEYS: ImageType[] = ['photo', 'line_art', 'sketch', 'text', 'custom'];
// IMAGE_TYPE_LABELS removed — labels computed via t('preset.photo') etc. inside ParameterPanel
```

### Dictionary key namespace convention

| Prefix | Domain | Example |
|--------|--------|---------|
| `app.*` | App-level (title, tagline) | `app.title` |
| `button.*` | Button labels | `button.reset`, `button.convert` |
| `dropzone.*` | ImageDropzone copy | `dropzone.cta`, `dropzone.hint` |
| `param.*` | ParameterPanel labels | `param.scale`, `param.threshold` |
| `preset.*` | Image type presets | `preset.photo`, `preset.line_art` |
| `viewer.*` | GCodeViewer / CanvasPreview | `viewer.empty`, `viewer.aria` |
| `output.*` | GCodeOutput labels | `output.copy`, `output.download` |
| `warning.*` | Warning messages | `warning.heading`, `warning.gcode_lines` |
| `footer.*` | Sticky footer bar | `footer.generating`, `footer.converting` |
| `tab.*` | Tab labels | `tab.preview`, `tab.paths`, `tab.gcode` |
| `error.*` | Error messages | `error.unsupported_type`, `error.file_too_large` |
| `toggle.*` | Toggle labels | `toggle.realtime`, `toggle.live` |
| `workarea.*` | Work area section | `workarea.title`, `workarea.preset` |
| `transform.*` | Transform section | `transform.title`, `transform.flip_h` |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `t()` interpolation: key lookup, `{var}` replacement, missing key fallback | Pure function tests on `t()` with mock dictionaries |
| Unit | Dictionary key parity (en vs es have same keys) | Script comparing `Object.keys(en)` vs `Object.keys(es)` |
| Integration | `I18nProvider` locale switch + `localStorage` persistence | Render provider, click switcher, assert `localStorage` and re-render with new locale |
| Integration | `<html lang>` sync after locale change | Mount provider, change locale, assert `document.documentElement.lang` |
| E2E | Full locale switch flow: click ES → all visible text is Spanish | Playwright: click ES pill, snapshot, verify no English UI strings remain |

## Migration / Rollout

No migration required. Pure frontend addition.

**Rollout**: Two chained PRs to keep review budget manageable:
- **PR1** (~200 LoC new): `lib/i18n/` foundation + `LanguageSwitcher` + layout integration
- **PR2** (~100 LoC churn): Component string migrations (8 components + hook + presets)

**Rollback**: Revert `layout.tsx` provider wrapper → app returns to English-only. Git history preserves all original hardcoded strings.

## Open Questions

- [ ] Should `t()` throw in dev mode on missing keys (instead of `console.warn` + fallback)? Stricter but may break fast iteration.
- [ ] Work area preset names (`A4 Portrait`, `Letter`) — translate or keep as-is? They're quasi-proper nouns.
