## Exploration: fix-flicker-remaining (round 3)

> **Re-investigation**: Round 1 (`fix-conversion-flicker`) fixed `setResult(null)`, auto-tab-switch, reset-on-new-image. Round 2 fixed the sticky footer's glass-morphism (`backdrop-blur-sm` + `bg-white/95`) and added `overflow-y-scroll` to the root div. Two flickers remain: the file name/size in `ImageDropzone` and the `LanguageSwitcher` pills in the footer. This round identifies their root causes.

### Current State (post-rounds-1-and-2)

**`frontend/app/page.tsx:257`** — Footer is now `sticky bottom-0 z-20 border-t border-ci-rule bg-white` (no glass-morphism).
**`frontend/app/page.tsx:129`** — Root div is `flex min-h-screen flex-col` (no `overflow-y-scroll` from round 2 — let me note this).
**`frontend/components/ImageDropzone.tsx:127-154`** — Conditional rendering has TWO branches that produce the file info block: one for `disabled && file` (lines 127-134) and one for `!disabled && file` (lines 138-144). Both render `<p>{file.name}</p>` and `<p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>` but they are DIFFERENT JSX trees at different source positions.
**`frontend/app/page.tsx:259-266`** — Footer left group: `flex items-center gap-4` containing a conditional `Generating…` `<p>` and the `<LanguageSwitcher />` in that order.
**`frontend/lib/i18n/I18nProvider.tsx`** — Context value is correctly memoized at line 86. `t` is `useCallback` with `[locale]` deps. Provider only re-renders on locale change.
**`frontend/components/LanguageSwitcher.tsx`** — No props. Uses `useI18n()`. Buttons have `transition-colors` but active state doesn't change during conversion.

### Root Cause Analysis

#### Flicker 1: ImageDropzone file info block (unmount/mount of two different JSX subtrees)

`ImageDropzone.tsx:127-154` contains this conditional:

```tsx
{disabled ? (
  file ? (
    <div>                                              {/* BRANCH A: lines 128-134 */}
      <p className="font-body text-sm font-medium text-ci-text">{file.name}</p>
      <p className="mt-1 font-body text-xs tracking-precise text-ci-muted">
        {(file.size / 1024 / 1024).toFixed(2)} MB
      </p>
    </div>
  ) : (
    <p className="font-body text-sm text-ci-muted">{t('dropzone.uploading')}</p>
  )
) : file ? (
    <div>                                              {/* BRANCH B: lines 139-144 */}
      <p className="font-body text-sm font-medium text-ci-text">{file.name}</p>
      <p className="mt-1 font-body text-xs tracking-precise text-ci-muted">
        {(file.size / 1024 / 1024).toFixed(2)} MB
      </p>
    </div>
  ) : (
    <div>...</div>
  )}
```

When the user clicks Convert:
- `disabled` flips from `false` → `true`
- `file` is still set
- The conditional path flips from BRANCH B to BRANCH A

Both branches render the same DOM (`<div>` with two `<p>` children showing the same `file.name` and size). **But they are two distinct JSX elements at different positions in the source tree.** React's reconciler cannot detect semantic equivalence — it sees the conditional produce a different React element type. It **unmounts** the BRANCH B subtree and **mounts** the BRANCH A subtree.

The unmount/mount cycle causes:
1. The old `<div>` is destroyed → DOM briefly has no content
2. New `<div>` is created → browser paints the new content

