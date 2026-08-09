# Design: frontend-redesign

## Technical Approach

Implement CIPRA's cool-slate design system as a **4-PR stacked chain** to `main` on the `refactor/frontend-redesign` branch. Each PR delivers one reviewable work unit under 400 lines. The existing uncommitted diff (+674/-453 across 12 files) is decomposed into focused slices: tokens → components → interactive patterns → accessibility correctness.

The design system is **Tailwind-native**: `ci-*` semantic tokens in `tailwind.config.ts` consumed via standard utility classes. No CSS-in-JS, no theme provider, no runtime token resolution. One CSS custom property (`--grid-cell`) bridges the CSS grid utility and the canvas-painted grid in `GCodeViewer`.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Token delivery | Tailwind `theme.extend.colors` + CSS variable for grid | CSS custom properties only, ThemeProvider context | Zero runtime cost, IDE autocomplete, matches existing Tailwind workflow. Only `--grid-cell` needs CSS var because canvas reads it via `getComputedStyle`. |
| Font loading | `next/font/google` with CSS variable strategy | `@font-face` in globals.css, Google Fonts `<link>` | Next.js self-hosts + optimizes FOUT. Three families loaded once, exposed as `--font-display/body/mono`. |
| Component scope | PillButton + SectionLabel stay file-scoped in ParameterPanel | Promote to `components/ui/` | Only one consumer. YAGNI — promote when a second panel appears. |
| EmptyState extraction | New `components/EmptyState.tsx` shared component | Keep duplicated markup | Two consumers (CanvasPreview, GCodeOutput) with identical shell, only copy differs. Third consumer (GCodeViewer canvas-painted) excluded — different rendering model. |
| Tab id generation | `useId()` (React 18+) | Static string ids, nanoid | Collision-safe if page mounts twice. Zero dependencies. Built-in. |
| workAreaPreset derivation | `useMemo` inline, drop `useEffect` + `useState` | Keep effect-based mirroring | Derived state should never be mirrored via effect. The deps are tight (W/H only) so memo cost is negligible. |
| Toggle translate | CSS custom property `--toggle-offset` | Spacing-scale classes, calc() | Toggle geometry (h-5 w-9, thumb 3.5) doesn't align to spacing scale cleanly. A CSS var keeps the value declarative and co-located. |
| ImageDropzone keyboard | `onKeyDown` handler on existing `div[role=button]` | Refactor to `<label>` wrapping input | Minimal diff. The `<label>` refactor is cleaner but touches drag/drop event wiring. onKeyDown is surgical. |

## Data Flow

```
tailwind.config.ts (ci-* tokens)
        │
        ▼
globals.css (--grid-cell, .bg-grid, .focus-ring, base rules)
        │
        ├──→ layout.tsx (font vars, body classes)
        │         │
        │         ▼
        │    page.tsx (layout shell → tab interface → ARIA wiring)
        │         │
        │         ├──→ CanvasPreview ──→ EmptyState
        │         ├──→ GCodeViewer (reads --grid-cell via getComputedStyle)
        │         ├──→ GCodeOutput ──→ EmptyState
        │         ├──→ ParameterPanel (PillButton, SectionLabel, NumericParamRow)
        │         ├──→ ImageDropzone
        │         └──→ WarningsList
        │
        └──→ Toggle, Tooltip (consumed by ParameterPanel)
```

## File Changes

| File | Action | PR | Description |
|------|--------|-----|-------------|
| `frontend/tailwind.config.ts` | Modify | 1 | `ci-*` palette, font families, `text-2xs`, `tracking-precise` |
| `frontend/app/globals.css` | Modify | 1 | `--grid-cell` var, `.bg-grid`/`.bg-grid-subtle` at 6-8%/2.5%, `.focus-ring`, `:focus-visible`, reduced-motion, range input styling |
| `frontend/app/layout.tsx` | Modify | 1 | Three `next/font/google` imports, `lang="en"`, body class `bg-ci-bg font-body text-ci-text` |
| `frontend/app/page.tsx` | Modify | 1,3,4 | PR1: layout shell (header/main/footer). PR3: tab interface state + handlers. PR4: ARIA wiring (ids, aria-controls, onKeyDown) |
| `frontend/components/EmptyState.tsx` | Create | 2 | Shared empty-state shell — `flex h-64 rounded-lg border border-ci-rule bg-ci-bg/60` with slot for copy |
| `frontend/components/CanvasPreview.tsx` | Modify | 2 | Token swap, English copy, use EmptyState |
| `frontend/components/GCodeOutput.tsx` | Modify | 2 | Token swap, English copy, use EmptyState, `focus-ring` on buttons |
| `frontend/components/GCodeViewer.tsx` | Modify | 2 | `useMemo` for dimensions, restore `console.warn`, Y-axis comment, read `--grid-cell` for canvas grid, token swap |
| `frontend/components/ImageDropzone.tsx` | Modify | 2,4 | PR2: token swap, English. PR4: `onKeyDown` for Enter/Space |
| `frontend/components/Toggle.tsx` | Modify | 2 | `--toggle-offset` CSS var replaces magic pixels |
| `frontend/components/Tooltip.tsx` | Modify | 2 | Token swap (`bg-ci-text`), `mb-1.5`, `leading-none` |
| `frontend/components/WarningsList.tsx` | Modify | 2 | Token swap |
| `frontend/components/ParameterPanel.tsx` | Modify | 3 | PillButton/SectionLabel extraction, `useMemo` for workAreaPreset, English copy, `tabular-nums`, `tracking-precise` |

