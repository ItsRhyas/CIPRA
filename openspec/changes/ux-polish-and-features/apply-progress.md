# Apply Progress: UX Polish and Features

## Status

- PR #1 of 3 (stacked-to-main chain) complete.
- PR #2 of 3 (static frontend controls) complete.
- 12/12 Phase 1 + Phase 2 tasks done.
- `next build` in `frontend/` → compiled successfully, no TypeScript or lint errors.

## Completed Tasks

### Phase 1: Backend Pipeline

- [x] 1.1 Extend `backend/pipeline/types.py` `ConvertParams` with `rotation_deg: int = 0` and `invert: bool = False`.
- [x] 1.2 Update `backend/pipeline/preprocess.py` signature to accept `rotation_deg` and `invert`; apply `cv2.rotate` then `cv2.bitwise_not` before grayscale; raise `ValueError` for invalid rotation.
- [x] 1.3 Wire `rotation_deg` and `invert` through `backend/pipeline/orchestrator.py` into `preprocess()`.
- [x] 1.4 Parse and validate `rotation_deg`/`invert` in `backend/jobs/serializers.py`; reject non-enum rotation with HTTP 400.
- [x] 1.5 Add `rotation_deg` (enum 0/90/180/270) and `invert` (bool) fields to `shared/api-contract.json` `ConvertParams` schema.
- [x] 1.6 Add backend tests in `backend/tests/test_pipeline.py` and `backend/tests/test_api.py` covering each rotation, invert combos, invalid rotation rejection, and default behavior.

### Phase 2: Static Frontend Controls

- [x] 2.1 Add `rotation_deg` and `invert` to `frontend/lib/types.ts` `ConvertParams`; add `scara` block with A4 defaults and `rotation_deg`/`invert` defaults to `frontend/lib/scara-defaults.ts`.
- [x] 2.2 Create `frontend/lib/presets.ts` exporting `ImageType` and `IMAGE_TYPE_PRESETS` (photo, line_art, sketch, text) with threshold, simplify_tolerance, variant, and scale.
- [x] 2.3 Create accessible `frontend/components/Toggle.tsx` switch using `role="switch"`, `aria-checked`, and CSS only.
- [x] 2.4 Extend `frontend/components/ParameterPanel.tsx` with: image type selector (custom sentinel), collapsible work area section (presets + W/H + speeds), rotation buttons (0/90/180/270), invert toggle, and real-time toggle UI.
- [x] 2.5 Implement copy feedback state machine in `frontend/components/GCodeOutput.tsx`: "Copied!" / "Copy failed" for 1.5s, timeout cancellation on rapid clicks, `aria-live="polite"`.
- [x] 2.6 Run `next build` in `frontend/` and verify no TypeScript or lint errors.

## Files Changed (PR #2)

| File | Action | Notes |
|------|--------|-------|
| `frontend/lib/types.ts` | Modified | Added `rotation_deg?: number` and `invert?: boolean` to `ConvertParams`. |
| `frontend/lib/scara-defaults.ts` | Modified | Added A4 `scara` block, `rotation_deg: 0`, and `invert: false` to `DEFAULTS`. |
| `frontend/lib/presets.ts` | Created | `ImageType` type, `IMAGE_TYPE_PRESETS`, and `IMAGE_TYPE_LABELS`. |
| `frontend/components/Toggle.tsx` | Created | Accessible CSS toggle switch (`role="switch"`, `aria-checked`). |
| `frontend/components/ParameterPanel.tsx` | Modified | Image type pills, collapsible work area, rotation buttons, invert toggle, real-time toggle. |
| `frontend/components/GCodeOutput.tsx` | Modified | Copy feedback state machine with timeout cleanup and `aria-live="polite"`. |
| `frontend/app/page.tsx` | Modified | Added `imageType` and `realtime` state; passed to `ParameterPanel`. |

## Deviations from Design

- `IMAGE_TYPE_PRESETS` type uses `Partial<ConvertParams & { variant: Variant }>` rather than the literal `{ threshold: number; simplify_tolerance: number; variant: string; scale: number }` shown in the task prompt. This keeps the preset values assignable to `onChange` without casting and matches the design artifact.

## Issues Found

- First `next build` failed with `EACCES: permission denied, unlink '/frontend/.next/types/package.json'`. This was resolved with the documented cleanup command (`docker run --rm -v $(pwd)/frontend/.next:/clean alpine rm -rf /clean/server /clean/static /clean/types /clean/cache`). The subsequent build succeeded.

## Workload / PR Boundary

- Mode: stacked-to-main, PR #2.
- Current work unit: Static frontend controls (types, defaults, presets, Toggle, ParameterPanel, GCodeOutput copy feedback, page.tsx state).
- Git diff: 7 files changed, ~270 insertions(+), ~30 deletions(-) — within the ~240-line PR #2 estimate and under the 400-line review budget.
- Note: PR #2 targets `main` and is backward-compatible; it adds UI state that PR #3 will wire to auto-preview and debounced conversion.

## Remaining Tasks

Phase 3 (out of scope for PR #2):

- [ ] 3.1 Move image preview ownership to `frontend/app/page.tsx`: add `imageUrl` state and `useEffect` that creates/revokes object URLs on file selection/change/unmount.
- [ ] 3.2 Remove `imageUrl` from `frontend/hooks/useConvert.ts`; accept an external image URL for preview instead.
- [ ] 3.3 Add `AbortSignal` support to `frontend/lib/api.ts` `convert()`; resolve to `null` on abort without throwing.
- [ ] 3.4 Add `AbortController` and a `requestId` counter to `frontend/hooks/useConvert.ts`; abort previous request on new conversion; discard stale responses by ID.
- [ ] 3.5 Add `realtime` state and 500ms debounced `useEffect` to `frontend/app/page.tsx` that triggers conversion when ON and params/file change; show "Generating..." indicator during auto-conversion.
- [ ] 3.6 Manually verify: rapid slider drag yields one conversion, stale responses are discarded, toggle OFF disables auto-conversion, and auto-preview updates/clears correctly.

## Next Recommended Phase

`sdd-verify` for PR #2, then proceed to PR #3 (auto-preview + real-time conversion).
