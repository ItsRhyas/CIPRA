# Apply Progress: fix-flicker-remaining

## Status

All two fixes implemented and verified. `2/2` tasks complete.

## Mode

Standard (no strict TDD gate configured in this OpenSpec change).

## Changes Made

### Fix A — `frontend/components/ImageDropzone.tsx` (stable file info block)

Restructured the conditional at lines 127-154 from a nested `disabled ? (file ? …) : file ? …` pattern to a single ternary `file ? … : disabled ? … : …`.

- The file info block (`<div>` with file name and size) is now emitted from the same JSX position regardless of the `disabled` state.
- When `disabled` flips from `false` → `true` during conversion, React reconciles the same element instead of unmounting the old branch and mounting a new one.
- The outer dropzone still receives `opacity-50` instantly when `disabled` — this is the intended visual feedback.
- Eliminates the one-frame flash of the file name/size in the dropzone.

### Fix B — `frontend/app/page.tsx` (LanguageSwitcher stable position)

Swapped the order of elements in the footer left group at lines 259-266 so `LanguageSwitcher` is rendered first, and the conditional `Generating…` text is rendered after it.

- When `isUploading` becomes `true`, the `Generating…` text appears to the right of the LanguageSwitcher instead of pushing it right by the text width + gap.
- The LanguageSwitcher stays at the left edge of the footer left group throughout the conversion lifecycle.
- Eliminates the horizontal layout shift previously perceived as a flicker.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `frontend/components/ImageDropzone.tsx` | Modified | Restructured conditional so the file info block is rendered from a stable JSX position; no duplicate branches. |
| `frontend/app/page.tsx` | Modified | Reordered footer left group to put `LanguageSwitcher` before the conditional `Generating…` text. |
| `openspec/changes/fix-flicker-remaining/tasks.md` | Created | Task list with `[x]` marks and verification checklist. |
| `openspec/changes/fix-flicker-remaining/apply-progress.md` | Created | This file. |

## Deviations from Design

None — implementation matches the exploration's recommendation (combine Approach 1 + Approach 2).

## Issues Found

None.

## Verification Results

- `npx tsc --noEmit` in `/home/itsrhyas/Desktop/IAPROYECTO/frontend/`: **passed** (no output, no errors).

## Remaining Work

None. Ready for `sdd-verify`.
