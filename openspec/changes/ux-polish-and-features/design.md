# Design: UX Polish and Features

## Technical Approach

Six independent UX features layered onto the existing CIPRA pipeline. Each feature is self-contained with no cross-dependencies, enabling chained PR delivery. Backend adds rotate/invert as a preprocessing stage; frontend adds auto-preview, copy feedback, work area config, image type presets, and real-time toggle with debounce/abort.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|--------|----------|--------|
| Where to manage preview URL | `useConvert` hook (current) vs `page.tsx` useEffect | Hook couples preview to conversion; page decouples them so preview works without Convert | **page.tsx useEffect** |
| Rotation applied before or after grayscale | Before (on color) vs After (on gray) | Before preserves original pixel data for rotation interpolation; simpler to reason about as "physical transform first" | **Before grayscale** |
| Real-time toggle state persistence | localStorage vs ephemeral useState | Spec requires ephemeral (resets on reload); localStorage adds complexity for no benefit | **Ephemeral useState** |
| AbortController vs requestId only | AbortController only vs requestId only vs both | AbortController cancels network; requestId discards stale responses that completed before abort | **Both** — defense in depth |
| Image type preset tracking | useState vs useRef | useState triggers re-render needed for UI pill highlighting; useRef is invisible | **useState** with `'custom'` sentinel |
| Work area preset logic | Controlled select vs derived state | Derived state (W/H match preset → show it) is fragile; controlled select with explicit "Custom" switch is predictable | **Controlled select** — manual W/H edit sets "Custom" |

## Data Flow

### Backend: Rotate/Invert Pipeline

```
Input Image
    │
    ▼
┌──────────┐     ┌──────────┐     ┌────────────┐
│  Rotate   │────▶│  Invert  │────▶│  Grayscale │
│ (cv2.rotate)│   │(bitwise_not)│  │(cvtColor)  │
└──────────┘     └──────────┘     └────────────┘
                                       │
                                       ▼
                                 ┌──────────┐
                                 │   Blur   │
                                 │(Gaussian)│
                                 └──────────┘
                                       │
                                       ▼
                                 ┌──────────┐
                                 │ Threshold │  (balanced only)
                                 └──────────┘
```

Rotation codes: `0→skip`, `90→ROTATE_90_CLOCKWISE`, `180→ROTATE_180`, `270→ROTATE_90_COUNTERCLOCKWISE`. Validation: `rotation_deg ∉ {0,90,180,270}` → HTTP 400.

### Frontend: Auto-Preview URL Lifecycle

```
file selected ──▶ useEffect ──▶ URL.createObjectURL(file) ──▶ setImageUrl(url)
                                                              │
file changed  ──▶ cleanup ──▶ URL.revokeObjectURL(prev) ──────┘
                                                              │
file removed  ──▶ cleanup ──▶ URL.revokeObjectURL(prev) ──▶ setImageUrl(null)
```

`useConvert` loses `imageUrl` state entirely. `page.tsx` owns `imageUrl` and passes it to both `CanvasPreview` and the tab panel.

### Copy State Machine

```
         click + writeText resolves
  idle ──────────────────────────────▶ copied ──(1.5s timeout)──▶ idle
    │                                                                 ▲
    │         click + writeText rejects                               │
    └───────────────────────────────▶ error ───(1.5s timeout)────────┘

  Re-click during copied/error: clearTimeout(prev) → restart cycle
```

### Real-Time Debounce + Abort Flow

