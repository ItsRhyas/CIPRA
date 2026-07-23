# Apply Progress: fix-conversion-flicker

## Status

All three fixes implemented and verified. `3/3` tasks complete.

## Mode

Standard (no strict TDD gate configured in this OpenSpec change).

## Changes Made

### Fix 1 — `frontend/hooks/useConvert.ts`

Removed the synchronous `setResult(null)` call from the start of `convert()`.
The result now persists during the request lifecycle and is only cleared by `reset()`.

- `setState('uploading')` and `setError(null)` are still fired so the UI shows loading/error states.
- This eliminates the canvas clear / empty-state flash in `GCodeViewer` and keeps `WarningsList` visible during conversion.

### Fix 2 — `frontend/app/page.tsx` (manual-vs-realtime tab guard)

Added `isManualConvertRef` (`useRef(false)`) to track the origin of the current conversion:

- `handleConvert` sets `isManualConvertRef.current = true` before calling `convert()`.
- The debounced real-time `useEffect` sets `isManualConvertRef.current = false` before calling `convert()`.
- The auto-tab-switch `useEffect` now only fires when `isManualConvertRef.current === true`, so users stay on their chosen tab during real-time mode conversions.

### Fix 3 — `frontend/app/page.tsx` (reset on new image)

Wrapped the dropzone `onSelect` callback with `handleFileSelect`:

- When a non-null file is chosen, `reset()` is called first to clear the prior G-Code, error, and loading state.
- Then `setFile(selectedFile)` updates the preview/params context for the new image.
- Prevents stale G-Code from the previous image being displayed after a new drop.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `frontend/hooks/useConvert.ts` | Modified | Removed `setResult(null)` from `convert()`; result persists until replaced or `reset()` is called. |
| `frontend/app/page.tsx` | Modified | Added `isManualConvertRef`, guarded auto-tab-switch to manual conversions, and reset conversion state on new image selection. |
| `openspec/changes/fix-conversion-flicker/tasks.md` | Created | Task list with `[x]` marks and verification checklist. |
| `openspec/changes/fix-conversion-flicker/apply-progress.md` | Created | This file. |

## Deviations from Design

None — implementation matches the exploration's recommended Approach 1 + 2.

## Issues Found

None.

## Verification Results

- `npx tsc --noEmit` in `/home/itsrhyas/Desktop/IAPROYECTO/frontend/`: **passed** (no output, no errors).
- `pytest backend -q` in `/home/itsrhyas/Desktop/IAPROYECTO/`: **passed** (`................................................ [100%]`).

## Remaining Work

None. Ready for `sdd-verify`.
