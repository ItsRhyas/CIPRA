# Verify Report: improve-gcode-output

**Verifier**: sdd-verify (sub-agent)
**Date**: 2026-07-21
**Scope**: PR #1 (path boundaries) + PR #2 (parameter wiring, removal, F-codes) — combined backend verification
**Status**: **PASS** (with minor observations)

---

## Executive Summary

All 37 tests pass (0.37s), `ruff check backend` passes cleanly, and all spec requirements from all three domains (gcode-path-structure, pipeline-params, parameter-tooltips-backend) are met by the source code. Two minor findings are noted but do not block verification.

---

## Detailed Checks

### 1. Scale Wiring (ADDED — pipeline-params)

| Check | Result | Evidence |
|-------|--------|----------|
| `simplify()` accepts `scale` param | PASS | `simplify.py:16` — `scale: float = 1.0` |
| `scale` multiplies mm coordinates | PASS | `simplify.py:92-93` — `mm_x = px * scale_x * scale`, `mm_y = ... * scale` |
| Orchestrator passes `params.scale` | PASS | `orchestrator.py:62` — `params.scale` as 5th arg to `simplify()` |
| Scale wiring test exists | PASS | `test_pipeline.py:235-249` — `test_simplify_scale_doubles_output_coordinates` |
| Orchestrator scale integration test | PASS | `test_pipeline.py:252-271` — `test_orchestrator_wires_scale` |

### 2. Threshold Wiring (ADDED — pipeline-params)

| Check | Result | Evidence |
|-------|--------|----------|
| `edges()` accepts `threshold` with default 50 | PASS | `edges.py:13` — `edges(image, threshold: int = 50)` |
| `cv2.Canny` uses `threshold, min(threshold*2, 255)` | PASS | `edges.py:37` — `cv2.Canny(image, threshold, min(threshold * 2, 255))` |
| Orchestrator passes `params.threshold` | PASS | `orchestrator.py:49` — `edges(result.data, params.threshold)` |
| Threshold wiring test | PASS | `test_pipeline.py:210-232` — `test_edges_uses_provided_threshold` (monkeypatches Canny, asserts (75, 150)) |
| Orchestrator threshold integration test | PASS | `test_pipeline.py:274-287` — `test_orchestrator_wires_threshold` |

### 3. F-Code Emission (ADDED — pipeline-params)

| Check | Result | Evidence |
|-------|--------|----------|
| ScaraConfig speeds are Optional[float] = None | PASS | `config.py:25-26` — `travel_speed: Optional[float] = None`, `draw_speed: Optional[float] = None` |
| `format_gcode()` accepts travel_speed/draw_speed | PASS | `formatter.py:48-49` — `travel_speed: Optional[float] = None, draw_speed: Optional[float] = None` |
| F-codes appended to G0 lines | PASS | `formatter.py:80` — `f"G0 X{_fmt(first_x)} Y{_fmt(first_y)}{travel_f}"` |
| F-codes appended to G1 lines | PASS | `formatter.py:86` — `f"G1 X{_fmt(x)} Y{_fmt(y)}{draw_f}"` |
| F-codes omitted when speeds are None | PASS | `formatter.py:72-73` — conditional `if travel_speed is not None` / `if draw_speed is not None` |
| views.py passes speeds to formatter | PASS | `views.py:48-49` — `travel_speed=scara_config.travel_speed, draw_speed=scara_config.draw_speed` |
| Test: F-codes emitted when set | PASS | `test_formatter.py:79-94` — asserts `F3000.00` / `F1500.00` in output |
| Test: F-codes omitted when None | PASS | `test_formatter.py:97-103` — asserts `"F" not in result.gcode` + golden match |
| Golden fixtures unchanged (no F-codes) | PASS | `simple_path.gcode` and `multi_path.gcode` have no F-codes (default speeds are None) |

### 4. simplify_tolerance Default (MODIFIED — pipeline-params)

| Check | Result | Evidence |
|-------|--------|----------|
| `types.py` default is 1.0 | PASS | `types.py:17` — `simplify_tolerance: float = 1.0` |
| Serializer default is 1.0 | PASS | `serializers.py:77` — `simplify_tolerance=data.get("simplify_tolerance", 1.0)` |
| API contract default is 1.0 | PASS | `api-contract.json:55` — `"default": 1.0` |

### 5. tool_offset_mm Removed (REMOVED — pipeline-params)

