# Proposal: frontend-redesign

## Intent

Replace CIPRA's default UI (Spanish copy, generic gray/blue Tailwind, 2-column layout) with a deliberate cool-slate design system anchored to a graph-paper grid signature. The redesign addresses three problems: the UI has no visual identity specific to its subject (SCARA robotic arm / G-Code generation), the tab interface ships a broken ARIA pattern that regresses accessibility, and several code-quality issues (dead code, magic numbers, duplicated logic) were introduced during the visual overhaul.

## Scope

### In Scope
- Design token system (`ci-*` palette, `--font-display/body/mono`, type scale, grid utilities)
- Single-column layout with sticky bottom bar
- Tab interface (Preview / Paths / G-Code) with correct ARIA wiring
- Component restyling (CanvasPreview, GCodeOutput, GCodeViewer, ImageDropzone, Toggle, Tooltip, WarningsList, ParameterPanel)
- Spanish → English copy throughout
- Accessibility fixes: ARIA tabs, keyboard support on ImageDropzone, restored console.warn
- Code quality: useMemo for dimensions, derived state for workAreaPreset, centralized --grid-cell variable, EmptyState extraction
- Design polish: bolder grid opacity (6–8%), font-display decision, Live indicator visibility

### Out of Scope
- Backend, API, or type changes
- New frontend test infrastructure (decision from `ux-polish-and-features` stands)
- Shared component library promotion (PillButton, SectionLabel remain file-scoped)
- Mobile breakpoint planning (verify only, no new breakpoints)
- New features or parameter additions

## Capabilities

> Contract with sdd-spec. This change modifies ZERO spec-level requirements — it's a visual + accessibility implementation change. Existing specs remain valid.

### New Capabilities
- `frontend-design-system`: The ci-* token system, type stack, grid utilities, and layout shell that define CIPRA's visual identity

### Modified Capabilities
- `parameter-tooltips`: Visual restyling only (token swaps, font changes) — requirements unchanged, spec delta for implementation details

## Approach

**Chained PRs stacked-to-main** on `refactor/frontend-redesign` branch. Each PR stays under 400 lines, is independently reviewable, and has a clear rollback path.

### PR 1: Design System Foundation
`globals.css` + `tailwind.config.ts` + `layout.tsx` + `page.tsx` shell (header, footer, tab skeleton)
- Tokens, fonts, utilities, grid, focus-ring, reduced-motion
- Single-column layout shell, sticky footer
- ~250 lines

### PR 2: Component Restyling
CanvasPreview, GCodeOutput, GCodeViewer, ImageDropzone, Toggle, Tooltip, WarningsList
- Token migration, English copy, style refresh
- Extract EmptyState component
- Centralize `--grid-cell` CSS variable
- useMemo for GCodeViewer dimensions, restore Y-axis comment + console.warn
- ~300 lines

### PR 3: Tab Interface + ParameterPanel
`page.tsx` tab logic + `ParameterPanel.tsx` restructure
- Tab strip with Preview / Paths / G-Code
- PillButton + SectionLabel extraction
- workAreaPreset → derived state (useMemo)
- Toggle magic pixels → spacing-scale values
- Real-time toggle promotion
- ~350 lines

### PR 4: Accessibility Fixes (Critical)
ARIA tab pattern wiring + ImageDropzone keyboard support
- Wire `onKeyDown={handleTabKeyDown}` on tab buttons
- Add `id` to buttons, `aria-controls`, `id` + `aria-labelledby` on panel
- Use `useId()` for collision-safe ids
- Add `onKeyDown` to ImageDropzone (Enter/Space → file input click)
- ~100 lines

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/app/globals.css` | Modified | New utilities (.bg-grid, .focus-ring), base rules, --grid-cell variable |
| `frontend/app/layout.tsx` | Modified | Font imports, lang es→en, body class swaps |
| `frontend/app/page.tsx` | Modified | Tab interface, ARIA wiring, layout shell, English copy |
| `frontend/components/ParameterPanel.tsx` | Modified | PillButton/SectionLabel extraction, derived state, English |
| `frontend/components/GCodeViewer.tsx` | Modified | useMemo, console.warn, Y-axis comment, grid variable |
| `frontend/components/GCodeOutput.tsx` | Modified | Token swaps, EmptyState, English |
| `frontend/components/ImageDropzone.tsx` | Modified | onKeyDown keyboard support, tokens, English |
| `frontend/components/CanvasPreview.tsx` | Modified | Tokens, EmptyState, English |
| `frontend/components/Toggle.tsx` | Modified | Spacing-scale translate values |
| `frontend/components/Tooltip.tsx` | Modified | Token swap |
| `frontend/components/WarningsList.tsx` | Modified | Token swap |
| `frontend/tailwind.config.ts` | Modified | ci-* design tokens |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Broken ARIA tabs ship to production | **High if PR 4 skipped** | PR 4 is non-negotiable. Add Playwright + axe-core e2e test for tablist. |
| Tab id collisions if page mounted twice | Low | Use `useId()` (React 18+) instead of static strings |
| console.warn removal hides contract violations | Medium | Restore warn in PR 2 + add non-blocking UI signal |
| Toggle pixel drift on token changes | Low | Derive from spacing scale in PR 3 |
| 24px grid duplication drift | Low | Centralize as `--grid-cell` CSS variable in PR 1 |

## Rollback Plan

Each PR is independently revertable via `git revert`:
- **PR 1 reverted**: Falls back to prior Tailwind defaults + 2-column layout. No data loss.
- **PR 2 reverted**: Components retain old styling. Tokens still present (unused).
- **PR 3 reverted**: Tab interface removed, parameter panel returns to prior state.
- **PR 4 reverted**: ARIA fixes removed. Only revert if PR 3 is also reverted (tabs depend on ARIA).

Full rollback: `git checkout main -- frontend/` restores all 12 files to pre-redesign state.

## Dependencies

- None. Purely frontend change, no backend or API contract changes.

## Success Criteria

- [ ] `npm run build` passes with zero errors
- [ ] Tablist is keyboard-operable (ArrowLeft/Right/Home/End navigate tabs)
- [ ] Screen reader announces tab ↔ panel relationship (axe-core clean)
- [ ] ImageDropzone is keyboard-accessible (Enter/Space triggers file picker)
- [ ] Graph-paper grid is visible at 6–8% opacity
- [ ] All `ci-*` tokens are used at least once (no orphaned tokens)
- [ ] No `console.warn` suppression for invalid work area dimensions
- [ ] Each PR stays under 400 lines (enforced by chained-pr skill)
