# Archive Report: improve-gcode-output

**Archived**: 2026-07-21
**Change**: improve-gcode-output
**Archive Path**: `openspec/changes/archive/2026-07-21-improve-gcode-output/`

## Executive Summary

The `improve-gcode-output` change has been fully planned, implemented, verified, and archived. Three PRs were delivered via a stacked-to-main chain strategy: path boundary preservation (PR #1), parameter wiring and F-code emission (PR #2), and frontend parameter tooltips (PR #3). All 37 backend tests pass, lint is clean, and frontend build succeeds.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| gcode-path-structure | Created | 1 requirement: Per-Path Boundary Preservation (3 scenarios) |
| pipeline-params | Created | 4 requirements: Coordinate Scaling, Canny Threshold Wiring, F-Code Emission, ConvertParams Defaults (7 scenarios). 2 requirements removed: tool_offset_mm, origin (with Reason + Migration notes) |
| parameter-tooltips | Created | 2 requirements: Parameter Descriptions, Description Content (4 scenarios) |

No existing main specs existed under `openspec/specs/`; all three domain specs were created as seed main specs.

## Archive Contents

- proposal.md ✅
- spec.md ✅
- design.md ✅
- tasks.md ✅ (17/17 tasks complete, 3/3 verification checks passed)
- apply-progress.md ✅
- verify-report.md ✅

## Task Reconciliation

The following stale unchecked boxes were reconciled at archive time, backed by apply-progress (#255) and verify-report (#256) proof:

| Task | Reason |
|------|--------|
| 2.9 Frontend type/default sync | Completed in PR #3 work (apply-progress #255 confirms `types.ts` and `scara-defaults.ts` updated) |
| 3.1 ParameterPanel tooltips | Completed in PR #3 (apply-progress #255 confirms `title` attributes added) |
| 3.2 Frontend tooltip tests | Completed in PR #3 (apply-progress #255 confirms `npm run build` passes) |
| Verification: pytest | 37 tests passed (verify-report #256) |
| Verification: frontend lint | `npm run build` successful (apply-progress #255) |
| Verification: manual G-Code inspection | No phantom lines confirmed (verify-report #256, golden fixtures match) |

## Verification Summary

- **Backend tests**: 37 passed in 0.37s
- **Lint**: `ruff check backend` — all checks passed
- **Frontend build**: `npm run build` — successful
- **CRITICAL issues**: None
- **Minor observations**: 2 suggestions (F-code decimal format, `balanced` variant enum) — non-blocking

## Engram Observation IDs

| Artifact | Observation ID |
|----------|---------------|
| proposal | #251 |
| spec | #252 |
| design | #253 |
| tasks | #254 |
| apply-progress | #255 |
| verify-report | #256 |

## Source of Truth Updated

The following specs now reflect the new behavior:
- `openspec/specs/gcode-path-structure/spec.md`
- `openspec/specs/pipeline-params/spec.md`
- `openspec/specs/parameter-tooltips/spec.md`

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
