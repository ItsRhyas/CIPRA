# Design: Fix Aspect Ratio and UX

## Technical Approach

Two parallel tracks: (1) backend coordinate transform fix — replace independent X/Y scaling with uniform fit-to-area + centering, (2) frontend UX overhaul — responsive grid, paired slider/number inputs, CSS tooltips, and dynamic GCodeViewer. Both tracks are independent and can be implemented in parallel. Specifications in four delta specs: `pipeline-params`, `responsive-layout`, `parameter-tooltips`, `gcode-viewer`.

## Architecture Decisions

| Decision | Option A | Option B | Choice |
|----------|----------|----------|--------|
| Uniform scale strategy | `fit = min(w/iw, h/ih)` + offsets | Letterbox with padding parameter | **A** — simpler, no new API surface, matches spec exactly |
| Tooltip implementation | Pure CSS (Tailwind `group`) | External lib (Floating UI) | **A** — zero deps, spec forbids external libs |
| Responsive grid | Tailwind `md:grid-cols-[2fr_1fr]` | CSS container queries | **A** — project already uses Tailwind breakpoints |
| GCodeViewer sizing | Props with A4 defaults | Read from global state | **A** — explicit props, no coupling to state layer |
| Number input clamping | Clamp on blur | Clamp on every keystroke | **A** — less jarring UX, matches native `<input type="number">` behavior |

## Data Flow

```
Image (px) ──→ simplify.py
                  │
                  ├─ fit = min(work_w/img_w, work_h/img_h)
                  ├─ offset_x = (work_w - img_w * fit) / 2
                  ├─ offset_y = (work_h - img_h * fit) / 2
                  │
                  └─ for each (px, py):
                       mm_x = (offset_x + px * fit) * scale
                       mm_y = (work_h - offset_y - py * fit) * scale
                          │
                          ▼
                    mm_paths ──→ G-Code formatter
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/pipeline/simplify.py` | Modify | Lines 74-93: replace `scale_x`/`scale_y` with `fit` + `offset_x_mm`/`offset_y_mm` |
| `frontend/components/Tooltip.tsx` | Create | Pure CSS tooltip wrapper using Tailwind `group` |
| `frontend/components/ParameterPanel.tsx` | Modify | Add paired number inputs, per-param reset, wrap labels in `<Tooltip>` |
| `frontend/components/GCodeViewer.tsx` | Modify | Accept `workAreaW`/`workAreaH` props, dynamic canvas sizing |
| `frontend/app/page.tsx` | Modify | Responsive grid layout, DOM reorder (params beside actions) |
| `backend/tests/test_pipeline.py` | Modify | Update `test_y_flip_uses_bottom_left_origin`, add centering tests |

## Interfaces / Contracts

### simplify.py — signature unchanged

```python
def simplify(
    contours, config, tolerance=2.0, image_shape=(0,0), scale=1.0
) -> StageResult:
```

Internal change only — lines 74-93:

```python
# BEFORE (lines 75-76, 92-93):
scale_x = config.work_area_w_mm / image_w
scale_y = config.work_area_h_mm / image_h
mm_x = px * scale_x * scale
mm_y = (config.work_area_h_mm - (py * scale_y)) * scale

# AFTER:
fit = min(config.work_area_w_mm / image_w, config.work_area_h_mm / image_h)
draw_w_mm = image_w * fit
draw_h_mm = image_h * fit
offset_x_mm = (config.work_area_w_mm - draw_w_mm) / 2.0
offset_y_mm = (config.work_area_h_mm - draw_h_mm) / 2.0
mm_x = (offset_x_mm + px * fit) * scale
mm_y = (config.work_area_h_mm - offset_y_mm - py * fit) * scale
```

### GCodeViewer — new props

```tsx
interface GCodeViewerProps {
  gcode: string | null;
  workAreaW?: number;  // mm, default 210
  workAreaH?: number;  // mm, default 297
}
```

Canvas scaling math:

```
canvasScale = min(containerW / workAreaW, containerH / workAreaH)
canvas.width = workAreaW * canvasScale
canvas.height = workAreaH * canvasScale
toCanvasX(mmX) = padding + mmX * canvasScale
toCanvasY(mmY) = padding + frameH - mmY * canvasScale
```

Invalid props (0, undefined, NaN) → fall back to 210×297 + `console.warn`.

### Tooltip component

```tsx
// frontend/components/Tooltip.tsx
interface TooltipProps { text: string; children: React.ReactNode }
```

Tailwind classes: wrapper `relative group inline-block`, tooltip `absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10`.

### page.tsx layout structure

```
<main className="mx-auto max-w-5xl px-4 py-8">
  <h1/> <p/>
  <ImageDropzone />
  <div className="grid md:grid-cols-[2fr_1fr] gap-6">
    <div>  ← preview/viewer column
      <Tabs/>
      <TabPanel min-h-[300px]/>
    </div>
    <div>  ← params + actions column
      <ParameterPanel/>
      <ConvertButton/> <ResetButton/>
      <WarningsList/>
    </div>
  </div>
</main>
```

`max-w-3xl` → `max-w-5xl` to accommodate the wider two-column layout.

### ParameterPanel row structure

Each numeric param row becomes:

```
<div className="grid grid-cols-[1fr_80px_32px] items-center gap-2">
  <div>
    <Tooltip text={description}>
      <label>Escala: {value}</label>
    </Tooltip>
    <input type="range" ... />
  </div>
  <input type="number" min max step value onChange={...} />
  <button onClick={() => onChange({ [key]: DEFAULTS[key] })}>↺</button>
</div>
```

Slider and number input share the same `onChange` callback. Number input clamps on blur: `Math.min(max, Math.max(min, parseFloat(value)))`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (backend) | `test_px_to_mm_scaling` | **Passes unchanged** — center pixel (100,100) of 200×200 maps to (105, 148.5) under both old and new math |
| Unit (backend) | `test_y_flip_uses_bottom_left_origin` | **Update expected values** — top-left pixel (0,0) now maps to (0, 253.5) not (0, 297) due to vertical centering offset of 43.5mm |
| Unit (backend) | New: aspect ratio preservation | 400×200 image on A4: verify `fit = 210/400 = 0.525`, vertical centering offset > 0 |
| Unit (backend) | New: scale post-multiply | `scale=2.0` doubles all centered coordinates |
| Unit (backend) | New: identical aspect ratio | 200×200 on 100×100: offsets = 0, fit = 0.5 |
| Frontend | No existing tests | No frontend test infra exists — manual verification per spec scenarios |

## Migration / Rollout

No migration required. G-Code output changes are a **bug fix** — previous output was distorted. Document in changelog. Rollback: revert `simplify.py` and frontend files to previous commits.

## Open Questions

None — all decisions resolved against specs and existing codebase patterns.