| Check | Result | Evidence |
|-------|--------|----------|
| Not in `ScaraConfig` | PASS | `config.py:9-26` — no `tool_offset_mm` field |
| Serializer filters it out | PASS | `serializers.py:62-72` — `known_scara_fields` excludes `tool_offset_mm`; unknown keys silently dropped via `filtered_scara` |
| Not in API contract | PASS | `api-contract.json ScaraConfig` — no `tool_offset_mm` property; `additionalProperties: false` |
| Test assertions removed | PASS | `test_formatter.py:18-25` — no `tool_offset_mm` assertion |

### 6. origin Removed (REMOVED — pipeline-params)

| Check | Result | Evidence |
|-------|--------|----------|
| Not in `ScaraConfig` | PASS | `config.py:9-26` — no `origin` field |
| Serializer filters it out | PASS | `serializers.py:62-72` — `known_scara_fields` excludes `origin` |
| Not in API contract | PASS | `api-contract.json ScaraConfig` — no `origin` property; `additionalProperties: false` |
| Test assertions removed | PASS | `test_formatter.py:18-25` — no `origin` assertion |

### 7. Path Boundary Preservation (ADDED — gcode-path-structure, PR #1)

| Check | Result | Evidence |
|-------|--------|----------|
| `PipelineOutput.coordinates` type is `list[list[tuple[float, float]]]` | PASS | `types.py:89` |
| `_extract_coordinates` preserves nesting | PASS | `orchestrator.py:76-91` — iterates outer list, inner list, returns `list[list[tuple]]` |
| views.py passes coordinates directly | PASS | `views.py:45-46` — `pipeline_output.coordinates` passed directly (no `_coordinates_to_paths`) |
| Nested assertions in tests | PASS | `test_pipeline.py:74` — `all(isinstance(path, list) for path in result.data)`; `test_pipeline.py:97` — same for output.coordinates |
| `test_extract_coordinates_preserves_nested_paths` | PASS | `test_pipeline.py:117-122` — verifies round-trip through _extract_coordinates |
| Golden multi-path test passes | PASS | `test_formatter.py:38-47` — `test_format_gcode_multiple_paths` matches `multi_path.gcode` fixture |
| Empty contours produce preamble + warning | PASS | `test_formatter.py:50-55` — `test_format_gcode_empty_paths` |

---

## Test & Lint Results

| Check | Result | Detail |
|-------|--------|--------|
| `pytest backend -v` | **PASS** | 37 passed in 0.37s |
| `ruff check backend` | **PASS** | All checks passed |
| F-code emission tests | PASS | 2 tests: `test_format_gcode_emits_f_codes_when_speeds_provided`, `test_format_gcode_omits_f_codes_when_speeds_none` |
| Threshold wiring tests | PASS | 2 tests: `test_edges_uses_provided_threshold`, `test_orchestrator_wires_threshold` |
| Scale wiring tests | PASS | 2 tests: `test_simplify_scale_doubles_output_coordinates`, `test_orchestrator_wires_scale` |
| Removed field assertions gone | PASS | No `tool_offset_mm` or `origin` in any test file |

---

## Findings

### WARNING: None

### SUGGESTION: F-code decimal format vs spec scenario

The spec scenario says "every `G0` line carries `F3000`" (integer), but the implementation uses `_fmt()` formatting producing `F3000.00`. The design.md says "Integer formatting (no decimals) for F values" on line 115. The apply-progress notes this was a deliberate choice: "F-code values are formatted with `_fmt()` (two decimal places) as specified in the user's task description."

**Impact**: None. G-code parsers accept both `F3000` and `F3000.00`. Golden fixtures are unaffected because default speeds are `None`. All tests pass.

**Recommendation**: If integer-only F-codes are desired, change `_fmt(travel_speed)` to `f"{travel_speed:.0f}"` in `formatter.py:72-73`. If the spec scenario text should match implementation, update the scenario to read `F3000.00`.

### SUGGESTION: `balanced` variant not in API contract enum

The `api-contract.json` `ConvertParams.properties.variant.enum` only lists `["fast", "detailed"]`, but `types.py` has `variant: str = "balanced"` and the serializer accepts `"balanced"`. This is a pre-existing inconsistency not part of this change's scope but worth noting.

---

## Artifacts

- **Engram**: `sdd/improve-gcode-output/verify-report` (topic_key upsert)
- **OpenSpec**: `openspec/changes/improve-gcode-output/verify-report.md`

## Next Recommendation

**`sdd-archive`** — All PR #1 and PR #2 backend tasks are verified complete. Ready for archiving.

## Risks

None. All spec requirements are met, tests pass, lint is clean.

## Skill Resolution

`paths-injected` — orchestrator injected skill paths in the launch prompt.
