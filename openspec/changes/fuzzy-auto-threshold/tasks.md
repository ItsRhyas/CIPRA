# Tasks: Fuzzy Auto-Threshold Selection

## Priority-Ordered Task List

### Phase 1: Backend Verification (validate existing implementation)

| # | Task | Definition | Done? |
|---|------|-----------|-------|
| 1 | Verify fuzzy_threshold.py module execution | Run `pytest backend/tests/test_fuzzy_threshold.py` — all 21 tests must pass with `ruff` clean. | ✅ |
| 2 | Verify serializer bool validation | Run `pytest backend/tests/test_api.py::test_auto_threshold_validation` — non-boolean values must return 400. | ✅ |
| 3 | Verify orchestrator fuzzy stage insertion | Run `pytest backend/tests/test_api.py` scenarios: (a) `auto_threshold=True` → Canny uses fuzzy threshold, `meta.fuzzy` present, `"fuzzy"` in `stages_run`. (b) `auto_threshold=False` (omitted or false) → legacy stages, no `meta.fuzzy`. | ✅ |
| 4 | Verify endpoint contracts | Manual curl test: POST `/api/v1/convert/` with `auto_threshold: true` → 200, `meta.fuzzy` has keys `inputs`, `memberships`, `fired_rules`, `defuzzified`, `threshold`. With `auto_threshold: false` or omitted → 200, no `meta.fuzzy`, exact legacy `stages_run`. | ✅ |

### Phase 2: Frontend — Add `auto_threshold` to types

| # | Task | Definition | Done? |
|---|------|-----------|-------|
| 5 | Add `auto_threshold?: boolean` to `ConvertParams` in `frontend/lib/types.ts` | Edit the `ConvertParams` interface to add the optional boolean field, mirroring the backend contract. | ⬜ |
| 6 | Verify type-check compiles | Run `npm run build` in frontend — must succeed without type errors for the new field. | ⬜ |

### Phase 3: Frontend — ParameterPanel switch

| # | Task | Definition | Done? |
|---|------|-----------|-------|
| 7 | Add Toggle row in `frontend/components/ParameterPanel.tsx` above threshold `NumericParamRow` | Insert `<Toggle enabled={params.auto_threshold ?? false} onChange={(v) => handleImageParamChange({ auto_threshold: v })} label={t('params.autoThreshold')} />` as a new row before the threshold parameter. | ⬜ |
| 8 | Apply `disabled` prop to threshold `NumericParamRow` | Edit threshold `NumericParamRow` to receive `disabled={disabled || (params.auto_threshold ?? false)}` so both the `<input type="range">` and `<input type="number">` become non-interactive when auto is ON. | ⬜ |
| 9 | Add optional `disabled` prop to `frontend/components/Toggle.tsx` | Edit Toggle component to accept `disabled?: boolean` prop; when true, the button does not respond to click and visually reflects the disabled state; keeps `role="switch"` and `aria-checked` accessibility. | ⬜ |
| 10 | Verify Toggle with disabled prop renders correctly | Run `npm run lint` in frontend — no new lint errors; manual inspection of the rendered switch when `disabled` is true/false. | ⬜ |

### Phase 4: Frontend — i18n dictionaries

| # | Task | Definition | Done? |
|---|------|-----------|-------|
| 11 | Add i18n keys to `frontend/lib/i18n/dictionaries/en.ts` and `es.ts` | Add `'params.autoThreshold': 'Auto threshold' / 'Umbral automático'` and `'params.autoThreshold.tooltip': 'Let the fuzzy controller pick the Canny threshold automatically.' / 'Deja que el controlador difuso elija el umbral de Canny automáticamente.'` | ⬜ |

### Phase 5: Frontend — Presets reset auto_threshold

| # | Task | Definition | Done? |
|---|------|-----------|-------|
| 12 | Modify `frontend/lib/presets.ts` so applying a preset resets `auto_threshold` to false | In the preset application handler, ensure `auto_threshold` is set to `false` before merging the preset's threshold value, so the preset takes effect predictably. | ⬜ |

### Phase 6: Integration verification

| # | Task | Definition | Done? |
|---|------|-----------|-------|
| 13 | End-to-end manual walkthrough | Walk through each spec scenario: (a) switch OFF → slider draggable, request sends `auto_threshold: false`, backend honors threshold; (b) switch ON → slider blocked (disabled), request sends `auto_threshold: true`, backend uses fuzzy threshold; (c) default load → switch OFF, slider enabled; (d) panel disabled during upload → toggle does not change state; (e) preset applied while auto ON → `auto_threshold` resets to false, preset threshold takes effect. | ⬜ |

## Executive Summary

- **Backend verification**: 4 tasks, all passing (116 tests, ruff clean, serializer 400, endpoint contracts). No new backend work; only validation.
- **Frontend UI**: 9 tasks for the auto-threshold switch (types, ParameterPanel toggle, disabled prop on Toggle, NumericParamRow blocking, i18n in en/es, presets reset). These are new implementation tasks.
- **Integration**: 1 manual end-to-end walkthrough task to verify all spec scenarios.
- **Key decision**: The frontend changes are entirely additive and opt-in; default `auto_threshold: false` preserves byte-identical legacy behavior. The Toggle reuses the existing `Toggle.tsx` component with a minimal `disabled` prop addition. No API changes needed — `params` JSON serialization carries the field automatically.
- **Risks mitigated**: Toggle disabled prop prevents UX inconsistency during upload; presets reset auto_threshold for predictable behavior; blocking both slider inputs (range + number) ensures the user cannot manually override when auto is ON.

## Next Recommended

`apply` — implement the frontend tasks (5–13) and run verification. Backend already done.

## Skill Resolution

paths-injected