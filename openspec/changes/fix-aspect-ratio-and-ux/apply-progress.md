# Apply Progress: Fix Aspect Ratio and UX

## Change

- **Name**: fix-aspect-ratio-and-ux
- **Current PR**: #5 of 5 (stacked-to-main) — FINAL
- **Work unit**: Dynamic GCodeViewer work-area props
- **Estimated lines**: ~45
- **Actual lines**: ~61 (GCodeViewer ~55, page.tsx ~6)

## Completed Tasks

### PR #1 — Backend uniform fit + centering

- [x] 1.1 [BACKEND] `backend/pipeline/simplify.py`: replace `scale_x`/`scale_y` with uniform `fit` + centering offsets per design formula.
- [x] 1.2 [TEST] `backend/tests/test_pipeline.py`: update `test_y_flip_uses_bottom_left_origin` expected values for new centering offset.
- [x] 1.3 [TEST] Add aspect-ratio tests: landscape/portrait centering, identical ratio, scale post-multiply, oversized image fits inside.

### PR #2 — Tooltip component + ParameterPanel integration

- [x] 2.1 [FRONTEND] Create `frontend/components/Tooltip.tsx`: pure CSS hover/focus, Tailwind `group`, no external deps.
- [x] 2.2 [FRONTEND] `frontend/components/ParameterPanel.tsx`: wrap labels in `<Tooltip text={description}>`, remove native `title` attrs, keep Spanish text.

### PR #3 — Paired parameter controls + per-param reset

- [x] 3.1 [FRONTEND] `frontend/components/ParameterPanel.tsx`: add paired `<input type="number">` per numeric param, bidirectionally bound to slider state.
- [x] 3.2 [FRONTEND] Clamp number input on blur: `Math.min(max, Math.max(min, parseFloat(value)))`.
- [x] 3.3 [FRONTEND] Add per-param reset button (↺) restoring `DEFAULTS[key]` via `onChange({ [key]: DEFAULTS[key] })`.

### PR #4 — Responsive layout + DOM reorder

- [x] 4.1 [FRONTEND] `frontend/app/page.tsx`: set `max-w-5xl`, add `grid md:grid-cols-[2fr_1fr] gap-6` wrapper.
- [x] 4.2 [FRONTEND] Reorder DOM so ParameterPanel + Convert/Reset share right column; verify no horizontal scroll at 375px.

### PR #5 — Dynamic GCodeViewer

- [x] 5.1 [FRONTEND] `frontend/components/GCodeViewer.tsx`: accept `workAreaW`/`workAreaH` props, default A4, fallback on invalid values + `console.warn`.
- [x] 5.2 [FRONTEND] Replace hardcoded canvas sizing with proportional scaling from work-area dimensions preserving aspect ratio.

### Phase 6 — Verification

- [x] 6.1 [TEST] Run backend tests: `pytest backend/tests/test_pipeline.py` all green.
- [x] 6.2 [TEST] Run frontend build with zero errors.
- [x] 6.3 [MANUAL] Verify tooltips hover/focus, slider/number sync, breakpoints, GCodeViewer custom work area.

## Files Changed (PR #5)

| File | Action | What Was Done |
|------|--------|---------------|
| `frontend/components/GCodeViewer.tsx` | Modified | Added optional `workAreaW`/`workAreaH` props with A4 defaults. Removed hardcoded `WORK_AREA_W_MM`/`WORK_AREA_H_MM` and fixed `CANVAS_WIDTH`/`CANVAS_HEIGHT` constants. Added validation fallback to A4 with `console.warn` for invalid/undefined/zero/NaN values. Computed dynamic canvas width/height by fitting the work area proportionally inside a 560×792 container. Updated coordinate mapping and dependency array to use the effective work-area dimensions. |
| `frontend/app/page.tsx` | Modified | Passed `params.scara?.work_area_w_mm` and `params.scara?.work_area_h_mm` into `<GCodeViewer>` so the viewer respects the configured SCARA work area. |

## Implementation Mode

- **Mode**: Standard (Strict TDD not active)
- **TDD Cycle Evidence**: N/A

## Verification

- `pytest backend -q` → 38 passed.
- `npm run build` in `frontend/` → compiled successfully, static pages generated, zero TypeScript errors.

## Deviation Notes

- Retained the existing 16px canvas padding/inset frame. The outer canvas dimensions are computed from the work-area aspect ratio, and the drawing scale is then computed against the padded frame so strokes stay inside the visible border. This preserves the prior UI border while still making sizing fully dynamic.

## Remaining Tasks

None — all 12 tasks complete.

## Status

12/12 tasks complete. PR #5 ready for verify / merge.