## Interfaces / Contracts

### EmptyState Component

```tsx
interface EmptyStateProps {
  children: React.ReactNode;
}
// Renders: <div className="flex h-64 items-center justify-center rounded-lg border border-ci-rule bg-ci-bg/60">
//            <p className="font-body text-sm tracking-precise text-ci-muted">{children}</p>
//          </div>
```

### ARIA Tab Pattern (page.tsx)

```tsx
// id generation
const baseId = useId(); // e.g. ":r0:"
const tabId = (tab: TabId) => `${baseId}-tab-${tab}`;
const panelId = (tab: TabId) => `${baseId}-panel-${tab}`;

// button attributes
role="tab"
id={tabId(tabId)}
aria-controls={panelId(tabId)}
aria-selected={activeTab === tabId}
tabIndex={activeTab === tabId ? 0 : -1}
onKeyDown={(e) => handleTabKeyDown(e, index)}

// panel attributes
role="tabpanel"
id={panelId(activeTab)}
aria-labelledby={tabId(activeTab)}
tabIndex={0}
```

### Grid Variable Bridge

```css
/* globals.css */
:root { --grid-cell: 24px; }
.bg-grid { background-size: var(--grid-cell) var(--grid-cell); }
```

```tsx
// GCodeViewer.tsx — read from CSS for canvas grid
const gridSpacing = parseInt(
  getComputedStyle(document.documentElement).getPropertyValue('--grid-cell')
) || 24;
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Build | `npm run build` passes zero errors | CI gate on every PR |
| Manual | Tab keyboard nav (Arrow/Home/End) | Tester follows WAI-ARIA tab pattern checklist per PR |
| Manual | Screen reader tab announcement | VoiceOver/NVDA on PR 4 — verify aria-controls/labelledby |
| Manual | ImageDropzone Enter/Space | Keyboard-only test on PR 4 |
| Visual | Graph-paper grid visible at 6-8% | Screenshot comparison at 100% and 150% zoom |
| Regression | Each PR independently revertable | `git revert` per PR, verify app still builds |

No automated frontend tests — decision from `ux-polish-and-features` stands.

## Chained PR Structure

**Strategy**: Stacked PRs to `main`. Each PR branches from the previous PR's head.

```text
main
 └── PR 1: feat(frontend): design system foundation (~250 lines)
      └── PR 2: feat(frontend): component restyling (~300 lines)
           └── PR 3: feat(frontend): tab interface and parameter panel (~350 lines)
                └── PR 4: fix(frontend): accessibility corrections (~100 lines)
```

| PR | Branch | Base | Files | Budget |
|----|--------|------|-------|--------|
| 1 | `refactor/frontend-redesign` | `main` | tailwind.config.ts, globals.css, layout.tsx, page.tsx (shell) | ~250 |
| 2 | `refactor/frontend-redesign-02-components` | PR 1 head | 7 components + EmptyState (new) | ~300 |
| 3 | `refactor/frontend-redesign-03-tabs-panel` | PR 2 head | page.tsx (tab logic), ParameterPanel.tsx | ~350 |
| 4 | `refactor/frontend-redesign-04-a11y` | PR 3 head | page.tsx (ARIA), ImageDropzone.tsx (onKeyDown) | ~100 |

After each PR merges to `main`, the next PR is retargeted to `main` so GitHub shows only the current slice's diff.

## Migration / Rollout

No migration required. Each PR is independently revertable via `git revert`. Full rollback: `git checkout main -- frontend/`.

## Open Questions

- [ ] `ci-surface` token is defined but only used implicitly (`bg-white` instead of `bg-ci-surface`). Migrate or remove in PR 2?
- [ ] Real-time toggle promotion to sticky footer — spec says RECOMMENDED, not MUST. Defer to a follow-up?
