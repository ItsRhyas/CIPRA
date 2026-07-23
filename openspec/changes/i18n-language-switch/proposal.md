# Proposal: i18n Language Switch

## Intent

CIPRA has ~70 hardcoded English strings across 12 files with zero i18n layer. Spanish-speaking users cannot use the app in their language. This change adds client-side EN/ES locale switching using a custom React Context + flat dictionary — matching the project's hand-rolled, zero-dependency aesthetic.

## Scope

### In Scope
- `I18nProvider` (client context with `localStorage` persistence, `<html lang>` sync)
- `useT()` hook with typed keys and `{var}` interpolation
- EN + ES dictionaries (~70 keys each)
- Two-pill `LanguageSwitcher` in sticky footer bar
- Replace all hardcoded strings in 8 components, `useConvert.ts`, `presets.ts`
- Update `frontend-design-system` spec "UI Language" requirement
- New `frontend-i18n` capability spec

### Out of Scope
- Backend/API i18n (error messages from backend stay English)
- ICU plural/gender support
- Locale-prefixed routing (`/es`, `/en`)
- `navigator.language` auto-detection
- Third locale (future: one file + one union member)

## Capabilities

### New Capabilities
- `frontend-i18n`: Client-side locale switching with EN/ES dictionary, `I18nProvider`, `useT` hook, `LanguageSwitcher` component, `<html lang>` synchronization, and `localStorage` persistence.

### Modified Capabilities
- `frontend-design-system`: "UI Language" requirement changes from "MUST be in English" to "MUST be in the user's selected locale (EN default)."

## Approach

**Option A: Custom React Context + flat dictionary (zero new deps).**

- `lib/i18n/types.ts` — `Locale = 'en' | 'es'`, `Dictionary` type
- `lib/i18n/dictionaries/en.ts` + `es.ts` — flat `Record<string, string>` maps
- `lib/i18n/I18nProvider.tsx` — `'use client'`, context exposing `{ locale, setLocale, t }`, `localStorage` read/write, `document.documentElement.lang` sync via `useEffect`
- `lib/i18n/useT.ts` — hook returning `t(key, vars?)` with regex interpolation
- `components/LanguageSwitcher.tsx` — two-pill `EN`/`ES` reusing `ci-*` tokens
- Provider wraps `{children}` in `app/layout.tsx` via a client wrapper component
- `<html lang="en">` stays server-side default; client corrects on mount

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/i18n/` | New | Provider, hook, types, EN/ES dictionaries |
| `components/LanguageSwitcher.tsx` | New | Two-pill locale switcher |
| `app/layout.tsx` | Modified | Wrap children with `I18nProviderWrapper` |
| `app/page.tsx` | Modified | Add `LanguageSwitcher` to footer; replace ~7 literals |
| `components/ParameterPanel.tsx` | Modified | ~30 strings → dictionary keys |
| `components/ImageDropzone.tsx` | Modified | CTA, hint, errors → dictionary keys |
| `components/CanvasPreview.tsx` | Modified | EmptyState text + aria-label |
| `components/GCodeViewer.tsx` | Modified | Canvas fallback text (prop), warning, aria-label |
| `components/GCodeOutput.tsx` | Modified | Copy/Download labels + sr-only messages |
| `components/WarningsList.tsx` | Modified | Heading → dictionary key |
| `hooks/useConvert.ts` | Modified | Fallback error string |
| `lib/presets.ts` | Modified | `IMAGE_TYPE_LABELS` → dictionary keys |
| `openspec/specs/frontend-design-system/spec.md` | Modified | "UI Language" requirement relaxed |
| `openspec/specs/frontend-i18n/spec.md` | New | Locale, switcher, persistence, `<html lang>` contract |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `<html lang>` SSR/CSR single-frame flash | Medium | Server default `en`; client corrects on mount. Document as expected behavior. |
| Dictionary drift (missing key in one locale) | Medium | `Dictionary` type enforces structure; `t()` falls back to key string with `console.warn` in dev. |
| `app/layout.tsx` is Server Component | Medium | Use client `I18nProviderWrapper` component. |
| 12+ file churn exceeds review budget | Medium | Deliver as chained PRs: PR1 = foundation (~200 LoC new), PR2 = component migrations (~100 LoC churn). |
| `presets.ts` rename breaks import | Low | Only `ParameterPanel.tsx` imports it; update atomically. |

## Rollback Plan

1. Revert the provider wrapper in `app/layout.tsx` — app returns to English-only with no locale context.
2. Remove `LanguageSwitcher` from `app/page.tsx` footer.
3. Revert component files to hardcoded English strings (git history has all originals).
4. Delete `lib/i18n/` directory and `components/LanguageSwitcher.tsx`.
5. Revert `frontend-design-system` spec change.

No data migration. No backend changes. Pure frontend revert.

## Dependencies

None. Zero new runtime dependencies — only `next`, `react`, `react-dom` (already installed).

## Success Criteria

- [ ] Language switcher renders in sticky footer with `EN`/`ES` pills
- [ ] Clicking `ES` switches all UI text to Spanish; clicking `EN` reverts
- [ ] Locale persists across page reloads via `localStorage`
- [ ] `<html lang>` attribute updates to match selected locale
- [ ] All ~70 strings are served from dictionaries (no hardcoded English in UI)
- [ ] `t('key', { var })` interpolation works for parameterized aria-labels
- [ ] TypeScript errors on missing dictionary keys
- [ ] No new runtime dependencies added to `package.json`
