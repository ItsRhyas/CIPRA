# Design: Improve G-Code Output

## Technical Approach

Fix the phantom-line bug by preserving per-path boundaries from `simplify` through `format_gcode`, wire four dead parameters (`scale`, `threshold`, `travel_speed`, `draw_speed`) into the pipeline, remove two dead fields (`tool_offset_mm`, `origin`), reconcile `simplify_tolerance` defaults, and add frontend tooltips. The formatter already accepts nested paths — the fix is upstream.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| F-code emission trigger | (A) Always emit when speed > 0 (B) `Optional[float]` default None, emit only when set | (A) simpler but breaks golden fixtures; (B) preserves backward compat, explicit intent | **B** — `travel_speed` and `draw_speed` become `Optional[float] = None` |
| Scale application point | (A) In `simplify.py` after mm conversion (B) In formatter before clamping | (A) keeps scaling in the coordinate domain; (B) mixes concerns | **A** — multiply mm coords by `scale` in `simplify.py` |
| Threshold wiring | (A) Pass through `edges()` signature (B) Store in `ScaraConfig` | (A) explicit data flow; (B) couples machine config to image processing | **A** — add `threshold` param to `edges()` |
| Frontend tooltip mechanism | (A) HTML `title` attribute (B) Custom CSS tooltip component | (A) zero-dependency, native; (B) more control but adds complexity | **A** — `title` attribute on `<label>` elements |

## Data Flow

### Before (flat — phantom lines)

```
simplify → StageResult.data = [(x,y), (x,y), (x,y), ...]   ← flat
                ↓
orchestrator._extract_coordinates → [(x,y), ...]             ← flat
                ↓
PipelineOutput.coordinates = [(x,y), ...]                    ← flat
                ↓
views._coordinates_to_paths → [[(x,y), ...]]                 ← ONE path (bug!)
                ↓
format_gcode → G0 first → M3 → G1...G1 → M5                 ← single block
```

### After (nested — boundaries preserved)

```
simplify → StageResult.data = [[(x,y),(x,y)], [(x,y),(x,y),(x,y)]]  ← nested
                ↓
orchestrator._extract_coordinates → [[(x,y),...], [(x,y),...]]       ← nested
                ↓
PipelineOutput.coordinates = [[(x,y),...], [(x,y),...]]              ← nested
                ↓
views passes directly to format_gcode (no _coordinates_to_paths)
                ↓
format_gcode → G0→M3→G1→M5  G0→M3→G1→G1→M5                        ← per-path blocks
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/pipeline/types.py:84` | Modify | `coordinates: list[list[tuple[float, float]]]`; `simplify_tolerance` default → `1.0` |
| `backend/pipeline/simplify.py:86-93` | Modify | Return `list[list[...]]` (nested); add `scale` param; apply scale in mm conversion |
| `backend/pipeline/orchestrator.py:49,57,72-86` | Modify | Pass `threshold` to `edges()`; pass `scale` to `simplify()`; `_extract_coordinates` preserves nesting |
| `backend/pipeline/edges.py:13,36` | Modify | Add `threshold: int = 50` param; `Canny(image, threshold, min(threshold * 2, 255))` |
| `backend/jobs/views.py:45,85-91` | Modify | Remove `_coordinates_to_paths`; pass `pipeline_output.coordinates` directly |
| `backend/gcode/config.py:8-21` | Modify | `travel_speed: Optional[float] = None`; `draw_speed: Optional[float] = None`; remove `tool_offset_mm`, `origin` |
| `backend/gcode/formatter.py:72,78` | Modify | Emit `F{speed}` on G0/G1 lines when speed is not None |
| `backend/jobs/serializers.py:60-68` | Modify | Remove `tool_offset_mm`/`origin` from `scara_data` passthrough |
| `shared/api-contract.json` | Modify | Remove `tool_offset_mm`, `origin` from `ScaraConfig`; update example |
| `frontend/components/ParameterPanel.tsx` | Modify | Add `title` attribute to each `<label>` with behavior description |
| `backend/tests/fixtures/simple_path.gcode` | Modify | No change (no F-codes with default None config) |
| `backend/tests/fixtures/multi_path.gcode` | Modify | No change (no F-codes with default None config) |

## Interfaces / Contracts

### Changed signatures

