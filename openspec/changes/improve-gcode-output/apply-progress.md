# Apply Progress: Improve G-Code Output — PR #2

## Change
improve-gcode-output

## PR
PR #2 of 3 — Parameter Wiring + Removal + F-codes

## Delivery
- Strategy: force-chained
- Chain strategy: stacked-to-main
- This work unit: backend parameter wiring, dead-field removal, F-code emission, serializer/API contract updates
- Out of scope for PR #2: frontend type/default sync (task 2.9), frontend tooltips (PR #3)

## Completed Tasks

- [x] 1.1 `backend/pipeline/types.py`: changed `PipelineOutput.coordinates` to `list[list[tuple[float, float]]]`; updated docstring; changed `ConvertParams.simplify_tolerance` default from `2.0` to `1.0`.
- [x] 1.2 `backend/pipeline/simplify.py`: return nested `list[list[tuple[float, float]]]` in `StageResult.data`; applied pixel-to-mm conversion per-path while preserving contour boundaries.
- [x] 1.3 `backend/pipeline/orchestrator.py`: `_extract_coordinates` now returns `list[list[tuple[float, float]]]` and preserves nested path structure.
- [x] 1.4 `backend/jobs/views.py`: removed `_coordinates_to_paths`; `format_gcode()` receives `pipeline_output.coordinates` directly.
- [x] 1.5 `backend/tests/test_pipeline.py`: updated assertions for nested coordinates; added `test_extract_coordinates_preserves_nested_paths`.
- [x] 2.1 `backend/pipeline/edges.py`: added `threshold: int = 50` parameter; `cv2.Canny` now uses `threshold` and `min(threshold * 2, 255)`.
- [x] 2.2 `backend/pipeline/orchestrator.py`: `edges()` receives `params.threshold`.
- [x] 2.3 `backend/pipeline/simplify.py`: added `scale: float = 1.0` parameter; mm coordinates are multiplied by `scale`.
- [x] 2.4 `backend/pipeline/orchestrator.py`: `simplify()` receives `params.scale`.
- [x] 2.5 `backend/gcode/config.py`: removed `tool_offset_mm` and `origin`; `travel_speed`/`draw_speed` are now `Optional[float] = None`.
- [x] 2.6 `backend/gcode/formatter.py`: `format_gcode()` accepts `travel_speed`/`draw_speed`; appends `F{speed}` to G0/G1 lines only when speeds are not None.
- [x] 2.7 `backend/jobs/serializers.py`: filters `scara_data` to known `ScaraConfig` fields; old fields like `tool_offset_mm`/`origin` are silently dropped.
- [x] 2.8 `shared/api-contract.json`: removed `tool_offset_mm`/`origin` from `ScaraConfig`; `travel_speed`/`draw_speed` default to null; updated scale/threshold descriptions.
- [ ] 2.9 Frontend type/default sync skipped per PR boundary — no frontend changes in this work unit.
- [x] 2.10 `backend/tests/test_formatter.py` and `backend/tests/test_pipeline.py`: updated `ScaraConfig` defaults test; added F-code emission/omission tests, threshold wiring test, and scale wiring tests.

## Verification

- `pytest backend` — 37 passed
- `ruff check backend` — all checks passed
- `simplify_tolerance` default is `1.0` in `types.py`, serializer, and API contract

## Files Changed

| File | Action |
|------|--------|
| `backend/pipeline/edges.py` | Wired `threshold` parameter |
| `backend/pipeline/orchestrator.py` | Pass `params.threshold` and `params.scale` |
| `backend/pipeline/simplify.py` | Wired `scale` parameter |
| `backend/gcode/config.py` | Removed dead fields; made speeds optional |
| `backend/gcode/formatter.py` | Optional F-code emission |
| `backend/jobs/views.py` | Pass speeds from `ScaraConfig` to formatter |
| `backend/jobs/serializers.py` | Filter scara fields; wire params |
| `shared/api-contract.json` | Remove dead fields; update descriptions |
| `backend/tests/test_formatter.py` | Update defaults; add F-code tests |
| `backend/tests/test_pipeline.py` | Add threshold/scale wiring tests |
| `openspec/changes/improve-gcode-output/tasks.md` | Mark PR #2 tasks complete |

## Deviations from Design

- F-code values are formatted with `_fmt()` (two decimal places) as specified in the user's task description (`F{fmt(speed)}`), rather than the integer formatting mentioned in `design.md`. The golden fixtures are unaffected because default speeds are `None`.
- Threshold wiring is verified by capturing the arguments passed to `cv2.Canny`, rather than comparing edge-pixel counts on a synthetic image, because the fixture image is high-contrast and produces identical edge counts for the tested threshold pairs.
- Scale wiring is verified by asserting coordinates are doubled; threshold wiring is verified separately to keep the test deterministic.

## Issues Found

None.

## Remaining Work

- PR #2 task 2.9 (frontend type/default sync) — deferred; no frontend files changed in this work unit.
- PR #3: ParameterPanel tooltips.

## Status

10/10 PR #2 backend tasks complete (1 frontend task intentionally skipped). Ready for verify.
