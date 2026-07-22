# Tasks: Fix Aspect Ratio and UX

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~410 |
| 400-line budget risk | Low per slice / Medium total |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | PR | Base | Est. Lines |
|------|------|----|------|-----------:|
| 1 | Backend uniform fit + centering | PR 1 | main | ~35 |
| 2 | Tooltip component + ParameterPanel integration | PR 2 | main | ~70 |
| 3 | ParameterPanel paired controls + reset | PR 3 | PR 2 | ~130 |
| 4 | page.tsx responsive grid + DOM reorder | PR 4 | PR 3 | ~120 |
| 5 | GCodeViewer dynamic work area props | PR 5 | PR 4 | ~45 |

## Phase 1: Backend Fix

- [x] 1.1 [BACKEND] `backend/pipeline/simplify.py`: replace `scale_x`/`scale_y` with uniform `fit` + centering offsets per design formula.
- [x] 1.2 [TEST] `backend/tests/test_pipeline.py`: update `test_y_flip_uses_bottom_left_origin` expected values for new centering offset.
- [x] 1.3 [TEST] Add aspect-ratio tests: landscape/portrait centering, identical ratio, scale post-multiply, oversized image fits inside.

## Phase 2: Tooltip Component

- [x] 2.1 [FRONTEND] Create `frontend/components/Tooltip.tsx`: pure CSS hover/focus, Tailwind `group`, no external deps.
- [x] 2.2 [FRONTEND] `frontend/components/ParameterPanel.tsx`: wrap labels in `<Tooltip text={description}>`, remove native `title` attrs, keep Spanish text.

## Phase 3: Paired Parameter Controls

- [x] 3.1 [FRONTEND] `frontend/components/ParameterPanel.tsx`: add paired `<input type="number">` per numeric param, bidirectionally bound to slider state.
- [x] 3.2 [FRONTEND] Clamp number input on blur: `Math.min(max, Math.max(min, parseFloat(value)))`.
- [x] 3.3 [FRONTEND] Add per-param reset button (↺) restoring `DEFAULTS[key]` via `onChange({ [key]: DEFAULTS[key] })`.

## Phase 4: Responsive Layout

- [x] 4.1 [FRONTEND] `frontend/app/page.tsx`: set `max-w-5xl`, add `grid md:grid-cols-[2fr_1fr] gap-6` wrapper.
- [x] 4.2 [FRONTEND] Reorder DOM so ParameterPanel + Convert/Reset share right column; verify no horizontal scroll at 375px.

## Phase 5: Dynamic GCodeViewer

- [x] 5.1 [FRONTEND] `frontend/components/GCodeViewer.tsx`: accept `workAreaW`/`workAreaH` props, default A4, fallback on invalid values + `console.warn`.
- [x] 5.2 [FRONTEND] Replace hardcoded canvas sizing with proportional scaling from work-area dimensions preserving aspect ratio.

## Phase 6: Verification

- [x] 6.1 [TEST] Run backend tests: `pytest backend/tests/test_pipeline.py` all green.
- [x] 6.2 [TEST] Run frontend build with zero errors.
- [x] 6.3 [MANUAL] Verify tooltips hover/focus, slider/number sync, breakpoints, GCodeViewer custom work area.
