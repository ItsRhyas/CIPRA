# Tasks: fix-conversion-flicker

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated total changed lines | ~15 |
| Per PR estimated lines | PR1 ~15 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low

## Implementation

- [x] 1.1 [FRONTEND] `frontend/hooks/useConvert.ts`: remove `setResult(null)` from `convert()` so the previous G-Code persists until the new response arrives. Result should only clear via `reset()`.
- [x] 1.2 [FRONTEND] `frontend/app/page.tsx`: guard the auto-tab-switch `useEffect` with a `useRef` flag (`isManualConvertRef`) that is `true` only for manual `handleConvert` calls; real-time debounced conversions set it to `false` so the user stays on their current tab.
- [x] 1.3 [FRONTEND] `frontend/app/page.tsx`: reset conversion state when a new image is selected by wrapping `setFile` with `handleFileSelect`, calling `reset()` before switching images so old G-Code does not display for the new image.

## Verification

- [x] `npx tsc --noEmit` in `frontend/` passes (no TypeScript errors).
- [x] `pytest backend -q` passes (no regressions).
