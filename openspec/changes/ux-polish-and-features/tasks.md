# Tasks: UX Polish and Features

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~470 (PR1 ~120, PR2 ~240, PR3 ~110) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend) → PR 2 (static frontend controls) → PR 3 (auto-preview + real-time) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend rotate/invert pipeline + validation + tests | PR 1 | Targets `main`; no frontend dependency |
| 2 | Static frontend controls and copy feedback | PR 2 | Targets `main`; backward-compatible even before PR1 |
| 3 | Auto-preview + real-time conversion with debounce/abort | PR 3 | Targets `main`; depends on PR2 UI state |

## Phase 1: Backend Pipeline

- [x] 1.1 Extend `backend/pipeline/types.py` `ConvertParams` with `rotation_deg: int = 0` and `invert: bool = False`.
- [x] 1.2 Update `backend/pipeline/preprocess.py` signature to accept `rotation_deg` and `invert`; apply `cv2.rotate` then `cv2.bitwise_not` before grayscale; raise `ValueError` for invalid rotation.
- [x] 1.3 Wire `rotation_deg` and `invert` through `backend/pipeline/orchestrator.py` into `preprocess()`.
- [x] 1.4 Parse and validate `rotation_deg`/`invert` in `backend/jobs/serializers.py`; reject non-enum rotation with HTTP 400.
- [x] 1.5 Add `rotation_deg` (enum 0/90/180/270) and `invert` (bool) fields to `shared/api-contract.json` `ConvertParams` schema.
- [x] 1.6 Add backend tests in `backend/tests/test_pipeline.py` and `backend/tests/test_api.py` covering each rotation, invert combos, invalid rotation rejection, and default behavior.

## Phase 2: Static Frontend Controls

- [x] 2.1 Add `rotation_deg` and `invert` to `frontend/lib/types.ts` `ConvertParams`; add `scara` block with A4 defaults and `rotation_deg`/`invert` defaults to `frontend/lib/scara-defaults.ts`.
- [x] 2.2 Create `frontend/lib/presets.ts` exporting `ImageType` and `IMAGE_TYPE_PRESETS` (photo, line_art, sketch, text) with threshold, simplify_tolerance, variant, and scale.
- [x] 2.3 Create accessible `frontend/components/Toggle.tsx` switch using `role="switch"`, `aria-checked`, and CSS only.
- [x] 2.4 Extend `frontend/components/ParameterPanel.tsx` with: image type selector (custom sentinel), collapsible work area section (presets + W/H + speeds), rotation buttons (0/90/180/270), invert toggle, and real-time toggle UI.
- [x] 2.5 Implement copy feedback state machine in `frontend/components/GCodeOutput.tsx`: "Copied!" / "Copy failed" for 1.5s, timeout cancellation on rapid clicks, `aria-live="polite"`.
- [x] 2.6 Run `next build` in `frontend/` and verify no TypeScript or lint errors.

## Phase 3: Auto-Preview and Real-Time Conversion

- [x] 3.1 Move image preview ownership to `frontend/app/page.tsx`: add `previewUrl` state and `useEffect` that creates/revokes object URLs on file selection/change/unmount.
- [x] 3.2 Remove `imageUrl` from `frontend/hooks/useConvert.ts`; accept an external image URL for preview instead.
- [x] 3.3 Add `AbortSignal` support to `frontend/lib/api.ts` `convert()`; resolve to `null` on abort without throwing.
- [x] 3.4 Add `AbortController` and a `requestId` counter to `frontend/hooks/useConvert.ts`; abort previous request on new conversion; discard stale responses by ID.
- [x] 3.5 Add `realtime` state and 500ms debounced `useEffect` to `frontend/app/page.tsx` that triggers conversion when ON and params/file change; show "Generating..." indicator during auto-conversion.
- [x] 3.6 Manually verify: rapid slider drag yields one conversion, stale responses are discarded, toggle OFF disables auto-conversion, and auto-preview updates/clears correctly.
