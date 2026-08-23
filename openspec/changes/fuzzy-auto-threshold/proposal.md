# Proposal: Fuzzy Auto-Threshold Selection

## Intent

Add an opt-in Mamdani fuzzy inference engine that automatically selects the Canny edge-detection threshold from image statistics (contrast + edge density). The feature is already implemented and tested (116 backend tests pass, ruff clean). This proposal formalizes the existing implementation for the SDD pipeline.

**Academic motivation**: Places the project under Unit V (Fuzzy Logic) of the AI course syllabus — membership functions, linguistic variables, SI-ENTONCES rules, centroid defuzzification.

## Scope

### In Scope
- Hand-rolled pure-NumPy Mamdani fuzzy controller (`backend/pipeline/fuzzy_threshold.py`, 308 lines)
- Opt-in via `ConvertParams.auto_threshold` (default `False`); legacy pipeline byte-identical when off
- Integration: preprocess stores grayscale, orchestrator runs fuzzy stage when enabled, serializer validates bool, views emit `meta.fuzzy`
- API contract update (`shared/api-contract.json`): `auto_threshold` param, `meta.fuzzy` response, `threshold` description, `variant` enum
- 21 new unit/integration tests + 3 new HTTP-level tests
- Frontend auto-threshold switch (`frontend/components/Toggle.tsx` reused): `auto_threshold?: boolean` in `ConvertParams` types, switch row in `ParameterPanel` that blocks the threshold slider (range + number inputs) when enabled, i18n keys in both `en.ts` and `es.ts` dictionaries, presets reset `auto_threshold` to false for predictable behavior

### Out of Scope
- `meta.fuzzy` explainer UI — deferred follow-up
- scikit-fuzzy dependency (incompatible with numpy 2.5.1)

## Capabilities

### New Capabilities
- `fuzzy-auto-threshold`: Mamdani fuzzy controller for automatic Canny threshold selection. Covers membership functions (trimf/trapmf), 9 SI-ENTONCES rules, centroid defuzzification, four exposed inference stages for classroom demonstration, diagnostics contract (`meta.fuzzy`).

### Modified Capabilities
- `pipeline-params`: Adds `auto_threshold: bool = False` to `ConvertParams`; adds `fuzzy_meta: dict | None` to `PipelineOutput`; updates `threshold` description to note it is ignored when `auto_threshold` is true.

## Approach

Pure NumPy + stdlib implementation. Four Mamdani stages exposed as separate methods (`fuzzify`, `evaluate_rules`, `aggregate`, `defuzzify`) for classroom demonstration. Inputs: contrast and edge density on 0-100 universe. Output: threshold on 0-255. `compute_image_stats` extracts statistics from grayscale; `fuzzy_auto_threshold` chains stats → controller → `FuzzyThresholdResult`. Integration via orchestrator conditional stage insertion.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/pipeline/fuzzy_threshold.py` | New | Mamdani fuzzy controller (308 lines) |
| `backend/pipeline/types.py` | Modified | `ConvertParams.auto_threshold`, `PipelineOutput.fuzzy_meta` |
| `backend/pipeline/preprocess.py` | Modified | Stores grayscale in `meta["grayscale"]` |
| `backend/pipeline/orchestrator.py` | Modified | Conditional fuzzy stage + `fuzzy_meta` propagation |
| `backend/jobs/serializers.py` | Modified | Bool validation for `auto_threshold` |
| `backend/jobs/views.py` | Modified | Conditional `meta.fuzzy` in response |
| `shared/api-contract.json` | Modified | `auto_threshold`, `meta.fuzzy`, threshold description, variant enum |
| `backend/tests/test_fuzzy_threshold.py` | New | 21 unit/integration tests |
| `backend/tests/test_api.py` | Modified | 3 HTTP-level tests |
| `frontend/lib/types.ts` | Modified | `auto_threshold?: boolean` in `ConvertParams` |
| `frontend/components/ParameterPanel.tsx` | Modified | Switch row + slider blocking when enabled |
| `frontend/lib/i18n/dictionaries/en.ts` | Modified | `params.autoThreshold` keys |
| `frontend/lib/i18n/dictionaries/es.ts` | Modified | `params.autoThreshold` keys |
| `frontend/lib/presets.ts` | Modified | Presets reset `auto_threshold` to false |
| `frontend/components/Toggle.tsx` | Modified | Optional `disabled` prop if needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Numerical edge cases in defuzzify (zero mass) | Low | Returns 0; orchestrator clips to [0,255]; blank-image test pins contract |
| API contract drift with frontend | Medium | Contract is source of truth; frontend types updated in this change |
| OpenCV missing + RGB fallback | Low | Graceful degradation tested; visual quality not asserted (acceptable) |

## Rollback Plan

Set `auto_threshold` default to `False` (already the default) or remove `fuzzy_threshold.py` entirely. The legacy pipeline path is untouched — `auto_threshold=False` produces identical `stages_run` and no `fuzzy_meta`.

## Dependencies

- None (pure NumPy + stdlib; no new packages)

## Success Criteria

- [x] 116 backend tests pass (ruff clean)
- [x] `auto_threshold=False` preserves legacy behavior (byte-identical stages_run)
- [x] `auto_threshold=True` runs fuzzy stage and returns `meta.fuzzy` with expected keys
- [x] API contract updated with `auto_threshold` and `meta.fuzzy`
- [x] Serializer rejects non-boolean values with 400
- [ ] Frontend switch toggles `auto_threshold`; threshold slider blocks when ON
- [ ] i18n keys added in both `en.ts` and `es.ts`
- [ ] Presets reset `auto_threshold` to false when applied
