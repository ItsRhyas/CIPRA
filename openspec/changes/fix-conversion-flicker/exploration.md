## Exploration: fix-conversion-flicker (round 2)

> **Re-investigation**: Previous fixes (`1160c41`, `f801f8a`) addressed `setResult(null)`, auto-tab-switch, reset-on-new-image, I18nProvider `useMemo`, and `I18nProviderWrapper` `React.memo`. Flicker persists on every conversion. This round investigates the ROOT CAUSE that survives all those fixes.

### Current State (post-fixes)

**`hooks/useConvert.ts` (95 lines)** — `setResult(null)` is gone (line 65-66 now only does `setState('uploading')` + `setError(null)`). `result` persists across the request and is only cleared by `reset()`. The two remaining state writes per conversion are:
- Pre-await: `setState('uploading')` + `setError(null)` (line 65-66)
- Post-await: `setResult(response)` + `setState('success')` (line 76-77)

**`lib/i18n/I18nProvider.tsx` (93 lines)** — Context value is memoized at line 86: `useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])`. `t` itself is `useCallback` with `[locale]` deps (line 65-84). The provider only re-renders on locale change.

**`app/I18nProviderWrapper.tsx` (14 lines)** — Wrapped in `React.memo` (line 10).

**`app/page.tsx` (291 lines)** — `useT()` at line 23, `isManualConvertRef` guard at line 36, auto-tab-switch guarded at line 84-93, debounced effect with `t` in deps at line 95-102, `handleFileSelect` with `reset()` at line 113-118, `LanguageSwitcher` in footer at line 265.

**Layout structure (post-i18n, the major change):**
- Root: `flex min-h-screen flex-col` (page.tsx:129)
- Header: `border-b border-ci-rule bg-white` (page.tsx:131)
- Main: `flex-1` with `pb-24 pt-8` (page.tsx:143)
- Footer: `sticky bottom-0 z-20 border-t border-ci-rule bg-white/95 backdrop-blur-sm` (page.tsx:257)
- Tab content wrapper: `min-h-[450px]` (page.tsx:200)
- Two-column grid: `md:grid-cols-[2fr_1fr]` (page.tsx:150)

### Root Cause Analysis

**The `t` function and i18n context are CORRECTLY stable.** The chain is:
1. `t = useCallback(..., [locale])` in I18nProvider — stable
2. `value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])` in I18nProvider — stable
3. `useT()` returns `ctx.t` directly — same reference
4. `I18nContext.Provider value={value}` — context consumers don't re-render
5. `I18nProviderWrapper` is `React.memo` — wrapper doesn't re-render

In Next.js App Router, the layout (server component) does NOT re-render when the page (client component) state changes. So `I18nProviderWrapper` never re-renders during conversion regardless of `React.memo`. The memoization is correct but a no-op in practice.

**The remaining flicker is caused by the sticky footer's CSS stack**, not by React re-renders. Specifically:

