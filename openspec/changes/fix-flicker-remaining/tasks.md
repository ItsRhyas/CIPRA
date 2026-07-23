# Tasks: fix-flicker-remaining

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated total changed lines | ~12 |
| Per PR estimated lines | PR1 ~12 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low

## Implementation

- [x] 1.1 [FRONTEND] `frontend/components/ImageDropzone.tsx`: restructure the `disabled`/`file` conditional (lines 127-154) so the file info block is rendered from a single, stable JSX position. Eliminates the unmount/mount cycle when `disabled` flips during conversion.
- [x] 1.2 [FRONTEND] `frontend/app/page.tsx`: swap the footer left group so `LanguageSwitcher` is rendered before the conditional `Generating…` text (lines 259-266). Keeps the LanguageSwitcher at a stable horizontal position during conversion.

## Verification

- [x] `npx tsc --noEmit` in `frontend/` passes (no TypeScript errors).
