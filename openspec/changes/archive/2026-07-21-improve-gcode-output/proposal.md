# Proposal: Improve G-Code Output

## Intent

The G-Code output contains phantom lines between disconnected contours because path boundaries are destroyed before reaching the formatter. Additionally, 6 of 11 declared parameters are dead code, and parameter defaults are inconsistent across the codebase. This change fixes the core G0/G1 classification bug, cleans up dead parameters, and adds per-field descriptions to the frontend.

## Scope

### In Scope
- Preserve path boundaries from `simplify` stage through to `format_gcode`
- Wire or remove 6 dead parameters (`scale`, `threshold`, `travel_speed`, `draw_speed`, `tool_offset_mm`, `origin`)
- Reconcile `simplify_tolerance` default to a single value across all layers
- Add brief, non-distracting parameter descriptions in the frontend (`ParameterPanel.tsx`)

### Out of Scope
- New pipeline stages or image processing algorithms
- Frontend UI redesign (only adding tooltips/helper text)
- Async processing or job queuing
- New image format support

## Capabilities

### New Capabilities
- `gcode-path-structure`: Preserves per-path boundaries from pipeline output through G-Code formatting

### Modified Capabilities
- `pipeline-params`: Converts dead parameters into either wired behavior or removes them; reconciles defaults

## Approach

**1. Preserve path boundaries**

Change `PipelineOutput.coordinates` from `list[tuple[float, float]]` to `list[list[tuple[float, float]]]`. In `simplify.py:86-91`, return nested paths instead of flattening. Remove `_coordinates_to_paths` hack in `views.py:85-91` — pass `pipeline_output.coordinates` directly to `format_gcode`.

**2. Wire or remove dead parameters**

| Parameter | Decision | Rationale |
|-----------|----------|-----------|
| `scale` | Wire to pipeline | Useful for output scaling |
| `threshold` | Wire to `preprocess` | Controls Canny edge detection |
| `travel_speed` | Wire to formatter | Emit `F` codes for G0 moves |
| `draw_speed` | Wire to formatter | Emit `F` codes for G1 moves |
| `tool_offset_mm` | Remove | No consumer; add later if robotics team needs it |
| `origin` | Remove | Only "bottom-left" is implemented; add when multi-origin needed |

**3. Reconcile defaults**

Pick `simplify_tolerance = 1.0` (matches API contract and serializer). Update `types.py` from 2.0 to 1.0.

**4. Frontend descriptions**

Add `title` attribute or subtle `<span>` tooltip to each parameter label in `ParameterPanel.tsx`. Descriptions sourced from `api-contract.json`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/pipeline/types.py:80-87` | Modified | `PipelineOutput.coordinates` type change |
| `backend/pipeline/simplify.py:86-91` | Modified | Return nested paths, not flat list |
| `backend/pipeline/orchestrator.py:72-86` | Modified | `_extract_coordinates` returns nested structure |
| `backend/jobs/views.py:45,85-91` | Modified | Remove `_coordinates_to_paths`, pass paths directly |
| `backend/gcode/formatter.py:44-82` | Modified | Accept optional speed params, emit F codes |
| `backend/gcode/config.py:8-21` | Modified | Remove `tool_offset_mm`, `origin` |
| `backend/jobs/serializers.py:50-68` | Modified | Drop removed fields, wire `threshold` |
| `shared/api-contract.json` | Modified | Remove dead fields, add F-code documentation |
| `frontend/components/ParameterPanel.tsx` | Modified | Add tooltip descriptions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing G-Code consumers | Medium | Golden tests in `test_formatter.py` already validate per-path structure |
| Frontend sends removed fields | Low | Serializer ignores unknown fields; graceful degradation |

## Rollback Plan

Revert the `PipelineOutput.coordinates` type change and restore `_coordinates_to_paths` in `views.py`. The formatter is unchanged in isolation — only the data shape feeding it changes.

## Dependencies

None — all changes are internal to the CIPRA codebase.

## Success Criteria

- [ ] G-Code output contains G0 for travel moves between disconnected contours
- [ ] No phantom lines when viewing output in external G-Code viewers
- [ ] All non-dead parameters affect output behavior
- [ ] `simplify_tolerance` default is 1.0 everywhere
- [ ] Frontend shows brief parameter descriptions without cluttering the UI
