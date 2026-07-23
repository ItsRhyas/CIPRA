# Exploration: frontend-redesign

> **Phase**: sdd-explore (read-only investigation of an in-progress change)
> **Change**: `refactor/frontend-redesign` branch, uncommitted (+674 / -453 lines across 12 files)
> **Mode**: hybrid (Engram `sdd/frontend-redesign/explore` + OpenSpec `openspec/changes/frontend-redesign/exploration.md`)

---

## Current State

The redesign replaces CIPRA's prior UI (Spanish copy, generic gray/blue Tailwind defaults, 2-column desktop layout, inline JSDoc on every component) with a deliberate design system rooted in a cool-slate engineering aesthetic. The change is **uncommitted and on a feature branch** — no OpenSpec proposal/spec/design/tasks artifacts exist yet for it; this exploration is the first SDD artifact.

### What the redesign changes

**Visual identity (new tokens)**
- `ci-*` palette in `tailwind.config.ts` — 11 semantic tokens: `bg #F6F7F9`, `surface #FFFFFF`, `text #131417`, `muted #556270`, `accent #1E3A5F` (cool slate blue), `rule #DDE1E6`, `rule-strong #C4CAD4`, `accent-hover #162D4A`, `accent-subtle #EEF1F5`, `danger #DC4A4A`, `danger-bg #FEF2F2`, `warning #B45309`, `warning-bg #FFFBEB`. This avoids the three AI-default looks the frontend-design skill warns against (warm cream / near-black + acid / broadsheet). It also avoids any warm earth tones or terracotta.
- Type system via `next/font/google` CSS variables: `--font-display` (DM Serif Display), `--font-body` (Inter), `--font-mono` (JetBrains Mono). Display is reserved for the `h1`; mono is used only for the G-Code `<pre>` block; everything else is `font-body`.
- Custom type scale additions: `text-2xs` (0.6875rem/1rem), `tracking-precise` (-0.011em letter-spacing) for editorial feel.
- `.focus-ring` utility + base `:focus-visible` rule for unified keyboard focus.
- `prefers-reduced-motion` honored globally in `globals.css`.
- Cross-browser range input styling (`@layer components`) consolidating WebKit + Mozilla pseudo-elements.
- `.bg-grid` and `.bg-grid-subtle` utilities — 24px coordinate grid at 4% / 2.5% opacity. This is the closest thing to a signature element and evokes graph paper / workshop precision.

**Layout**
- 2-column `md:grid-cols-[2fr_1fr]` → single-column flow (`max-w-3xl`) with sticky bottom Convert/Reset bar.
- Header band on top, footer sticky to viewport, body scrolls in between.
- Parameters moved BELOW the tab panel (previously side-by-side with the canvas). This makes the workflow linear and scannable.

**Language**
- Spanish → English throughout (`Vista previa` → `Preview`, `Visualizador` → `Paths`, `Código G` → `G-Code`, all tooltips, empty states, error copy).

