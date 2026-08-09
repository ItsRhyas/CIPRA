# Proposal: UX Polish and Features

## Intent

Improve CIPRA's usability with six targeted UX enhancements. The current UI requires manual steps for basic workflows (no preview until Convert, no copy feedback), lacks discoverability for new users (no presets), hides valid configuration (work area), and misses common image operations (rotate/invert). These changes reduce friction and make the tool feel responsive and complete.

## Scope

### In Scope
- Auto-preview image on file select (before Convert)
- Copy button inline feedback ("Copied!" for 1.5s)
- Work area configuration UI with presets (A4, A3, Letter, Custom)
- Image type presets (photo, line art, sketch, text)
- Backend rotate/invert pipeline stage
- Real-time generation toggle with debounce + abort

### Out of Scope
- Toast notification system (inline feedback only)
- EXIF auto-orient (future enhancement)
- Backend validation of work area ranges (future)
- Frontend tests (no test infrastructure exists)

## Capabilities

### New Capabilities
- `auto-preview`: Show image preview immediately on file selection, independent of Convert
- `copy-feedback`: Transient inline feedback on GCode copy button
- `work-area-config`: Expose work area dimensions via presets and custom W/H inputs
- `image-type-presets`: One-click parameter presets for common image types
- `rotate-invert`: Backend pipeline stage for image rotation (0/90/180/270) and color inversion
- `real-time-toggle`: Auto-generate on parameter change with debounce and request cancellation

### Modified Capabilities
- `pipeline-params`: Add `rotation_deg` and `invert` fields to `ConvertParams`

## Approach

**Backend (~60 lines)**:
- `preprocess.py`: add `rotation_deg: int = 0, invert: bool = False` params, apply `cv2.rotate` then `cv2.bitwise_not`
- `types.py`: extend `ConvertParams` with new fields
- `orchestrator.py`: wire rotation/invert to preprocess call
- `serializers.py`: parse new fields from params JSON
- `api-contract.json`: document new fields
- Tests: add rotation/invert test cases

**Frontend (~350 lines)**:
- `page.tsx`: auto-preview via useEffect, real-time toggle + debounce effect, pass state to children
- `useConvert.ts`: AbortController + requestId for stale response discard
- `api.ts`: accept AbortSignal parameter
- `ParameterPanel.tsx`: work area section, image type presets, rotate/invert controls, real-time toggle
- `GCodeOutput.tsx`: copy feedback state machine
- `scara-defaults.ts`: add scara block to DEFAULTS
- New: `lib/presets.ts` for IMAGE_TYPE_PRESETS config
- New: `components/Toggle.tsx` for toggle switch

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/preprocess.py` | Modified | Add rotation/invert stage |
| `backend/types.py` | Modified | Extend ConvertParams |
| `backend/orchestrator.py` | Modified | Wire new params |
| `backend/serializers.py` | Modified | Parse new fields |
| `frontend/src/app/page.tsx` | Modified | Auto-preview, real-time toggle |
| `frontend/src/hooks/useConvert.ts` | Modified | AbortController support |
| `frontend/src/lib/api.ts` | Modified | Accept AbortSignal |
| `frontend/src/components/ParameterPanel.tsx` | Modified | Work area, presets, rotate/invert |
| `frontend/src/components/GCodeOutput.tsx` | Modified | Copy feedback |
| `frontend/src/lib/presets.ts` | New | IMAGE_TYPE_PRESETS config |
| `frontend/src/components/Toggle.tsx` | New | Toggle switch component |
| `frontend/src/lib/scara-defaults.ts` | Modified | Add scara defaults |
| `api-contract.json` | Modified | Document new fields |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Real-time + debounce stale responses | High | AbortController + requestId counter; discard responses with mismatched ID |
| Backend test breakage from new params | Medium | rotation_deg=0, invert=False defaults preserve existing behavior |
| Multiple features in ParameterPanel | Medium | Implement sequentially; each feature is a self-contained section |
| ~400-500 lines total exceeds review budget | Medium | Chained PRs recommended: backend slice, then frontend features |

## Rollback Plan

- **Backend**: Remove `rotation_deg`/`invert` from `ConvertParams` and preprocess. Default values (0, False) mean no behavior change for existing callers.
- **Frontend**: Each feature is isolated in its own section/component. Remove individually without cross-dependencies.
- **API contract**: Revert additions to `api-contract.json`.

## Dependencies

- OpenCV (`cv2.rotate`, `cv2.bitwise_not`) — already in backend dependencies

## Success Criteria

- [ ] Selecting an image shows preview immediately without clicking Convert
- [ ] Copy button shows "Copied!" for 1.5s then reverts
- [ ] Work area can be changed via presets or custom W/H inputs
- [ ] Selecting an image type preset updates all 4 relevant sliders
- [ ] Rotate (0/90/180/270) and invert options available in UI
- [ ] Real-time toggle (off by default) auto-generates on param change with debounce
- [ ] All backend tests pass, frontend builds without errors