**1. The `backdrop-blur-sm` + `bg-white/95` on the footer (page.tsx:257).** This combination creates a filter+transparency stack that the browser renders on a GPU layer. When the main content behind the footer re-renders (which happens on every conversion state change), the browser must:
- Recompute the blurred backdrop (the entire region of the page that's behind the footer)
- Recomposite the footer layer onto the main layer

The recomputation + recomposite happens in a separate frame from the main render. On some browsers (especially Chromium-based), this causes a **visible flash** where the footer briefly shows the un-blurred/un-composited state before the GPU layer catches up. The flash is perceived as a "jump" because the semi-transparent white background (`bg-white/95`) momentarily shows the main content at full opacity underneath.

**2. The footer's "Generating…" text appearing/disappearing (page.tsx:261-263).** This is the trigger that forces the re-render behind the footer. The text is inside the left flex group, alongside the `LanguageSwitcher`. The footer height calculation:
- Left group: max(LanguageSwitcher 32px, "Generating…" 20px) = 32px
- Right group: buttons 36px (py-2 + text-sm line-height 20)
- Outer flex: max(32, 36) = 36px + py-3 (24px) + border-t (1px) = **61px stable**

So the footer height is stable. But the **content** behind the footer changes (because the main grid re-renders). This is what forces the blur recomputation.

**3. The two-column grid with `min-h-[450px]` (page.tsx:200) + `md:grid-cols-[2fr_1fr]` (page.tsx:150).** The grid row height is the MAX of the two columns. The left column has `min-h-[450px]`. The right column has the ParameterPanel. When the page re-renders, the ParameterPanel re-evaluates its layout (even though its output is the same). In some browsers, the grid re-resolves the row height during the re-render, causing a 1-2px fluctuation that crosses the scrollbar threshold. When the scrollbar appears/disappears, the entire page content shifts horizontally by ~15px (the scrollbar width). **This is the most likely explanation for the "header flickers"** — the header is at the top of the page, so a horizontal shift moves it visibly.

**Why it didn't happen before i18n**: The pre-i18n layout (commit `a22638e`'s parent) was a single column with `max-w-3xl px-6` and Convert/Reset buttons inline in the page content. There was no sticky footer, no `backdrop-blur-sm`, and no two-column grid. The single column's content height was dominated by the ParameterPanel, which was always below the canvas, not beside it. The scrollbar behavior was different (the page was narrower at 768px max, so content fit more easily without triggering scrollbar changes).

### Affected Areas

- `frontend/app/page.tsx:257` — Footer with `backdrop-blur-sm` and `bg-white/95` is the primary visual flash source
- `frontend/app/page.tsx:200` — `min-h-[450px]` on tab content interacts with the two-column grid to potentially cause 1-2px row height fluctuations
- `frontend/app/page.tsx:150` — `md:grid-cols-[2fr_1fr]` grid may re-resolve on re-render
- `frontend/app/page.tsx:261-263` — "Generating…" text appearance/disappearance is the trigger for the footer recomposite
- `frontend/app/page.tsx:143` — `pb-24` on main reserves space for the sticky footer

### Approaches

1. **Remove `backdrop-blur-sm` and `bg-white/95` from the footer; use solid `bg-white`** — eliminates the GPU compositing layer entirely. Footer becomes a simple opaque block. No blur recomputation, no recomposite flash.
   - Pros: Eliminates the primary visual flash source. Simplest diff (one Tailwind class). No functional regression — the blur was decorative.
   - Cons: Loses the frosted-glass aesthetic. Footer becomes a solid bar (acceptable for a utility bar).
   - Effort: **Low** (1 class change in page.tsx:257).

2. **Add `overflow-y: scroll` to the root `div` (page.tsx:129)** — forces a permanent scrollbar gutter, preventing the scrollbar from appearing/disappearing. This is a defensive measure that prevents the horizontal-shift theory regardless of whether it's the actual cause.
   - Pros: Defensive against any 1-2px content height fluctuation. Standard pattern for preventing CLS from scrollbar.
   - Cons: Always-visible scrollbar gutter (even when not needed) wastes ~15px of horizontal space. Slight visual change.
   - Effort: **Low** (1 CSS property on the root div).

3. **Move "Generating…" to a fixed overlay (not inside the footer)** — a small floating pill near the Convert button. Footer content stays static during conversion.
   - Pros: Footer never re-renders during conversion. No blur recomputation trigger.
   - Cons: Changes the UX design (status indicator moves). More code.
   - Effort: **Medium** (new component + positioning logic, ~15-20 lines).

4. **Memoize the footer as a separate component** — extract the footer JSX into a `Footer` component wrapped in `React.memo`. Since the footer only re-renders when its props change, and its props are stable (the LanguageSwitcher is the only dynamic child), this prevents the footer from re-rendering during conversion state changes.
   - Pros: Prevents the footer from re-rendering at all during conversion. No blur recomputation.
   - Cons: Doesn't help if the blur is triggered by the MAIN content changing (which it is). The blur depends on what's behind the footer, not the footer itself.
   - Effort: **Low** (extract component, ~20 lines).

