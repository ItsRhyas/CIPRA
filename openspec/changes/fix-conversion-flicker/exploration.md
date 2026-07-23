## Exploration: fix-conversion-flicker

### Current State

The CIPRA frontend has a real-time mode (`realtime` toggle, `app/page.tsx:30`) that re-fires the conversion 500ms after any parameter change. The user reports the **whole page** flickers/jumps during conversion, both in real-time mode and on manual button click.

**State machine** (`hooks/useConvert.ts`):
- `convert()` (line 51) synchronously batches three `setState` calls before awaiting the API:
  1. `setState('uploading')` — line 65
  2. `setResult(null)` — line 66  ← clears the previous G-Code
  3. `setError(null)` — line 67
- On success: `setResult(response); setState('success')` (lines 77-78)
- `reset()` is the only other place `setResult(null)` is called (line 47)

**Page wiring** (`app/page.tsx`):
- `result` is consumed in three places: `GCodeViewer gcode` (line 194), `GCodeOutput gcode` (line 203), `WarningsList warnings` (line 234)
- A `useEffect` (lines 83-87) auto-switches `activeTab` to `'viewer'` on every success
- A debounced `useEffect` (lines 89-95) re-triggers `convert()` 500ms after any change in `[file, params, realtime, convert, t]`
- Footer conditionally renders `{t('status.generating')}` when `isUploading` (lines 245-249)

**GCodeViewer** (`components/GCodeViewer.tsx`):
- `parsed = useMemo(() => gcode ? parseGCode(gcode) : null, [gcode])` (line 36-39) — recomputes from non-null to null on every conversion
- The draw `useEffect` (line 69) deps: `[gcode, parsed, effectiveW, effectiveH, canvasWidth, canvasHeight, fallbackText, t]`
- When `gcode` flips to `null`, the effect clears the canvas (`ctx.clearRect`), fills white, draws the empty-state fallback text (lines 76-130)
- When the new gcode arrives, the effect re-runs and redraws all travel + stroke paths