**Component extraction**
- `PillButton` and `SectionLabel` extracted as local components inside `ParameterPanel.tsx` (NOT promoted to a shared module — they're still file-scoped).
- `NumericParamRow` was already extracted pre-redesign; styling was just refreshed.

**Tabbed interface**
- New tab strip above the canvas: Preview / Paths / G-Code.
- `tabRefs`, `focusTab`, `handleTabKeyDown`, `setTabRef` callbacks defined in `page.tsx`.
- `tabPanelId(tabId)` helper defined for ARIA associations.
- Bottom sticky bar gains a `Live` indicator that shows when `realtime === true`.

**Style refinements**
- `tabular-nums` on numeric readouts.
- `tracking-precise` on labels, captions, and the live indicator.
- `text-2xs uppercase tracking-wider` eyebrows (SectionLabel).
- Smaller, tighter Toggle (`h-5 w-9` instead of `h-6 w-11`).
- Replace literal `↺` reset glyph with the word "Reset" for clarity.

---

## Affected Areas

| File | Why it's affected | LoC Δ |
|------|-------------------|-------|
| `frontend/app/globals.css` | New `@layer utilities` (`.bg-grid`, `.focus-ring`), `@layer base` (`:focus-visible`, reduced-motion), `@layer components` (range input) | +71 |
| `frontend/app/layout.tsx` | Three `next/font/google` families, lang `es` → `en`, body class swaps to `ci-*` tokens | +19 / -8 |
| `frontend/app/page.tsx` | Tab interface, keyboard nav handlers (defined but **not wired** — see CRITICAL), header + sticky footer shell, English copy | +170 / -92 |
| `frontend/components/ParameterPanel.tsx` | Local `PillButton` + `SectionLabel` extraction, `Section` blocks, English copy, `&deg;` for degree symbol, removed JSDoc | +256 / -261 (parity, with restructuring) |
| `frontend/components/GCodeViewer.tsx` | Removed `console.warn` for invalid W/H, square container (560×560, was 560×792), grid background inside canvas, new fallback copy, English | +71 / -36 |
| `frontend/components/GCodeOutput.tsx` | Copy/Download buttons with `focus-ring`, dark `<pre>` uses `font-mono text-xs`, removed JSDoc, removed ✓/✗ glyphs (good — was decorative) | +18 / -10 |
| `frontend/components/ImageDropzone.tsx` | New colors, removed JSDoc, English copy, `&hellip;` and `&mdash;` entities | +21 / -12 |
| `frontend/components/CanvasPreview.tsx` | `mx-auto`, padding, English, removed JSDoc, `bg-ci-bg/60` empty state | +12 / -4 |
| `frontend/components/Toggle.tsx` | Smaller dimensions, magic pixel translate values (`translate-x-[18px]`/`[3px]`), removed JSDoc | +13 / -5 |
| `frontend/components/Tooltip.tsx` | Token swap (`bg-ci-text`), `mb-1.5`, `leading-none` | +1 / -1 |
| `frontend/components/WarningsList.tsx` | Token swap (`ci-warning/20`, `ci-warning-bg`), `font-body text-xs` | +8 / -5 |
| `frontend/tailwind.config.ts` | Full design token system (colors, fonts, fontSize, letterSpacing) | +31 / -1 |

**No backend, type, or test changes.** The redesign is purely frontend.

---

## Code Review Findings (verbatim from the user, verified against the current code)

### CRITICAL — ARIA tab pattern is broken

`frontend/app/page.tsx` lines 149–166 declare the tablist correctly (`role="tablist"`, `aria-label`, `role="tab"`, `aria-selected`), but the implementation fails in **three** distinct ways, two of which are worse than the review summary suggests:

1. **Keyboard navigation is dead code.** `handleTabKeyDown` (lines 78–108) is fully implemented with ArrowLeft/Right/Home/End, preventDefault, RAF focus — but the `<button>` JSX (lines 150–165) never wires `onKeyDown={handleTabKeyDown}`. Arrow keys do nothing today.
2. **No `aria-controls` / `id` linkage.** Buttons have no `id`, panel has no `id`, so screen readers cannot announce the tab ↔ panel relationship. The `tabPanelId(tabId)` helper (line 25) is defined but never called.
3. **Single `<div role="tabpanel">` for all three tabs.** Even when the right content renders inside, the panel's `aria-labelledby` is missing and the panel is never associated with the active tab.

This is the single highest-priority fix. Without it, the redesign ships an accessibility regression: a tablist that *claims* ARIA compliance but is functionally identical to a row of styled buttons.

### WARNING — GCodeViewer recomputes dimensions on every render

`frontend/components/GCodeViewer.tsx` lines 29–48:
```ts
let effectiveW = workAreaW;
let effectiveH = workAreaH;
// ... validation fallback ...
const aspectRatio = effectiveW / effectiveH;
let canvasWidth: number;
let canvasHeight: number;
if (aspectRatio > 1) { ... } else { ... }
```

These are local `let` variables, not memoized. The useEffect dep array on line 140 lists them: `[gcode, parsed, effectiveW, effectiveH, canvasWidth, canvasHeight]`. With Object.is comparison, the effect itself does NOT re-run when props are unchanged (numbers are compared by value), so the review's headline "redraws every render" is technically overstated. **However:**
- The dimensions are recomputed in the render body on every render regardless.
- More importantly, the dep array re-creates with fresh `let` captures every render, which is a code-smell and obscures the actual trigger conditions.
- The component mixes pure derivation (dimensions) with imperative side effects (canvas drawing) in a way that makes future refactors (e.g., moving to a `<canvas>` ref that handles its own RAF) harder.

Fix: wrap dimensions in `useMemo`, OR move the calculation into the effect, OR derive inside the component as `const { canvasWidth, canvasHeight } = useMemo(...)`.

### WARNING — ImageDropzone `role="button"` has no onKeyDown

`frontend/components/ImageDropzone.tsx` line 89–104:
```tsx
<div
  onClick={onClick}
  onDrop={onDrop}
  onDragOver={onDragOver}
  onDragLeave={onDragLeave}
  role="button"
  tabIndex={disabled ? -1 : 0}
  aria-disabled={disabled}
>
```

Tabbable, role-correct, but pressing Enter or Space does nothing. The file input is hidden, so keyboard-only users have no path to select a file. Fix: add `onKeyDown` that triggers `inputRef.current?.click()` on Enter/Space. Note: a cleaner architectural fix is to render an actual `<button>` wrapping the drop zone (or use a `<label>` wrapping the file input, which gets the keyboard behavior for free).

### WARNING — `console.warn` for invalid work area dimensions removed

`frontend/components/GCodeViewer.tsx` line 31–36 silently falls back to A4 defaults when `workAreaW` or `workAreaH` is invalid (NaN, 0, negative). Pre-redesign this emitted a `console.warn`. Now the user/developer has no signal that bad dimensions were passed. The fallback is correct (the page can't render to a non-finite canvas), but the silence is a regression. Fix: restore the `console.warn` — a `console.warn` is appropriate here because the upstream contract is "always pass finite positive numbers" and the fallback is a defensive measure, not a happy path.

### WARNING — Toggle uses arbitrary pixel translate values

`frontend/components/Toggle.tsx` line 30:
```tsx
enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
```

These are off-scale magic numbers. They work for the current `h-5 w-9 / h-3.5 w-3.5` geometry, but:
- They duplicate the component's internal layout (track width − thumb width − 2× padding = 36 − 14 − 4 = 18; padding-only = 3).
- The previous version used `translate-x-6` and `translate-x-1` (on the spacing scale, 24px and 4px) which at least encoded the design intent.
- If the track size ever changes, these need manual recomputation.

Fix: derive from the Tailwind spacing scale, or use a CSS variable, or use `peer-checked` / `:checked` pseudo-state with `peer` on the button so the translate is computed from CSS custom properties.

### SUGGESTION — Duplicated empty states

Three components render near-identical "no data" placeholders:
- `CanvasPreview.tsx` lines 43–51
- `GCodeOutput.tsx` lines 50–58
- `GCodeViewer.tsx` lines 94–105 (drawn on canvas, not DOM — but same idea)

All three share the pattern: centered `flex h-64`, `rounded-lg border border-ci-rule bg-ci-bg/60`, `font-body text-sm tracking-precise text-ci-muted`. Only the copy differs. Worth extracting a single `<EmptyState>` component (or a canvas-paintable helper) — the skill's writing guidance ("Treat failure and emptiness as moments for direction") and DRY principle both push this way.

### SUGGESTION — Removed JSDoc

Six files lost their JSDoc blocks in the diff. Most are trivial ("Render the uploaded image…"). One is genuinely useful:

- `GCodeViewer.tsx` had a comment explaining the Y-axis flip:
  > "The Y axis is flipped so G-Code coordinates (origin bottom-left) map correctly to canvas coordinates (origin top-left)."

That comment is non-obvious and worth restoring. The other five are dispensable if the function name and props are clear.

### SUGGESTION — Magic number 24px duplicated

The coordinate grid lives in **two** places:
- `globals.css` `.bg-grid` utility: `background-size: 24px 24px` (lines 17, 24)
- `GCodeViewer.tsx` `gridSpacingPx = 24` (line 71)

If the design ever decides a 10mm cell should be 20px or 30px, two places must change in lockstep. Fix: define a CSS custom property (`--grid-cell: 24px` in `globals.css`) and read it from both — or just use the Tailwind `bg-[length:var(--grid-cell)]` pattern.

### SUGGESTION — `useEffect` in ParameterPanel that derives preset from W/H

`frontend/components/ParameterPanel.tsx` lines 183–191:
```tsx
useEffect(() => {
  const w = params.scara?.work_area_w_mm;
  const h = params.scara?.work_area_h_mm;
  const match = WORK_AREA_PRESET_NAMES.find(/* ... */);
  setWorkAreaPreset(match ?? 'Custom');
}, [params.scara?.work_area_w_mm, params.scara?.work_area_h_mm]);
```

The review flagged this as "overly broad useEffect deps." After re-reading, the deps are actually **tight** (only the two values that matter, not the whole scara object) and the effect is functionally correct. The real issue is **architectural**: `workAreaPreset` is essentially derived state being mirrored into local state via an effect. Idiomatic React would compute it inline:
```tsx
const workAreaPreset = useMemo(() => {
  const w = params.scara?.work_area_w_mm;
  const h = params.scara?.work_area_h_mm;
  return WORK_AREA_PRESET_NAMES.find(/* ... */) ?? 'Custom';
}, [params.scara?.work_area_w_mm, params.scara?.work_area_h_mm]);
```
And remove the effect + the `useState` for `workAreaPreset`. The select becomes a derived-value select, and `handleWorkAreaPreset` simply calls `onChange`.

This eliminates a state-source-of-truth question (which wins: local state or derived value?) and removes a useEffect that exists only to mirror state.

---

## Frontend-Design Skill Evaluation

The frontend-design skill emphasizes grounding choices in the subject, avoiding AI-default looks, spending boldness in one place, and treating written copy as design material. Applying each principle to the redesign:

### Grounding in the subject
**Subject**: image → G-Code conversion for a SCARA robotic arm. Workshop / engineering / mm-scale precision.

- ✅ **Graph paper grid (24px) as the visual signature** — directly evokes the subject's world (engineering paper, mm scales, drafting tables). This is the single best choice in the redesign and the only element that could be called "this is CIPRA, not anyone else."
- ⚠️ **DM Serif Display on the h1** is editorial / publication-leaning, not industrial. A geometric grotesque (e.g., Söhne, Inter Display) or a technical monospace display would fit "SCARA / mm / precision" better. The serif is restrained to a single heading, so it's not jarring — but the contrast between "editorial serif h1" and "technical canvas tool" is the one place the design and subject slightly disagree.
- ✅ **JetBrains Mono for G-Code pre block** — perfect functional choice.
- ✅ **English copy** — generic tool language, not workshop-specific. "Pixel to path, precisely" is fine but the tagline could lean harder into the subject (e.g., "From photo to G-Code in three clicks" — but that may oversell).

### Avoiding AI defaults
- ✅ The palette (cool slate `#1E3A5F`, off-white `#F6F7F9`, neutral grays) is **not** warm cream, not near-black, and not the broadsheet look. It reads as "tool, not editorial, not Apple-derivative."
- ⚠️ The 24px grid + uppercase eyebrows (`text-2xs uppercase tracking-wider`) gesture slightly toward the "broadsheet / hairline rules" default. The skill explicitly warns about this. It's contained here (used for SectionLabel only) but worth noting.
- ⚠️ Uppercase small-caps labels with `tracking-wider` is one of the most over-used SaaS conventions of 2024–2025. It's defensible (it works), but it's not distinctive.

### Boldness in one place
- **The graph paper grid is the boldness.** It is the only element that could be called "this design is for THIS subject." But it's rendered at 4% opacity — felt, not seen. The skill says "let the signature element be the one memorable thing" and "spend your boldness in one place." Here the boldness is in the right place but at a whisper. A bolder grid (8–10% opacity) would make it legible without competing with content. A bolder grid would also justify having it in two places (CSS utility + canvas) instead of one.

### Restraint and self-critique
- ✅ **prefers-reduced-motion respected** globally.
- ✅ **`:focus-visible` ring** as base, `.focus-ring` utility.
- ✅ `max-w-3xl` (768px) reading column — appropriate for a tool, not a marketing page.
- ⚠️ The **three-font system** (display + body + mono) is one more family than strictly needed. Display is only on the h1. If the h1 is the only display use, a single `font-display` utility is fine, but the cost (one extra `<link>` request, three families in the bundle) should be acknowledged as a real choice.
- ✅ **Removed decorative emoji** (`✓ Copied!`, `✗ Copy failed` → plain "Copied" / "Copy failed") — the skill's writing principle in action: "describe what something does in plain terms."

### Writing quality
- ✅ Empty states: "Upload an image to preview" / "Convert an image to generate G-Code" / "Convert an image to see the toolpath" — all start with an action verb, all direct. Skill-aligned.
- ✅ Tooltips: "Multiplies the final drawing size. 1.0 = original size." — gives the default value, which is the right level of help.
- ⚠️ **"Reset all defaults"** is redundant. "Restore defaults" or "Reset to defaults" or "Reset all" are cleaner. Five "Reset" buttons in one panel (four per-param + one master) is a lot of visual noise.
- ⚠️ **"Live"** indicator is `text-2xs uppercase muted` — too quiet for a status that should be reassuring. Could be a small filled dot + "Live" text, or a `bg-ci-accent-subtle` pill.

---

## Additional Findings (not in the original review)

### Dead code
- `frontend/app/page.tsx` line 25: `function tabPanelId(tabId: TabId): string { return 'tabpanel-${tabId}'; }` is defined but never called. Once the ARIA fix wires it up, this becomes live; until then it's orphaned.

### Inconsistent iconography
- The work area accordion uses a literal `▼` Unicode character (line 414 in `ParameterPanel.tsx`).
- The `Live` indicator uses uppercase text only.
- The copy button uses text only.
- The download button uses text only.
- The `↺` glyph that USED to mark the per-param reset buttons was correctly removed.
- The mix is fine for a minimal direction, but a "system" should pick one register: either Unicode characters (`▼`, `✓`, `↺`) or text labels, not both inconsistently. Current state: only `▼` remains as a literal character, which is OK but stands alone.

### Header & tagline
- The h1 "CIPRA" uses `font-display text-3xl tracking-tight` — at 3xl (30px) the DM Serif Display is barely distinguishable from a normal serif. The display font only earns its keep at larger sizes (4xl+). At 3xl, swapping to `font-body font-semibold` would lose nothing visually. Worth considering whether `font-display` is being used where it can be noticed.

### Bottom sticky bar UX
- The footer is `sticky bottom-0` with `bg-white/95 backdrop-blur-sm`. Good frosted-glass treatment.
- `pb-24` on `<main>` reserves space for the bar so the bottom content doesn't hide under it. Good.
- But the header is NOT sticky — on long pages the user has to scroll back up to see the brand. This is fine for a single-screen tool, but on mobile (where the parameter panel alone is 1000+px tall) the absence of a sticky brand may feel disorienting.

### Color tokens — surface and rule-strong barely used
- `ci-surface #FFFFFF` is defined but `bg-white` is used everywhere instead. Either remove the token or migrate `bg-white` → `bg-ci-surface`.
- `ci-rule-strong #C4CAD4` is used in two places (ImageDropzone hover, Toggle off-state). Otherwise dormant. Acceptable as a hover-state semantic.

### `useEffect` warning in GCodeViewer is a real but minor bug
When the parent re-renders with the same `workAreaW`/`workAreaH` props, the values fall through the validation and recompute. The effect does NOT re-run (Object.is on equal numbers returns true), so the canvas does NOT redraw. The review's "redraws every render" is overstated. But the dimensions ARE recomputed in the render body on every render — a minor waste and a smell that suggests moving the computation into the effect or memoizing it.

### The 'Real-time' toggle position
The Toggle is the **last** control in the parameter panel, AFTER the work area accordion, AFTER the reset button. "Real-time generation" is one of the most important workflow controls (it determines whether you click Convert or not) and it's hidden at the bottom of a long panel. Consider promoting it to the sticky footer next to Convert, or to a higher position in the panel.

---

## Recommendations

The redesign is a clear improvement. Recommended fix order:

### Block (must fix before merge)
1. **Wire ARIA tabs in `page.tsx`** — add `id` to buttons, `aria-controls={tabPanelId(tabId)}`, `id={tabPanelId(activeTab)}` and `aria-labelledby` on the panel, and `onKeyDown={handleTabKeyDown}` on the buttons. This is the only CRITICAL item.
2. **Add `onKeyDown` to ImageDropzone** — Enter/Space triggers `inputRef.current?.click()`. (Or refactor the dropzone to a `<label>` wrapping a styled file input — gets keyboard behavior for free.)
3. **Restore `console.warn` in GCodeViewer** for invalid W/H. A `console.warn` is appropriate because the fallback is defensive, not a happy path.

### Should fix in the same PR (or as a follow-up)
4. **Wrap GCodeViewer dimensions in `useMemo`** — clarity + small perf win.
5. **Replace Toggle magic pixels** with derived values from the spacing scale or a CSS custom property.
6. **Extract `<EmptyState>` component** — deduplicate CanvasPreview / GCodeOutput placeholders.
7. **Restore the Y-axis comment in GCodeViewer** — non-obvious behavior worth documenting.
8. **Define `--grid-cell` once** — share between `.bg-grid` and `GCodeViewer`'s canvas grid.
9. **Convert `workAreaPreset` to derived state** in `ParameterPanel` — drop the effect + local state.
10. **Restore JSDoc only where it adds non-obvious info** (Y-axis flip; the other five are dispensable).

### Optional / design polish
11. **Bolder graph paper grid** — 6–8% opacity instead of 4%. Make the signature visible.
12. **Promote the Real-time toggle** to the sticky footer or a higher position in the panel.
13. **Replace "Reset all defaults"** with "Restore defaults" or "Reset all".
14. **Pick one icon register** — either Unicode characters or text, not a mix.
15. **Consider `bg-ci-surface` instead of `bg-white`** to actually use the new token.
16. **Decide on `font-display`** at h1 3xl — if the serif isn't visible at this size, drop it from the h1 and use `font-body font-semibold` or larger display size.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Shipping a tablist that claims ARIA compliance but isn't keyboard-operable | **High if merged as-is** | Screen-reader users and keyboard-only users are blocked from the second and third tabs. Fails WCAG 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value). | Fix #1 above is non-negotiable. Add an e2e test (Playwright + axe-core) that exercises the tablist. |
| Tab panel/button id collisions if the component is mounted twice | Low | Mismatched ARIA associations between two instances of the page. | Use `useId()` (React 18+) instead of static `'tabpanel-${tabId}'` strings. |
| `console.warn` removal hides upstream contract violations | Medium | Hard-to-debug rendering at the default 210×297 when the user is convinced they entered a valid work area. | Restore the warn AND add a non-blocking UI signal (e.g., toaster or inline message) when invalid dimensions are entered. |
| Toggle pixel values drift when design tokens change | Low | Visual regression — toggle thumb misaligned. | Derive from the spacing scale or move to a CSS custom property. |
| Single-column layout with no mobile breakpoint planning | Medium | On small screens, the parameter panel's nested grid (work area W/H + travel/draw speed, both 2-col) may be cramped. | Verify at 375px and 414px. The current `grid-cols-2` should stack below `sm` but doesn't have an explicit `sm:grid-cols-2` modifier. |
| The grid-24 magic number is duplicated in CSS and TS | Low | Drift when the design changes. | Centralize as a CSS variable. |

---

## Frontend-Design Verdict

**Visual direction**: distinctive, deliberate, restrained. The cool-slate palette + graph-paper grid + DM Serif heading is a coherent identity that doesn't match any of the three AI-default looks. The graph paper is the right signature — it grounds the design in the subject (SCARA, mm, precision) in a way that no other choice would.

**Boldness**: in the right place (the grid), at the wrong intensity (4% is felt but not seen). One small tweak (6–8% opacity) would make the signature legible.

**Typography**: three families is one more than strictly necessary. The display face is only used in the h1 and barely visible at 3xl. Either commit to it (use 4xl+) or drop it.

**Copy**: clean, action-oriented, no decorative emoji. The "Reset" button flood is the one copy-clustering smell.

**Component hygiene**: PillButton and SectionLabel are extracted locally (good), but not promoted to `components/ui/` (worth considering if the change expands). Empty states duplicated (worth extracting).

**Verdict**: this is a solid design system reset that does the thing the skill asks for — pins down a direction specific to the subject, avoids AI defaults, and holds back from over-decorating. The remaining issues are mechanical (ARIA wiring, keyboard support, magic numbers) rather than aesthetic. The proposal phase can frame this as a near-ship-ready change with a short fix list.

---

## Ready for Proposal

**Yes.**

The orchestrator should proceed to `sdd-propose`. The proposal should:

1. Frame the change as a **design system reset** for CIPRA, anchored to the graph-paper signature.
2. Inherit the verified code-review findings as the work backlog (10 fix items above, organized by severity).
3. Note that **fixes #1–#3 are must-ship** (CRITICAL ARIA + 2 WARNINGS); #4–#10 are should-ship; #11–#16 are polish.
4. Call out the 400-line review budget risk: the redesign is 1127 lines (additions + deletions). The proposal should recommend **chained PRs**:
   - **PR 1**: design system foundation (tokens, fonts, utilities, layout shell) — `globals.css`, `tailwind.config.ts`, `layout.tsx`, `page.tsx` shell
   - **PR 2**: component restyling (CanvasPreview, GCodeOutput, GCodeViewer, ImageDropzone, Toggle, Tooltip, WarningsList)
   - **PR 3**: tab interface + ParameterPanel restructure
   - **PR 4**: ARIA + keyboard + accessibility fixes (the critical correctness PR)
   This matches the `chained-pr` skill's pattern: each PR is reviewable in isolation, autonomous, and has a clear rollback.
5. Add a verification step: `npm run build`, manual tablist keyboard test, axe-core scan of the new UI.
6. **Don't** add a test infrastructure ask. The previous change (`ux-polish-and-features`) explicitly excluded frontend tests; that decision is still current and shouldn't be reopened here.

### Open questions for the user (one at a time, per persona rules)

None blocking. The next phase can proceed without clarification.

### Artifacts this phase produced

- **Engram**: `sdd/frontend-redesign/explore` (architecture) — `capture_prompt: false`
- **OpenSpec**: `openspec/changes/frontend-redesign/exploration.md` (this file)
- **No engram prompt capture** (set `capture_prompt: false` because this is an SDD pipeline artifact, not a human/proactive memory save)
