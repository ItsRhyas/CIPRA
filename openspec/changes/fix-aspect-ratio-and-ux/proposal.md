# Proposal: Fix Aspect Ratio and UX

## Intent

CIPRA distorts images via independent X/Y scaling, producing stretched output for non-A4 inputs. Frontend has parallel UX issues: non-responsive layout, slider-only controls, native `title` tooltips invisible on touch, GCodeViewer hardcoded to A4.

## Scope

### In Scope
- Uniform fit-to-area scaling with centering in `simplify.py`
- Responsive layout with Tailwind breakpoints
- DOM reorder: ParameterPanel closer to Convert button
- Paired slider + numeric input controls
- Custom CSS tooltip component (no external deps)
- Per-parameter reset buttons
- GCodeViewer reads work_area from props
- Update affected tests

### Out of Scope
- New pipeline stages, keyboard shortcuts, accessibility audit, undo history, new formats

## Capabilities

### New Capabilities
- `responsive-layout`: Responsive grid adapting to mobile/tablet/desktop via Tailwind breakpoints

### Modified Capabilities
- `pipeline-params`: Scaling changes from independent `scale_x`/`scale_y` to uniform fit-to-area with centering
- `parameter-tooltips`: Native `title` replaced with custom CSS component; per-param reset added

## Approach

**Backend (~30 lines)**: Replace dual scale with `fit = min(w/image_w, h/image_h)` + centering offsets. `scale` param remains as post-multiply control.

**Frontend (~350 lines)**: `page.tsx` responsive grid + DOM reorder. `ParameterPanel.tsx` paired inputs + reset + CSS tooltips. `GCodeViewer.tsx` dynamic work_area from props.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/pipeline/simplify.py:75-76,92-93` | Modified | Uniform scale + centering |
| `backend/tests/test_pipeline.py:154-163` | Modified | Update scaling test |
| `frontend/app/page.tsx` | Modified | Responsive grid, reorder |
| `frontend/components/ParameterPanel.tsx` | Modified | Paired inputs, reset, tooltips |
| `frontend/components/GCodeViewer.tsx` | Modified | Dynamic work_area |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| G-Code output changes (correct behavior) | High | Document in changelog; update golden fixtures |
| Tooltip CSS conflicts with Tailwind | Low | Scoped classes, test across breakpoints |
| Responsive breaks Docker deploy | Low | Test in container before merge |

## Rollback Plan

Revert `simplify.py` to dual scale logic. Revert frontend files to previous commits. No migrations or persistent state.

## Dependencies

None — all internal to CIPRA.

## Success Criteria

- [ ] Square image on A4: equal X/Y scale (no stretch)
- [ ] Image centered when aspect ratios differ
- [ ] Frontend adapts to mobile/tablet/desktop
- [ ] Sliders paired with numeric inputs, synced
- [ ] Tooltips on hover/focus, no external deps
- [ ] GCodeViewer matches custom work_area
- [ ] All tests pass, frontend builds clean