5. **Remove the `min-h-[450px]` from the tab content wrapper** — let the tab content size naturally. This prevents the grid row from being artificially constrained.
   - Pros: Eliminates the grid row height fluctuation theory. The tab content's natural height varies by content (CanvasPreview vs GCodeViewer), but the `space-y-4` on the left column already provides vertical rhythm.
   - Cons: If the tab content is shorter than the right column (ParameterPanel), the right column stretches and the left column has empty space at the bottom. This was the original reason for `min-h-[450px]`.
   - Effort: **Low** (1 class change). But may need to add a min-height to the right column or accept asymmetric columns.

6. **Combine 1 + 2** — solid footer + permanent scrollbar gutter. Belt-and-suspenders approach that addresses both theories.
   - Pros: Highest confidence fix. Addresses both the blur flash and the scrollbar shift.
   - Cons: Two small visual changes (solid footer instead of frosted, always-visible scrollbar).
   - Effort: **Low** (2 class changes).

### Recommendation

**Approach 6 (combine 1 + 2)** is the right call for this round.

Reasoning:
- Approach 1 (solid footer) is the most direct fix for the blur recomposite flash. The `backdrop-blur-sm` is the single most expensive visual effect in the layout and the most likely source of the perceived flicker. Removing it is a one-class change with no functional regression.
- Approach 2 (permanent scrollbar gutter) is a standard defensive pattern. Even if the scrollbar shift is not the current cause, it prevents future regressions from any 1-2px content height change. The cost is ~15px of horizontal space, which is negligible at the `max-w-5xl` (1024px) width.
- Approaches 3, 4, 5 are not addressing the root cause as directly. Approach 3 changes the UX design. Approach 4 doesn't help (the blur depends on what's behind the footer). Approach 5 may reintroduce the original asymmetric-column problem that `min-h-[450px]` was added to solve.

**Concrete shape of the fix (for the proposal phase):**
1. `app/page.tsx:257` — change `bg-white/95 backdrop-blur-sm` to `bg-white` on the footer. One class change.
2. `app/page.tsx:129` — add `overflow-y-scroll` to the root `<div className="flex min-h-screen flex-col">`. One class addition.

**Diagnostic step before applying**: Open Chrome DevTools → Performance tab → record during a conversion. Look for:
- "Compositor" frames with "Update layer tree" — confirms the blur recomposite theory
- "Layout" entries with "Layout shift" — confirms the scrollbar shift theory
- "Paint" entries in the footer area — confirms the visual flash

This will definitively confirm which theory (or both) is the cause.

### Risks

- **Visual regression on footer**: Removing `backdrop-blur-sm` changes the footer from a frosted-glass look to a solid bar. This is a deliberate design change, not a bug. The footer is a utility bar, not a decorative element.
- **Permanent scrollbar gutter**: ~15px of horizontal space is always reserved for the scrollbar, even when the page doesn't scroll. On narrow viewports (< 400px), this is noticeable. The page already has `max-w-5xl` (1024px) so this is unlikely to be an issue on desktop.
- **Both changes together are more disruptive than either alone**: If the user wants to preserve the frosted-glass look, Approach 1 alone is sufficient. If the user wants to preserve the natural scrollbar behavior, Approach 2 alone is sufficient. Combining them is the safest fix but changes two visual properties.
- **The flicker might be caused by something I haven't identified**: The two theories (blur recomposite, scrollbar shift) are my best guesses from code analysis alone. Browser-level debugging is needed to confirm. If neither theory is correct, the fix won't work and further investigation is needed.

### Ready for Proposal

**Yes**, with the caveat that a quick browser-level diagnostic (Chrome DevTools Performance recording during a conversion) should be done first to confirm the root cause. The fix is small (2 class changes) and low-risk, so it can be applied without a full proposal cycle. If the diagnostic confirms a different cause, the proposal can be adjusted.
