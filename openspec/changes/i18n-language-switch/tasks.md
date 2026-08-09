# Tasks: i18n Language Switch

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450–550 (additions + deletions) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Foundation → PR 2: Component migrations |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add i18n foundation: types, dictionaries, provider, hook, switcher, layout wrapper | PR 1 | Targets main; ~260 new LoC; includes build check |
| 2 | Migrate components/hooks/presets to `t()` keys and add switcher to footer | PR 2 | Targets PR 1 branch; ~200 changed LoC; depends on Unit 1 |

## Phase 1: Foundation

- [x] 1.1 Create `frontend/lib/i18n/types.ts` with `Locale = 'en' | 'es'` and `Dictionary` type
- [x] 1.2 Create `frontend/lib/i18n/dictionaries/en.ts` with all ~70 flat keys
- [x] 1.3 Create `frontend/lib/i18n/dictionaries/es.ts` matching `en.ts` key-for-key
- [x] 1.4 Create `frontend/lib/i18n/I18nProvider.tsx` with context, `localStorage` read/write, and `<html lang>` sync
- [x] 1.5 Create `frontend/lib/i18n/useT.ts` exposing `t(key, vars?)` with `{var}` interpolation and dev-mode missing-key warning
- [x] 1.6 Create `frontend/components/LanguageSwitcher.tsx` as two-pill `EN`/`ES` toggle using `ci-*` tokens
- [x] 1.7 Create `frontend/app/I18nProviderWrapper.tsx` client wrapper to bridge server `layout.tsx`
- [x] 1.8 Modify `frontend/app/layout.tsx` to wrap `{children}` with `<I18nProviderWrapper>`

## Phase 2: Component Migration

- [x] 2.1 Modify `frontend/app/page.tsx`: add `<LanguageSwitcher>` to sticky footer and replace ~7 hardcoded strings with `t()`
- [x] 2.2 Modify `frontend/components/ParameterPanel.tsx`: replace ~30 strings with `t()`; import `IMAGE_TYPE_KEYS` and map labels via `t('preset.*')`
- [x] 2.3 Modify `frontend/components/ImageDropzone.tsx`: replace CTA, hint, and error display strings with `t()` while keeping internal error codes unchanged
- [x] 2.4 Modify `frontend/components/CanvasPreview.tsx`: replace EmptyState text and aria-label with `t()`
- [x] 2.5 Modify `frontend/components/GCodeViewer.tsx`: add `fallbackText` prop and replace warning/aria-label strings with `t()`
- [x] 2.6 Modify `frontend/components/GCodeOutput.tsx`: replace copy/download labels and sr-only messages with `t()`
- [x] 2.7 Modify `frontend/components/WarningsList.tsx`: replace heading with `t()`
- [x] 2.8 Modify `frontend/hooks/useConvert.ts`: replace fallback error string with `t()` (via optional fallbackError parameter)
- [x] 2.9 Modify `frontend/lib/presets.ts`: replace `IMAGE_TYPE_LABELS` with `IMAGE_TYPE_KEYS: ImageType[]`

## Phase 3: Verification

- [x] 3.1 Run `next build` and fix any TypeScript errors (no test runner available)
- [x] 3.2 Manually verify EN default, ES switch, and `localStorage` persistence in browser dev tools
- [x] 3.3 Manually verify `<html lang>` updates to `es` on switch and persists after reload
- [x] 3.4 Grep for hardcoded English UI strings in `frontend/components` and `frontend/app` and resolve any remaining literals
- [x] 3.5 Verify `LanguageSwitcher` pills render active/inactive states and respond to Enter/Space

## Phase 4: Spec & Documentation

- [x] 4.1 Update `openspec/changes/i18n-language-switch/specs/frontend-design-system/spec.md` "UI Language" requirement to reflect selected-locale behavior
- [x] 4.2 Resolve or document open design questions (dev-mode fallback behavior, work-area preset names)
- [x] 4.3 Add inline comment in `I18nProvider.tsx` documenting expected single-frame `<html lang="en">` SSR flash

## Verification Notes

- `npx tsc --noEmit` in `frontend/`: **PASS** (zero TypeScript errors)
- `pytest backend -q`: **PASS** (no regressions)
- `npm run build` in `frontend/`: **BLOCKED** by pre-existing root-owned `.next` build artifacts in the workspace (`EACCES` on unlink). This is an environment/permission issue, not a TypeScript or source-code error.
