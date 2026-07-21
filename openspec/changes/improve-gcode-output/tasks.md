# Tasks: Improve G-Code Output

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated total changed lines | 280–350 |
| Per PR estimated lines | PR1 ~110; PR2 ~170; PR3 ~30 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | PR | Notes |
|------|------|----|-------|
| 1 | Preserve path boundaries | PR1 | Backend core; golden fixtures unchanged |
| 2 | Wire/remove parameters + F-codes | PR2 | Pipeline, config, serializer, contract |
| 3 | Frontend tooltips | PR3 | No backend changes |

## Phase 1: Preserve Path Boundaries (PR #1)

- [x] 1.1 [BACKEND] `backend/pipeline/types.py`: change `PipelineOutput.coordinates` to `list[list[tuple[float, float]]]` and set `simplify_tolerance` default to `1.0`. Acceptance: type matches design; defaults tests pass.
- [x] 1.2 [BACKEND] `backend/pipeline/simplify.py`: return nested `ordered_paths` in `StageResult.data` instead of flattening. Acceptance: `test_pipeline.py` asserts `list[list[tuple]]`.
- [x] 1.3 [BACKEND] `backend/pipeline/orchestrator.py`: make `_extract_coordinates` preserve nested paths and return `list[list[tuple]]`. Acceptance: new unit test passes for nested input.
- [x] 1.4 [BACKEND] `backend/jobs/views.py`: remove `_coordinates_to_paths` and pass `pipeline_output.coordinates` directly to `format_gcode`. Acceptance: end-to-end output shows G0 between disconnected contours.
- [x] 1.5 [TEST] `backend/tests/test_pipeline.py`: update assertions for nested structure and add an `_extract_coordinates` nesting test. Acceptance: pipeline test suite passes.

## Phase 2: Parameter Wiring and Removal (PR #2)

- [x] 2.1 [BACKEND] `backend/pipeline/edges.py`: add `threshold: int = 50` parameter and call `cv2.Canny(image, threshold, min(threshold * 2, 255))`. Acceptance: threshold and high-clip tests pass.
- [x] 2.2 [BACKEND] `backend/pipeline/orchestrator.py`: pass `params.threshold` to `edges()`. Acceptance: orchestrator with `threshold=200` produces different edges than default.
- [x] 2.3 [BACKEND] `backend/pipeline/simplify.py`: add `scale: float = 1.0` parameter and multiply mm coordinates by `scale`. Acceptance: `scale=2.0` doubles coordinates vs `scale=1.0`.
- [x] 2.4 [BACKEND] `backend/pipeline/orchestrator.py`: pass `params.scale` to `simplify()`. Acceptance: integration test passes.
- [x] 2.5 [BACKEND] `backend/gcode/config.py`: make `travel_speed` and `draw_speed` `Optional[float] = None`; remove `tool_offset_mm` and `origin`. Acceptance: defaults test updated.
- [x] 2.6 [BACKEND] `backend/gcode/formatter.py`: append `F{speed}` to G0/G1 lines when the corresponding speed is not None. Acceptance: new test shows F-codes; existing golden fixtures unchanged.
- [x] 2.7 [BACKEND] `backend/jobs/serializers.py`: filter `scara_data` to known `ScaraConfig` fields and drop removed fields. Acceptance: requests with old fields still validate.
- [x] 2.8 [CONFIG] `shared/api-contract.json`: remove `tool_offset_mm`/`origin` from `ScaraConfig`; update `travel_speed`/`draw_speed` defaults to optional/null and descriptions. Acceptance: schema validates.
- [ ] 2.9 [CONFIG] `frontend/lib/types.ts` and `frontend/lib/scara-defaults.ts`: sync removed fields and default `simplify_tolerance` to `1.0`. Acceptance: frontend type-check passes.
- [x] 2.10 [TEST] `backend/tests/test_formatter.py`: update defaults test; add F-code emission/omission tests. Acceptance: formatter test suite passes.

## Phase 3: Frontend Tooltips (PR #3)

- [ ] 3.1 [FRONTEND] `frontend/components/ParameterPanel.tsx`: add `title` attributes to each `<label>` with behavior descriptions from `api-contract.json`. Acceptance: hover tooltips appear; no UI overlap.
- [ ] 3.2 [TEST] `frontend/components/ParameterPanel.test.tsx` (or equivalent): assert tooltip text is present on each label. Acceptance: frontend test passes.

## Verification

- [ ] `pytest backend/tests/test_pipeline.py backend/tests/test_formatter.py` passes.
- [ ] Frontend tests/lint for `ParameterPanel` pass.
- [ ] Manual G-Code inspection confirms no phantom lines between disconnected contours.