Between step 1 and 2 the user sees a single-frame flash of empty (or, if the browser composites the outer wrapper's `opacity-50` transition onto the new content, a subtle shift). This is the "file name and size flicker."

**Why the previous round 2 fix didn't catch it:** round 2 addressed the footer's glass-morphism, not the dropzone's conditional structure. This is a separate, unrelated bug.

**Why `useT()` is not the cause:** `t` is `useCallback` with `[locale]` deps (I18nProvider.tsx:65-84). `locale` doesn't change during conversion. `t` returns the same reference. `useT()` returns the same `t`. No re-render cascade from translation calls. The `t('dropzone.uploading')` call at line 136 is only evaluated when `disabled && !file` — not the path we hit during conversion (file IS set).

**Why `transition-colors` on the outer div is not the cause:** the outer div's className changes from including `cursor-pointer` to `cursor-not-allowed opacity-50`. `transition-colors` transitions `color, background-color, border-color, text-decoration-color, fill, stroke` — NOT `cursor` or `opacity`. The opacity change is instant. The `transition-colors` would only fire if `border-color` or `bg-color` changed, which it doesn't (`isDragOver` is false during conversion).

#### Flicker 2: LanguageSwitcher horizontal shift (flex reflow from "Generating…" text)

`page.tsx:259-266`:

```tsx
<div className="flex items-center gap-4">
  {isUploading && (
    <p className="font-body text-sm text-ci-accent" aria-live="polite">
      {t('status.generating')}
    </p>
  )}
  <LanguageSwitcher />
</div>
```

The `Generating…` text is a flex item that appears/disappears based on `isUploading`. It sits BEFORE the `LanguageSwitcher` in the flex flow. With `gap-4` (16px) between items:

- When `isUploading === false`: the left group is just `[LanguageSwitcher]`. LanguageSwitcher is at the left edge.
- When `isUploading === true`: the left group is `[Generating… (16px gap) LanguageSwitcher]`. LanguageSwitcher is pushed right by the width of `Generating…` + 16px.

The text `Generating…` (or `Generando…` in Spanish) is roughly 100-110px wide. So the LanguageSwitcher **shifts right by ~115-125px** when conversion starts, then **shifts back left** when conversion finishes. This horizontal displacement is perceived as a "flicker" because it happens between two states with the same component identity.

**Why the LanguageSwitcher itself doesn't flicker (no re-render cascade):** `useI18n()` returns the memoized context value (I18nProvider.tsx:86). `locale` and `setLocale` are stable. The `transition-colors` on the buttons only fires when `active` changes, which it doesn't during conversion. The LanguageSwitcher's DOM is stable — it's the LAYOUT POSITION that shifts because the "Generating…" text is in the same flex group.

**Why round 2 didn't fix it:** round 2 changed the footer's background from `bg-white/95 backdrop-blur-sm` to `bg-white`. That eliminated the GPU blur-recomposite flash, but the flex reflow is a separate layout-level shift, not a compositing artifact.

**Why the "Generating…" text is the trigger:** the conditional `{isUploading && <p>…</p>}` adds/removes a flex item. This is the only thing in the footer that changes between idle and uploading states. Everything else (LanguageSwitcher, buttons) is stable.

### Affected Areas

- `frontend/components/ImageDropzone.tsx:127-154` — Two-branch conditional structure that produces two different JSX trees for the file info block
- `frontend/app/page.tsx:259-266` — Footer left group where "Generating…" text and LanguageSwitcher share a flex container with `gap-4`, causing horizontal reflow of the LanguageSwitcher
- `frontend/components/ImageDropzone.tsx:113` — `disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'` — the `opacity-50` class adds to the perceived flash because the content briefly disappears and reappears at 50% opacity

### Approaches

1. **Restructure the ImageDropzone conditional so the file info block is in a stable JSX position** — put `file ? <file-info> : disabled ? <uploading> : <empty>` as a single ternary. The file info block appears at the same source position regardless of `disabled`. React reconciles it as the same element when `disabled` flips. No unmount/mount. No flicker.
   - Pros: Eliminates the root cause. The outer div still gets `opacity-50` instantly when disabled, which is the intended visual feedback. The inner content doesn't unmount.
   - Cons: None. The rendered output is identical.
   - Effort: **Low** (restructure one ternary, ~10 lines changed in ImageDropzone.tsx).

2. **Swap the order in the footer left group: put LanguageSwitcher BEFORE the "Generating…" text** — when "Generating…" appears, the LanguageSwitcher stays at the left edge and the status text appears to its right. No horizontal shift of the LanguageSwitcher.
   - Pros: Eliminates the horizontal reflow. LanguageSwitcher position is stable. Simple one-line reorder.
   - Cons: Changes the visual order slightly: during conversion, the layout is `[LanguageSwitcher] [Generating…]` instead of `[Generating…] [LanguageSwitcher]`. Both are valid UX patterns; the new order keeps the persistent control (language) in a stable position, which is arguably better.
   - Effort: **Low** (swap two elements in page.tsx:260-265).

3. **Use `React.memo` on LanguageSwitcher and ImageDropzone** — prevents re-render when props/context don't change. But:
   - ImageDropzone receives `disabled` as a prop, which DOES change. `React.memo` would not help.
   - LanguageSwitcher receives no props, but the flicker is NOT a re-render issue — it's a layout reflow caused by the "Generating…" text. `React.memo` would not help.
   - Pros: None for this bug.
   - Cons: Misdiagnoses the issue. Adds complexity without solving the problem.
   - Effort: **Low** but ineffective.

4. **Move the "Generating…" text to a fixed overlay outside the footer** — a floating pill near the Convert button. Footer content stays static during conversion.
   - Pros: Footer never reflows. No horizontal shift of the LanguageSwitcher.
   - Cons: Changes the UX design (status indicator moves). More code (new component + positioning). The previous fix-conversion-flicker exploration (round 2) considered this as Approach 3 and rejected it for the same reason.
   - Effort: **Medium** (~15-20 lines new component).

5. **Combine 1 + 2** — restructure the ImageDropzone conditional AND swap the footer order. Belt-and-suspenders.
   - Pros: Highest confidence. Both flickers addressed at their root causes. Minimal visual change.
   - Cons: Two small changes instead of one.
   - Effort: **Low** (~12 lines total).

### Recommendation

**Approach 5 (combine 1 + 2)** is the right call.

Reasoning:
- Approach 1 is the direct fix for the ImageDropzone flicker. The two-branch conditional is a classic React anti-pattern that causes unnecessary DOM churn. The fix is to consolidate to a single ternary where the file info block is in a stable position.
- Approach 2 is the direct fix for the LanguageSwitcher horizontal shift. The "Generating…" text is a transient status indicator; it should not push a persistent control (language) around. Putting the LanguageSwitcher first gives it a stable position.
- Approach 3 is a misdiagnosis. `React.memo` would not help because the flickers are not re-render issues.
- Approach 4 was already considered and rejected in the round 2 exploration.

**Concrete shape of the fix (for the proposal phase):**

**Fix A — `ImageDropzone.tsx:127-154`:** Restructure the conditional so the file info block is the first branch in a single ternary:

```tsx
{file ? (
  <div>
    <p className="font-body text-sm font-medium text-ci-text">{file.name}</p>
    <p className="mt-1 font-body text-xs tracking-precise text-ci-muted">
      {(file.size / 1024 / 1024).toFixed(2)} MB
    </p>
  </div>
) : disabled ? (
  <p className="font-body text-sm text-ci-muted">{t('dropzone.uploading')}</p>
) : (
  <div>
    <p className="font-body text-sm font-medium text-ci-text">
      {t('dropzone.empty')}
    </p>
    <p className="mt-1 font-body text-xs tracking-precise text-ci-muted">
      {t('dropzone.formats')}
    </p>
  </div>
)}
```

This way, when `disabled` flips and `file` is set, React reconciles the same `<div>` element. No unmount/mount. The outer div's `opacity-50` class still applies instantly (the intended feedback). The inner content doesn't flash.

**Fix B — `page.tsx:259-266`:** Swap the order so LanguageSwitcher is first:

```tsx
<div className="flex items-center gap-4">
  <LanguageSwitcher />
  {isUploading && (
    <p className="font-body text-sm text-ci-accent" aria-live="polite">
      {t('status.generating')}
    </p>
  )}
</div>
```

When "Generating…" appears, it's added AFTER the LanguageSwitcher in the flex flow. The LanguageSwitcher stays at the left edge. No horizontal shift.

**Diagnostic step before applying:** Open Chrome DevTools → Performance tab → record during a conversion. Look for:
- In the Experience section: "Layout shift" entries near the ImageDropzone — confirms the unmount/mount theory
- In the Experience section: "Layout shift" entries near the footer — confirms the flex reflow theory
- In the Summary tab: "Layout" time spike during the conversion

This will definitively confirm both root causes.

### Risks

- **Fix A changes the conditional structure but not the rendered output.** The DOM is identical in both states. The only difference is which JSX expression produces it. No visual regression risk.
- **Fix B swaps the order of LanguageSwitcher and "Generating…" in the footer.** During conversion, the layout changes from `[Generating…] [LanguageSwitcher]` to `[LanguageSwitcher] [Generating…]`. This is a minor UX change: the status indicator now appears to the right of the language switcher instead of to the left. Both are valid; the new order keeps the persistent control in a stable position.
- **Fix B does not affect the footer's overall height or width.** The "Generating…" text width is unchanged; it just sits in a different position within the same flex group. The right group (buttons) is unaffected by `justify-between`.
- **Both fixes are independent.** Fix A can be applied without Fix B and vice versa. Applying both together is the safest option but they can be split into separate commits if preferred.
- **The "Generating…" text itself still appears/disappears** — this is intentional UX feedback. The fixes prevent it from disrupting the LanguageSwitcher's position, not from appearing at all.

### Ready for Proposal

**Yes.** Both root causes are identified with exact file:line references. The fixes are small (one ternary restructure + one element reorder) and low-risk. The fix can proceed directly to the proposal phase without further investigation.

**Noted discrepancy:** The round 2 exploration (fix-conversion-flicker/exploration.md:105-106) and tasks.md:2.2 mentioned adding `overflow-y-scroll` to the root div at page.tsx:129. The current page.tsx:129 shows only `flex min-h-screen flex-col` — no `overflow-y-scroll`. This is either a regression or the change was never applied. Worth verifying during apply, but it's a separate issue from the two flickers investigated here.
