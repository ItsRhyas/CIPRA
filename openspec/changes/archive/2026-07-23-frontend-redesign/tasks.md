# Tasks: frontend-redesign

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR 1 ~250 / PR 2 ~300 / PR 3 ~350 / PR 4 ~100 (total ~1000) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain (force-chained, stacked-to-main) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | PR | Base | Notes |
|------|------|-----|------|-------|
| 1 | Design system foundation | PR 1 | `main` | Tokens, fonts, grid, layout shell; uncommitted diff is the source |
| 2 | Component restyling + fixes | PR 2 | PR 1 head | 7 components + new EmptyState; keep tests/docs with code |
| 3 | Tab interface + ParameterPanel refactor | PR 3 | PR 2 head | Tab state/handlers, derived workAreaPreset, PillButton/SectionLabel |
| 4 | Accessibility correctness | PR 4 | PR 3 head | ARIA tabs, ImageDropzone keyboard; non-negotiable |

## PR 1: Design System Foundation

- [x] 1.1 Wire `ci-*` semantic palette into `frontend/tailwind.config.ts` covering bg, surface, text, muted, accent, accent-hover, accent-subtle, rule, rule-strong, danger, danger-bg, warning, warning-bg.
- [x] 1.2 Add font families and type scale: `--font-display` (DM Serif Display), `--font-body` (Inter), `--font-mono` (JetBrains Mono), `text-2xs`, `tracking-precise`.
- [x] 1.3 Centralize grid spacing as `--grid-cell: 24px` in `frontend/app/globals.css` and expose `.bg-grid` (6–8% opacity) and `.bg-grid-subtle` utilities.
- [x] 1.4 Add `.focus-ring` utility and base `:focus-visible` rule; honor `prefers-reduced-motion`; keep `sr-only` utility.
- [x] 1.5 Add consolidated `@layer components` range-input styling for WebKit + Mozilla thumbs.
- [x] 1.6 Update `frontend/app/layout.tsx` with `next/font/google` imports, `lang="en"`, and body classes `bg-ci-bg font-body text-ci-text`.
- [x] 1.7 Restructure `frontend/app/page.tsx` to single-column `max-w-3xl` flow with sticky footer shell (header/main/footer), preserving existing state hooks for later PRs.
- [x] 1.8 Verify `npm run build` passes and no orphaned `ci-*` token exists in config.

## PR 2: Component Restyling + Fixes

- [x] 2.1 Create `frontend/components/EmptyState.tsx` with shared shell `flex h-64 rounded-lg border border-ci-rule bg-ci-bg/60`; fulfills EmptyState spec.
- [x] 2.2 Update `CanvasPreview.tsx` to use `EmptyState`, swap to `ci-*` tokens, and convert user-facing copy to English.
- [x] 2.3 Update `GCodeOutput.tsx` to use `EmptyState`, token-swap, apply `focus-ring` to buttons, and translate copy to English.
- [x] 2.4 Update `GCodeViewer.tsx` to token-swap, restore Y-axis flip comment, restore `console.warn` on invalid work area dims, and read `--grid-cell` via `getComputedStyle` for canvas grid.
- [x] 2.5 Memoize `GCodeViewer` dimension calculations with `useMemo` so object identity is stable across unrelated parent re-renders.
- [x] 2.6 Update `ImageDropzone.tsx` token-swap and English copy (keyboard handler deferred to PR 4).
- [x] 2.7 Update `Toggle.tsx` to replace magic pixel translates with `--toggle-offset` CSS variable.
- [x] 2.8 Update `Tooltip.tsx` to `bg-ci-text`, `mb-1.5`, `leading-none` per parameter-tooltips delta.
- [x] 2.9 Update `WarningsList.tsx` token-swap; ensure no Spanish copy remains.
- [x] 2.10 Audit all `ci-*` tokens are used at least once; resolve `ci-surface` usage or remove the orphan.

## PR 3: Tab Interface + ParameterPanel Refactor

- [x] 3.1 Implement tab state and click handlers in `frontend/app/page.tsx` for Preview / Paths / G-Code tabs.
- [x] 3.2 Render per-tab panels wired to `activeTab`; leave ARIA attributes (`id`, `aria-controls`, `aria-labelledby`) for PR 4.
- [x] 3.3 Extract file-scoped `PillButton` inside `ParameterPanel.tsx` accepting `label`, `selected`, and `onClick`.
- [x] 3.4 Extract file-scoped `SectionLabel` inside `ParameterPanel.tsx` rendering uppercase eyebrow with `text-2xs uppercase tracking-wider text-ci-muted`.
- [x] 3.5 Restyle `NumericParamRow` and `ParameterPanel.tsx` with `ci-*` tokens, `tabular-nums` for readouts, and `tracking-precise` for labels.
- [x] 3.6 Replace `workAreaPreset` effect+mirror with `useMemo` derived from `work_area_w_mm` / `work_area_h_mm`; show `Custom` when no preset matches.
- [x] 3.7 Translate all `ParameterPanel` labels, tooltips, section headings, and button text to English; replace decorative glyphs (`✓`, `✗`, `↺`) with plain text.
- [x] 3.8 Restyle real-time toggle to `h-5 w-9` geometry and surface a visible `Live` indicator when enabled; position it above the fold.
- [x] 3.9 Verify `npm run build` passes and tab switching updates panel visibility.

## PR 4: Accessibility Correctness

- [x] 4.1 Add `const baseId = useId()` in `frontend/app/page.tsx` and derive `tabId(tab)` / `panelId(tab)` helpers.
- [x] 4.2 Wire each tab button with `role="tab"`, `id={tabId(tab)}`, `aria-controls={panelId(tab)}`, `aria-selected`, `tabIndex={active ? 0 : -1}`, and `onKeyDown={handleTabKeyDown}`.
- [x] 4.3 Implement `handleTabKeyDown` supporting ArrowLeft, ArrowRight, Home, and End with roving tabindex and focus move to the newly selected tab.
- [x] 4.4 Wire each tab panel with `role="tabpanel"`, `id={panelId(activeTab)}`, `aria-labelledby={tabId(activeTab)}`, and `tabIndex={0}`.
- [x] 4.5 Add `onKeyDown` to `ImageDropzone.tsx` so Enter and Space trigger the hidden file input click.
- [x] 4.6 Manual verification: keyboard tab navigation cycles correctly; screen reader announces tab/panel relationships.
- [x] 4.7 Manual verification: ImageDropzone opens file picker via Enter and Space without a mouse.
- [x] 4.8 Confirm `npm run build` passes and no ARIA id collisions exist if the page mounts twice.
