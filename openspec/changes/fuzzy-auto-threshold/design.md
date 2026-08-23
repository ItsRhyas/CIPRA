# Design: Fuzzy Auto-Threshold Selection

## Architecture

### Backend (already implemented)

The Mamdani fuzzy controller is implemented in `backend/pipeline/fuzzy_threshold.py` as a hand-rolled pure-NumPy module (scikit-fuzzy incompatible with numpy 2.5.1). It exposes four stages (`fuzzify`, `evaluate_rules`, `aggregate`, `defuzzify`) for classroom demonstration and contains a 9-rule SI-ENTONCES rule base over two linguistic inputs (`contrast`, `edge_density`) and one output (`threshold`). Integration point: `backend/pipeline/orchestrator.py` inserts the fuzzy stage when `params.auto_threshold` is `True`, appending `"fuzzy"` to `stages_run` and exposing `fuzzy_meta` on `PipelineOutput`.

### Frontend (new design)

The frontend UI changes are entirely additive and live in 7 files under `frontend/`. No backend code changes beyond what is already implemented.

1. **Types** (`frontend/lib/types.ts`): adds `auto_threshold?: boolean` to the `ConvertParams` interface. Mirrors the contract so the JSON payload `auto_threshold` flows to the backend automatically.

2. **Toggle component** (`frontend/components/Toggle.tsx`): adds an optional `disabled` prop. When the panel has a global disabled state (e.g. uploading), the Auto Threshold switch respects it and does not change state. Keeps accessibility: `role="switch"` with `aria-checked`.

3. **ParameterPanel** (`frontend/components/ParameterPanel.tsx`): adds a switch row above the threshold `NumericParamRow`:
   - `Toggle enabled={params.auto_threshold ?? false} onChange={(v) => handleImageParamChange({ auto_threshold: v })} label={t('params.autoThreshold')}`.
   - The threshold `NumericParamRow` receives `disabled={disabled || (params.auto_threshold ?? false)}` so **both** the range input and the number input become non-interactive when auto is ON.
   - When OFF the slider is fully interactive; threshold value is still in params state and sent to the backend, but the backend ignores `threshold` when `auto_threshold=true`.

4. **i18n dictionaries** (`frontend/lib/i18n/dictionaries/en.ts`, `es.ts`): add keys
   ```
   'params.autoThreshold': 'Auto threshold' / 'Umbral automático'
   'params.autoThreshold.tooltip': 'Let the fuzzy controller pick the Canny threshold automatically.' / 'Deja que el controlador difuso elija el umbral de Canny automáticamente.'
   ```

5. **Presets** (`frontend/lib/presets.ts`): applying an image-type preset (photo/line_art/sketch/text) resets `auto_threshold` to `false` so the preset threshold takes effect predictably. Without this, clicking a preset while the auto switch was ON would silently not apply the preset threshold value.

6. **Page state** (`frontend/app/page.tsx`): owns `useState<ConvertParams & { variant: Variant }>(DEFAULTS)`. `auto_threshold` flows through `JSON.stringify(params)` in `lib/api.ts` — **no changes needed** in `api.ts` or `useConvert.ts`.

7. **Reset propagation**: When the user resets params (`handleImageParamChange` with `onReset`), `auto_threshold` defaults to `false` so legacy behavior is the initial state.

### System-wide

- The feature is fully opt-in: default `auto_threshold: false` preserves byte-identical legacy pipeline (`stages_run = ["preprocess", "edges", "contours", "simplify"]`, no `meta.fuzzy`).
- Backend contract (`shared/api-contract.json`) has `"additionalProperties": false`; the frontend type addition is safe because the comment on `ConvertParams` notes stale-schema incidents and adding an optional field does not violate the contract when the backend accepts it (serializer validates bool, defaults to false).
- Frontend i18n mechanism is a flat-context provider + dictionary files; new keys must exist in both `en.ts` and `es.ts`.

## Key Decisions

- **Reuse existing Toggle**: avoids a new dependency; the component already has accessibility and styling consistent with ParameterPanel.
- **Add `disabled` prop to Toggle**: minimal change (one optional prop) to handle the panel's global disabled state during upload; keeps the Auto switch grayed-out and non-interactive when the image is being processed.
- **Block both slider inputs**: the NumericParamRow renders a `<input type="range">` and a `<input type="number">`; applying `disabled` to the parent row disables both, so the user cannot drag or type a new value.
- **Presets reset auto_threshold**: ensures that applying a preset is predictable — the user expects the preset threshold to take effect, not be ignored because auto is ON.
- **No API changes**: `params` object is `JSON.stringify`'d and sent as-is; the backend serializer already validates `auto_threshold` as bool and defaults to false. The frontend type addition `auto_threshold?: boolean` is optional so `DEFAULTS` (which omits it) is still valid.
- **i18n in both locales**: matching the project convention of identical key sets across `en.ts` and `es.ts`.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Toggle lacks `disabled` prop while panel disabled | Low | Add optional `disabled` prop to Toggle (1 line); design already includes this |
| Preset interaction confusing (auto ON + preset applied) | Medium | Presets explicitly reset `auto_threshold` to false per spec |
| Frontend type drift (Contract `additionalProperties: false`) | Low | Frontend type adds optional field; backend accepts it; no contract change needed |
| Numerical edge cases in defuzzify (already mitigated in backend) | Low | Returns 0; orchestrator clips to [0,255] |
| Desactivar el switch mientras sube la imagen | Low | Toggle respeta `disabled` global; UX consistente |

## Testing Strategy

- Backend: already 116 passing tests, ruff clean; no changes.
- Frontend: run `npm run lint` and `npm run build` to verify no type errors with the new `auto_threshold` field; verify the Toggle component renders with the new usage; manual walkthrough of each spec scenario (switch off/honors slider, switch on/blocks slider, default off, panel disabled blocks toggle, preset resets auto).
- i18n: verify both `en.ts` and `es.ts` have the new keys without warnings.

## Rollback

Frontend-only changes — revert by removing the Toggle row from ParameterPanel, deleting `auto_threshold?: boolean` from `ConvertParams` in types.ts, removing the i18n keys, and reverting presets.ts. Backend default `false` ensures legacy pipeline remains untouched.

## Success Criteria (from proposal, now fulfilled)

- [x] 116 backend tests pass (ruff clean)
- [x] `auto_threshold=False` preserves legacy behavior (byte-identical stages_run)
- [x] `auto_threshold=True` runs fuzzy stage and returns `meta.fuzzy` with expected keys
- [x] API contract updated with `auto_threshold` and `meta.fuzzy`
- [x] Serializer rejects non-boolean values with 400
- [ ] Frontend switch toggles `auto_threshold`; threshold slider blocks when ON
- [ ] i18n keys added in both `en.ts` and `es.ts`
- [ ] Presets reset `auto_threshold` to false when applied