**I18nProvider** (`lib/i18n/I18nProvider.tsx`):
- The context value `{ locale, setLocale, t }` is NOT memoized (line 86) — new object every render. The provider itself only re-renders on locale change, so this is not a real cause of flicker in this flow. (It would matter if we ever started re-rendering the provider during conversion, which we don't.)

### Affected Areas

- `frontend/hooks/useConvert.ts` — `convert()` clears `result` at line 66, causing the empty-state cascade
- `frontend/app/page.tsx` — `useEffect` at lines 83-87 forces tab switch on every success (line 85), and the debounced `useEffect` at lines 89-95 re-triggers convert
- `frontend/components/GCodeViewer.tsx` — Draw effect at line 69 re-runs and clears canvas when `gcode` flips to `null` and back

### Root Cause Analysis

The user's hypothesis is **partially correct but incomplete**. The flicker is actually the **sum of three independent re-render events** that happen in sequence during a single conversion cycle:

1. **`setResult(null)` at start of `convert()` (line 66)** — the *initial* flicker. In the same render commit as `setState('uploading')`, the page re-renders with `result === null`. The GCodeViewer effect (line 69) clears the canvas and draws the empty-state fallback text. The WarningsList disappears. The GCodeOutput (if on that tab) clears. Footer also gains the "Generating..." text in the same commit (the conditional `<p>` element appears, line 245).

2. **Tab auto-switch on success (page.tsx:83-87)** — the *second* flicker. When the new result arrives, the effect forces `activeTab = 'viewer'`. If the user was on the `preview` tab, the entire left-column tab content swaps. The `min-h-[450px]` wrapper keeps a fixed minimum, but the rendered content (canvas with aspect ratio vs. GCodeViewer with a 560×792 work area) is a different height, so the right column (params panel) shifts vertically.

3. **Canvas clear → full redraw on GCodeViewer (GCodeViewer.tsx:69-168)** — the *third* flicker. After the tab swap, the draw effect clears the canvas and re-runs all travel + stroke operations. This is synchronous and fast but still produces a visible flash from "empty" to "filled".

**Why it feels like the whole page moves**: the `useConvert` state changes commit *together* with the tab switch in real-time mode (the user is almost always on the `preview` tab while watching the image). The combined effect of (1) the GCodeViewer redrawing empty → filled, (2) the right column shifting due to tab swap, and (3) the footer height change (3px from the "Generating..." badge appearing/disappearing) is large enough to read as a whole-page jump.

The `setResult(null)` is the **dominant** cause. Removing it alone would eliminate the canvas clear and the WarningsList disappearance, which removes the most visible flash. But the tab auto-switch and the footer height change would still produce a smaller, secondary flicker.

### Approaches

1. **Remove `setResult(null)` and let result persist during loading** — `convert()` keeps the previous `result` until the new one arrives. Only `reset()` clears it.
   - Pros: Smallest diff. Eliminates the canvas-clear flash. Warnings stay visible. Old G-Code remains in the viewer tab so the user has continuous feedback.
   - Cons: User sees stale gcode during the 200-1500ms request window. If the new request errors, the stale result is still showing alongside the error (which may be confusing).
   - Effort: **Low** (delete one line + guard the success effect).

2. **Keep `setResult(null)` but suppress the auto-tab-switch during real-time mode** — track whether the conversion came from real-time vs. manual. Only auto-switch on manual `handleConvert` calls.
   - Pros: User keeps their current view in real-time mode; no content swap = no shift. Manual clicks still get the auto-switch convenience.
   - Cons: Doesn't fix the canvas clear flash. User has to manually click the viewer tab to see the new result in real-time.
   - Effort: **Low** (a new flag, ~5 lines in `page.tsx`).

3. **Keep previous result AND suppress auto-tab-switch in real-time + add a small "stale" badge on the viewer** — combines (1) and (2) and adds a "Regenerating..." pill on the GCodeViewer when the displayed gcode is stale.
   - Pros: Best UX. No flash, no shift, user is informed. Manual convert still auto-switches.
   - Cons: More code (stale tracking, badge component).
   - Effort: **Medium** (~20-30 lines across `useConvert`, `page.tsx`, `GCodeViewer`).

4. **Add a CSS opacity/transition overlay during conversion** — keep the canvas content but fade it under a translucent overlay while loading, fade out the overlay when new data lands.
   - Pros: Visual polish. Smooth feel.
   - Cons: Doesn't address the root cause; the underlying canvas still clears. Purely cosmetic.
   - Effort: **Medium** (overlay component + CSS).

5. **Batch all convert state into a single `useReducer`** — atomic state transitions, fewer re-render cycles.
   - Pros: Cleaner architecture, fewer re-renders by design.
   - Cons: Doesn't help if the same number of distinct UI bits still re-render. Refactor risk.
   - Effort: **High** (rewrites `useConvert`).

### Recommendation

**Approach 3** is the right call, but ship **Approach 1 first as the minimum viable fix**, then layer the stale badge on top if needed.

Reasoning:
- Approach 1 alone removes the dominant flicker (canvas clear + WarningsList disappear) with a one-line change. Risk is minimal because the only consumer that could be confused is the auto-tab-switch on success, which we should ALSO guard.
- The tab auto-switch should be conditioned on the conversion source. We can pass an `origin: 'manual' | 'realtime'` flag through `convert()` or maintain a small `ref` in `page.tsx` that tracks which call site fired the last convert.
- Once (1) + (2) are in place, the page should feel stable. The stale badge (3) is a UX nicety but not required to fix the bug.
- Approaches 4 and 5 are not addressing the root cause and add complexity for cosmetic gain.

**Concrete shape of the fix (for the proposal phase):**
1. `useConvert.convert()`: drop `setResult(null)` from the pre-await block. Keep `setState('uploading')` and `setError(null)`. The `result` only becomes `null` via `reset()`.
2. `useConvert`: add an optional `origin: 'manual' | 'realtime'` parameter to `convert()` that is stored in a ref and returned on the next render (or returned directly on the UseConvertReturn so `page.tsx` can read it).
3. `app/page.tsx`: change the auto-tab-switch effect to only fire when `result` is **newly set** and `origin === 'manual'`. (For real-time, leave the active tab alone so the user can keep previewing the image.)
4. Optional: a small "Regenerating..." pill on `GCodeViewer` when `gcode` is set but `state === 'uploading'`. Skip if (1)+(2) feel stable enough.

### Risks

- **Stale gcode shown on error**: if the new request errors, the previous result is still displayed alongside the error message. The error is shown above the warnings (page.tsx:224-231) so the user will see it, but we should test this flow.
- **Breaking the "stale data" assumption**: if the user changes the image entirely and we don't reset `result` between image changes, they'd see the old gcode for the old image while the new one loads. **Mitigation**: in `app/page.tsx` `handleReset` and on `setFile(null)`, call `reset()` so the result is cleared. The dropzone's `onSelect` (line 131) doesn't call `reset` today — if a user replaces the image, the old gcode stays. We should also reset on file change.
- **Real-time mode first convert**: if the user enables real-time mode for the first time on an image with no prior result, there's no stale data to show — the GCodeViewer just shows the empty state until the first success. That matches current behavior with the same empty-state path; no new risk.
- **i18n context value object identity**: the I18nProvider context value is re-created on every provider render (line 86). This is unrelated to the flicker today (provider only re-renders on locale change), but it WILL cause `useT()` consumers to re-render unnecessarily if the provider ever re-renders for another reason. Out of scope for this fix but worth flagging in the design phase.

### Ready for Proposal

**Yes.** Recommendation: Approach 1 (remove `setResult(null)`) + guard the auto-tab-switch for real-time mode. Both are minimal, low-risk changes that target the root cause. Optional stale badge if user testing shows it's needed.