```python
# types.py — PipelineOutput
@dataclass
class PipelineOutput:
    coordinates: list[list[tuple[float, float]]] = field(default_factory=list)  # was: list[tuple[float, float]]

# types.py — ConvertParams
@dataclass
class ConvertParams:
    simplify_tolerance: float = 1.0  # was: 2.0

# config.py — ScaraConfig
@dataclass
class ScaraConfig:
    work_area_w_mm: float = 210.0
    work_area_h_mm: float = 297.0
    travel_speed: float | None = None   # was: float = 3000.0
    draw_speed: float | None = None     # was: float = 1500.0
    # tool_offset_mm: REMOVED
    # origin: REMOVED

# edges.py — edges()
def edges(image: NDArray, threshold: int = 50) -> StageResult:
    # Canny(image, threshold, min(threshold * 2, 255))

# simplify.py — simplify()
def simplify(
    contours: list[list[tuple[float, float]]],
    config: ScaraConfig,
    tolerance: float = 2.0,
    image_shape: tuple[int, ...] = (0, 0),
    scale: float = 1.0,  # NEW
) -> StageResult:
    # mm_x = px * scale_x * scale
    # mm_y = (config.work_area_h_mm - (py * scale_y)) * scale

# orchestrator.py — _extract_coordinates()
def _extract_coordinates(data: object) -> list[list[tuple[float, float]]]:
    # Preserves nesting: returns list of paths, not flat list
```

### F-code line format

```
G0 X10.50 Y20.00 F3000     ← travel_speed on rapid moves
G1 X10.50 Y20.00 F1500     ← draw_speed on drawing moves
```

F-code appended after coordinates on every G0/G1 line when the speed is not None. Integer formatting (no decimals) for F values.

## Frontend: ParameterPanel Tooltips

Add `title` to each `<label>`:

| Parameter | Tooltip text |
|-----------|-------------|
| Scale | "Multiplies output coordinates. Higher values enlarge the drawing." |
| Threshold | "Edge detection sensitivity. Lower values detect more edges (denser paths)." |
| Simplify tolerance | "Contour simplification strength. Higher values produce fewer points (smoother paths)." |
| Variant | "Processing quality preset. Fast is quicker, detailed is more accurate." |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `simplify` returns nested paths | Update `test_simplify_returns_stage_result_with_coordinates` — assert `result.data` is `list[list[tuple]]` |
| Unit | `_extract_coordinates` preserves nesting | New test with nested input → nested output |
| Unit | `edges` uses threshold param | New test: `edges(img, threshold=100)` produces different output than default |
| Unit | Formatter emits F-codes | New test: `format_gcode(paths, ScaraConfig(travel_speed=3000, draw_speed=1500))` → F-codes present |
| Unit | Formatter omits F-codes when None | Existing golden tests pass unchanged (default None → no F-codes) |
| Unit | `ScaraConfig` defaults | Update `test_default_scara_config_a4_defaults` — remove `tool_offset_mm`/`origin`, assert speeds are None |
| Integration | Orchestrator end-to-end | Update `test_orchestrator_returns_pipeline_output` — assert `output.coordinates` is nested |
| Integration | Scale wiring | New test: `scale=2.0` doubles coordinates vs `scale=1.0` |
| Integration | Threshold wiring | New test: orchestrator with `threshold=200` produces different edge count |

### Tests requiring updates

| Test | Current assertion | Required change |
|------|-------------------|-----------------|
| `test_pipeline.py:74` | `all(isinstance(point, tuple)...)` on flat list | Assert nested: `all(isinstance(p, list) for p in result.data)` |
| `test_pipeline.py:92` | `all(isinstance(coord, tuple)...)` on `output.coordinates` | Assert nested structure |
| `test_pipeline.py:131-132` | `len(result.data)` vertex count on flat | Access `result.data[0]` for first path |
| `test_pipeline.py:142` | `result.data[0]` unpacks as `(x, y)` tuple | `result.data[0][0]` for first point of first path |
| `test_pipeline.py:154-155` | `top_left.data[0]` is tuple | `top_left.data[0][0]` |
| `test_pipeline.py:166` | `first.data == second.data` | Still valid (nested equality) |
| `test_formatter.py:22-27` | Asserts `tool_offset_mm`, `origin`, `travel_speed==3000`, `draw_speed==1500` | Remove offset/origin; assert speeds are None |

## Migration / Rollout

No data migration. The `ScaraConfig` type change (`Optional[float]`) is backward-compatible for deserialization — existing JSON with numeric speeds deserializes correctly. Frontend sending `tool_offset_mm`/`origin` is silently ignored by `ScaraConfig(**scara_data)` since DRF passes only known kwargs... actually `**scara_data` would fail with unexpected kwargs. Mitigation: filter `scara_data` to known fields before constructing `ScaraConfig`.

## Open Questions

- [ ] Should `edges()` threshold default stay at 50 (current hardcoded) or change to 127 (serializer default)? Recommendation: keep 50 as function default, let the orchestrator pass the user's value.