```
param change ──▶ [realtime ON?] ──yes──▶ clear prev timer
                                          │
                                     500ms timeout
                                          │
                                          ▼
                                   abort prev request (AbortController)
                                          │
                                   increment requestId
                                          │
                                   fetch(signal) ──▶ response
                                          │
                                   requestId === current? ──yes──▶ setResult
                                          │no
                                          ▼
                                      discard
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/pipeline/preprocess.py` | Modify | Add `rotation_deg=0, invert=False` params; rotate then invert before grayscale |
| `backend/pipeline/types.py` | Modify | Add `rotation_deg: int = 0` and `invert: bool = False` to `ConvertParams` |
| `backend/pipeline/orchestrator.py` | Modify | Pass `params.rotation_deg, params.invert` to `preprocess()` |
| `backend/jobs/serializers.py` | Modify | Parse `rotation_deg` and `invert` from JSON; validate rotation ∈ {0,90,180,270} |
| `shared/api-contract.json` | Modify | Add `rotation_deg` (int enum) and `invert` (bool) to `ConvertParams` schema |
| `frontend/app/page.tsx` | Modify | Auto-preview useEffect, `imageUrl` state, real-time debounce effect, `realtime` state |
| `frontend/hooks/useConvert.ts` | Modify | Remove `imageUrl`; add `AbortController` + `requestIdRef`; accept `signal` param |
| `frontend/lib/api.ts` | Modify | Accept optional `signal?: AbortSignal`; pass to `fetch`; return `null` on abort |
| `frontend/lib/types.ts` | Modify | Add `rotation_deg` and `invert` to `ConvertParams` |
| `frontend/lib/scara-defaults.ts` | Modify | Add `scara` block with A4 defaults and `rotation_deg: 0, invert: false` |
| `frontend/components/ParameterPanel.tsx` | Modify | Image type selector, work area section, rotate buttons, invert toggle |
| `frontend/components/GCodeOutput.tsx` | Modify | Copy feedback state machine with `aria-live="polite"` |
| `frontend/lib/presets.ts` | Create | `IMAGE_TYPE_PRESETS` config and `ImageType` type |
| `frontend/components/Toggle.tsx` | Create | Accessible CSS toggle switch (`role="switch"`, `aria-checked`) |

## Interfaces / Contracts

### Backend: ConvertParams extension

```python
@dataclass
class ConvertParams:
    scale: float = 1.0
    threshold: int = 127
    simplify_tolerance: float = 1.0
    variant: str = "balanced"
    scara: ScaraConfig | None = None
    rotation_deg: int = 0      # NEW: {0, 90, 180, 270}
    invert: bool = False       # NEW
```

### Frontend: presets.ts

```typescript
export type ImageType = 'photo' | 'line_art' | 'sketch' | 'text' | 'custom';

export const IMAGE_TYPE_PRESETS: Record<
  Exclude<ImageType, 'custom'>,
  Partial<ConvertParams & { variant: Variant }>
> = {
  photo:    { threshold: 100, simplify_tolerance: 2.0, variant: 'balanced', scale: 1.0 },
  line_art: { threshold: 180, simplify_tolerance: 0.5, variant: 'fast',    scale: 1.0 },
  sketch:   { threshold: 150, simplify_tolerance: 1.0, variant: 'balanced', scale: 1.0 },
  text:     { threshold: 200, simplify_tolerance: 0.3, variant: 'fast',    scale: 1.0 },
};
```

### API Contract additions

```json
"rotation_deg": {
  "type": "integer", "enum": [0, 90, 180, 270], "default": 0,
  "description": "Image rotation in degrees clockwise before processing."
},
"invert": {
  "type": "boolean", "default": false,
  "description": "Invert image colors before processing."
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (backend) | `preprocess()` with each rotation code + invert combos; invalid rotation raises `ValueError` | pytest with small numpy arrays; assert shape transforms and pixel inversion |
| Unit (backend) | Serializer rejects `rotation_deg=45` with `ValidationError` | pytest + DRF serializer validation |
| Integration | Full pipeline with rotation=90 + invert=True produces valid GCode | Existing orchestrator test pattern with new params |
| Frontend | No test infra exists | Manual verification per success criteria; `next build` passes |

## Migration / Rollout

No migration required. All new fields have backward-compatible defaults (`rotation_deg=0`, `invert=False`). Existing API clients that omit these fields get identical behavior.

## Open Questions

- [ ] Should the invert toggle show a live CSS filter preview on the image (e.g., `filter: invert(1)` on the `<img>`) or only affect the backend pipeline?
- [ ] Work area backend validation (W/H > 0) is out of scope — should we add it in this change or defer?
