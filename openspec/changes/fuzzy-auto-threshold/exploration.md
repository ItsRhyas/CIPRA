## Exploration: fuzzy-auto-threshold

> **Status**: Implementation already complete in working tree (uncommitted). This exploration captures the CURRENT implemented state and the design decisions behind it so the proposal phase can document, not redesign. Backend tests pass (ruff clean per orchestrator brief). No commit has been made yet — this exploration does NOT commit anything.

### Current State

The CIPRA pipeline gains an optional 5th stage that automatically chooses the Canny low threshold from a Mamdani fuzzy inference engine over two image-derived statistics (contrast and edge density). The feature is opt-in via a new boolean parameter `auto_threshold` on `ConvertParams`; the legacy behaviour is untouched when the flag is `false`.

**Backend — `backend/pipeline/fuzzy_threshold.py` (308 lines, new)**
- Pure NumPy + stdlib. scikit-fuzzy was rejected because it is incompatible with the installed numpy 2.5.1, so membership functions are hand-rolled.
- `trimf(x, a, b, c)` and `trapmf(x, a, b, c, d)` use MATLAB-style naming taught in the course. Vertical feet (zero-width) are handled by `_unit_ratio` returning `np.where(numerator < 0, 0.0, 1.0)`.
- `compute_image_stats(image_gray)` → `{"contrast": float, "edge_density": float}` on the 0-100 universe. Contrast is `std/255*100`. Edge density is the percentage of pixels whose gradient magnitude (Euclidean norm of `np.gradient`) exceeds `EDGE_GRADIENT_THRESHOLD = 25.0`. 3-channel arrays fall back to channel mean.
- `FuzzyController` exposes the four Mamdani stages as separate methods for classroom demonstration:
  1. `fuzzify(contrast, edge_density)` → membership degrees.
  2. `evaluate_rules(memberships)` → fired rules only (`activation > 0`), with rule id, SI-ENTONCES text, activation, consequent.
  3. `aggregate(fired_rules)` → `np.maximum` of `min(activation, consequent_set)` over `OUTPUT_UNIVERSE = np.arange(0, 256)`.
  4. `defuzzify(aggregated)` → centroid (`sum(x*mu)/sum(mu)`); returns 0 when total mass is zero.
  - Inputs: `contrast` and `edge_density`, each with three linguistic labels (`bajo`/`medio`/`alto`, `baja`/`media`/`alta`) using trapmf/trimf parameters tuned around the 0-100 universe. Output: `threshold` (`bajo`/`medio`/`alto`) on 0-255.
  - 9 SI-ENTONCES rules R1..R9 covering the full 3×3 grid (all combinations of contrast and edge density labels). The default consequent pattern is: low contrast → low threshold; high contrast + high edge density → high threshold.
- `fuzzy_auto_threshold(image_gray) -> FuzzyThresholdResult(threshold: int, diagnostics: dict)` is the public entry point. It chains `compute_image_stats` → `FuzzyController().infer(...)`. Diagnostics carry `inputs`, `memberships`, `fired_rules` (with rule id, text, activation — no `consequent` because it is implementation detail), `defuzzified` (pre-rounding centroid) and the rounded `threshold`.

**Backend — `backend/pipeline/types.py`**
- `ConvertParams.auto_threshold: bool = False` added with the same default as the JSON Schema.
- `PipelineOutput.fuzzy_meta: dict | None = None` added; `None` preserves the legacy contract.
- `StageResult.meta` already supported `dict` — no structural change needed.

**Backend — `backend/pipeline/preprocess.py`**
- Stores the grayscale image in `StageResult.meta["grayscale"]` so the fuzzy stage does not need to redo cv2 grayscale conversion. `result.data` remains the post-variant image passed to `edges()` (bilateral, Otsu-binary or blurred depending on variant).

**Backend — `backend/pipeline/orchestrator.py`**
- Pipeline chain when `params.auto_threshold` is True: `preprocess → fuzzy → edges → contours → simplify`. `stages_run` includes the literal string `"fuzzy"`.
- Threshold for the edges stage is replaced by the fuzzy output. `fuzzy_meta` is propagated to `PipelineOutput`.
- When `auto_threshold=False` (legacy), the chain and behaviour are identical to before — `stages_run` is `["preprocess", "edges", "contours", "simplify"]` and `fuzzy_meta` is `None`. Verified by `test_orchestrator_without_auto_threshold_keeps_legacy_behavior`.

**Backend — `backend/jobs/serializers.py`**
- `auto_threshold` parsed with `isinstance(value, bool)` — rejects `1`, `"true"`, `None`, etc. with the message `"auto_threshold must be a boolean."` and a 400 status. Default is `False` (matches schema).
- `ConvertParams` is built with the validated boolean. `validate_params` mirrors the existing style (no DRF `BooleanField` because the field is inside a JSON string).

**Backend — `backend/jobs/views.py`**
- `meta.fuzzy` is included in the HTTP response only when `pipeline_output.fuzzy_meta is not None`. The base `meta` keys (`variant`, `stages_run`, `elapsed_ms`) remain stable.

**API contract — `shared/api-contract.json`**
- `ConvertParams.auto_threshold: boolean` added (default `false`); `threshold` description updated to "Ignored when auto_threshold is true."
- `ConvertResponseMeta.fuzzy` added (required keys: `inputs`, `memberships`, `fired_rules`, `defuzzified`, `threshold`). Documented as "Present only when the request enabled auto_threshold."
- `variant` enum already lists `["fast", "detailed", "balanced"]` (this was the orchestrator-confirmed fact; the frontend `Variant` type was already aligned).

**Tests — `backend/tests/test_fuzzy_threshold.py` (new, 21 test functions; one is parametrized over 3 values)**
- Membership functions: vertices/plateau/edges for trimf and trapmf, vertical-left and vertical-right edge cases, scalar input.
- Image stats: blank image, high-contrast boundary (`std/255*100 ≈ 50`, edge density ≈ 200/50 = 4.0), gradient threshold sanity, RGB fallback.
- Controller stages: fuzzify known values, AND-as-min rule activation, multi-rule partial activation, centroid in range.
- Public entry point: determinism + range, diagnostics key set, blank-image monotonicity (`threshold < 40`), low-vs-high contrast monotonicity (`low < high`).
- Orchestrator: `auto_threshold=True` runs the fuzzy stage with `stages_run == ["preprocess", "fuzzy", "edges", "contours", "simplify"]` and `fuzzy_meta is not None`; `auto_threshold=False` (default) keeps legacy `stages_run` and `fuzzy_meta is None`; `auto_threshold=True` still runs the fuzzy stage when OpenCV is missing (graceful degradation).
- Serializer: accepts boolean, rejects string/int/None with `auto_threshold` in error messages.

**Tests — `backend/tests/test_api.py` (3 new HTTP-level tests)**
- `test_convert_auto_threshold_returns_fuzzy_meta` — request with `auto_threshold: true` returns 200 and `meta.fuzzy` with `inputs`/`memberships`/`fired_rules`/`defuzzified`/`threshold` plus `fuzzy` in `meta.stages_run`.
- `test_convert_default_omits_fuzzy_meta` — default request has no `meta.fuzzy` and no `fuzzy` in `meta.stages_run`.
- `test_convert_invalid_auto_threshold_returns_400` — `auto_threshold: "yes"` returns 400 (never 500).

**Frontend — `frontend/lib/types.ts`, `frontend/lib/api.ts`, `frontend/components/ParameterPanel.tsx`, `frontend/lib/i18n/dictionaries/en.ts`, `frontend/lib/i18n/dictionaries/es.ts`, `frontend/lib/scara-defaults.ts`, `frontend/lib/presets.ts`**
- None of these files reference `auto_threshold` or `meta.fuzzy`. The Threshold slider remains always editable and is still sent on every request (the backend ignores it when `auto_threshold=true`).

**Academic motivation (per orchestrator brief)**
- The project belongs to an AI course (see `PropuestaProyecto.md` and the README). Adding Mamdani inference places the project under Unit V (Fuzzy Logic) of the syllabus: membership functions, linguistic variables, SI-ENTONCES rules, centroid defuzzification.

### Affected Areas

| Area | Change |
|------|--------|
| `backend/pipeline/fuzzy_threshold.py` | NEW — fuzzy controller (308 lines, pure NumPy) |
| `backend/pipeline/types.py` | MODIFIED — `ConvertParams.auto_threshold`, `PipelineOutput.fuzzy_meta` |
| `backend/pipeline/preprocess.py` | MODIFIED — stores grayscale in `meta["grayscale"]` |
| `backend/pipeline/orchestrator.py` | MODIFIED — runs fuzzy stage when `auto_threshold=True`, propagates `fuzzy_meta` |
| `backend/jobs/serializers.py` | MODIFIED — validates `auto_threshold` as bool, default `False` |
| `backend/jobs/views.py` | MODIFIED — emits `meta.fuzzy` when present |
| `shared/api-contract.json` | MODIFIED — adds `auto_threshold` param and `meta.fuzzy` response, refreshes `threshold` description and `variant` enum |
| `backend/tests/test_fuzzy_threshold.py` | NEW — 21 unit/integration tests |
| `backend/tests/test_api.py` | MODIFIED — 3 new HTTP-level tests |
| `frontend/lib/types.ts` | OPEN — needs `auto_threshold?: boolean` on `ConvertParams`, `fuzzy?: FuzzyMeta` on `ConvertResponseMeta` |
| `frontend/lib/scara-defaults.ts` | OPEN — should declare `auto_threshold: false` (default) |
| `frontend/components/ParameterPanel.tsx` | OPEN — needs a toggle next to the Threshold slider that disables the slider while `auto_threshold=true` (or any other UX chosen) |
| `frontend/lib/api.ts` | OPEN — no code change strictly required, but the JSDoc comment currently lists only `{ scale, threshold, simplify_tolerance, scara? }` and should be updated |
| `frontend/lib/i18n/dictionaries/en.ts`, `es.ts` | OPEN — needs i18n keys (`params.autoThreshold`, `params.autoThreshold.tooltip`) |

### Approaches Considered (NOT applied — feature is implemented)

The orchestrator's brief is explicit: this exploration must faithfully capture what exists, NOT propose a redesign. The approaches below are documented only to record the *considered alternatives* and the *decisions that were taken*, so the proposal can defend the chosen shape.

1. **Hand-rolled fuzzy in pure NumPy** — chosen.
   - Pros: Zero new dependency. Compatible with numpy 2.5.1 (scikit-fuzzy is not). Stages are exposed as four separate methods so each one can be demonstrated independently in class. Total file is small (~300 LOC) and self-contained.
   - Cons: Re-implements what scikit-fuzzy already does. Adds maintenance surface (the membership functions, AND/aggregation/defuzzification primitives).
   - Effort: ~1 day to write + ~1 day to test (matches the existing 21-test file).

2. **scikit-fuzzy wrapper** — rejected.
   - Pros: Industry-standard, well-tested, less code in the project.
   - Cons: Incompatible with installed numpy 2.5.1. Would force a numpy downgrade or a vendored fork. Hurts the "no extra deps" boundary that the rest of the pipeline already follows (OpenCV + NumPy + Django only).
   - Effort: Would require resolving the numpy version conflict first; not safe in scope.

3. **Otsu-only (no fuzzy)** — rejected.
   - Pros: One-line change using `cv2.threshold(..., THRESH_OTSU)`. Zero new code.
   - Cons: Already used inside `preprocess.py` for the `balanced` variant, so adding it as a Canny threshold selector would not actually raise the project's syllabus coverage of Unit V (Fuzzy Logic). It would also be a one-line addition that doesn't justify a proposal.
   - Effort: Trivial — but does not satisfy the academic motivation.

4. **scikit-fuzzy + numpy downgrade** — rejected.
   - Pros: Industry-standard API surface.
   - Cons: Pinning numpy below 2.x to match scikit-fuzzy risks every other package that depends on numpy 2.x. Not acceptable for a backend already validated against numpy 2.5.1.

### Recommendation

**Approach 1 (hand-rolled pure NumPy) is already implemented and tested.** The proposal should formalise what exists, not propose a different design. Specifically the proposal must:

1. Document the four exposed inference stages (`fuzzify`, `evaluate_rules`, `aggregate`, `defuzzify`) as a deliberate teaching affordance (Unit V).
2. Document the legacy-untouched invariant (`auto_threshold=False` produces identical G-Code and identical `stages_run` as before).
3. Document the diagnostics contract — what `meta.fuzzy` carries and what each key means.
4. Add the frontend exposure as a clearly-bounded open question / follow-up (see below). It must NOT be in scope of this change.

### Open Questions / Follow-ups (NOT in scope, NOT to implement here)

- **Frontend exposure of `auto_threshold`**. The Next.js frontend does NOT yet expose the flag. Adding it requires, at minimum: `ConvertParams.auto_threshold?: boolean` in `frontend/lib/types.ts`; `auto_threshold: false` in `frontend/lib/scara-defaults.ts`; a toggle / checkbox in `frontend/components/ParameterPanel.tsx` next to the Threshold slider (UX decision: lock the slider while `auto_threshold=true`, or keep it editable as a fallback?). New i18n keys (`params.autoThreshold`, `params.autoThreshold.tooltip`) in both `en.ts` and `es.ts`. Possibly also: surface `meta.fuzzy.threshold` and `meta.fuzzy.fired_rules` in the UI as a "why this threshold?" explainer (high teaching value). This is at least a separate change; treat as follow-up.
- **Coherence between `frontend/lib/types.ts:42-44` and the schema enum**. The current comment says "The backend serializer accepts all three values; the schema enum is stale." With the contract update, the schema enum is now correct; the comment should be re-checked when the frontend is updated.
- **Display of `meta.fuzzy` in the frontend**. Diagnostics are returned but the UI never reads them. A future "AI explainability" change could surface `fired_rules[*].text` and the selected `threshold` to the user.
- **Commit hygiene**. The orchestrator brief is explicit: nothing has been committed yet; the working tree carries the full feature plus the contract update. A single conventional commit (e.g. `feat(pipeline): add fuzzy auto-threshold selection (Mamdani)`) plus a docs-only follow-up for `shared/api-contract.json` would be the natural split. This exploration does NOT commit anything.

### Risks

- **Numerical edge cases in the fuzzy controller.** `defuzzify` returns `0.0` when `sum(mu) <= 0`. The orchestrator code clips+rounds to `[0, 255]` so the integer threshold stays sane. The `test_blank_white_image_yields_low_threshold` test pins this contract. If the membership parameters are ever tuned aggressively, blank-image behaviour must be re-verified.
- **Determinism**. `fuzzy_auto_threshold` is fully deterministic (no randomness, no OpenCV dependency in the fuzzy path). Verified by `test_fuzzy_auto_threshold_deterministic_and_in_range`. Future tuning must preserve this — required for golden G-Code snapshots downstream.
- **API contract drift**. The contract update is the source of truth for both backend and frontend. If `meta.fuzzy` shape changes (e.g. adding the `consequent` to fired_rules for the UI explainer), the contract MUST be updated in the same PR as the backend change. The frontend types file is hand-rolled, so drift here is a known risk until a JSON-Schema-to-TypeScript generator is introduced.
- **OpenCV missing + grayscale fallback**. `compute_image_stats` accepts an H×W array. If OpenCV is missing, `preprocess` returns the input image unchanged with a warning. If that input is RGB, `preprocess` does not produce a grayscale image, so the orchestrator falls back to `result.data` (RGB). The graceful-OpenCV-missing test exercises this path but does NOT assert the visual quality of the result. Acceptable for the unit-test scope; flagged here for completeness.
- **Front-end/back-end drift remains until the frontend is updated.** Until then, the flag is reachable only via curl / direct API calls. Not a bug — but it limits the user-visible impact of the change.

### Ready for Proposal

**Yes.** The proposal phase should document the existing implementation (intent, scope, capabilities, affected areas, rollback, success criteria) and reference this exploration for the design rationale. The frontend exposure is recorded as an explicit follow-up and MUST NOT be in scope. Do NOT commit the working-tree changes before the proposal/apply cycle is approved.

---

### Quick Reference — Files Touched (verified by reading)

| File | Status | Lines | Purpose |
|------|--------|------:|---------|
| `backend/pipeline/fuzzy_threshold.py` | NEW | 308 | Mamdani fuzzy controller, pure NumPy |
| `backend/pipeline/types.py` | MOD | +3 | `ConvertParams.auto_threshold`, `PipelineOutput.fuzzy_meta` |
| `backend/pipeline/preprocess.py` | MOD | +1 | stores `meta["grayscale"]` |
| `backend/pipeline/orchestrator.py` | MOD | +9 | conditional fuzzy stage + `fuzzy_meta` propagation |
| `backend/jobs/serializers.py` | MOD | +4 | bool validation for `auto_threshold` |
| `backend/jobs/views.py` | MOD | +2 | conditional `meta.fuzzy` in response |
| `shared/api-contract.json` | MOD | +35/-2 | `auto_threshold`, `meta.fuzzy`, threshold description, variant enum |
| `backend/tests/test_fuzzy_threshold.py` | NEW | 304 | 21 unit/integration tests (one parametrized over 3 values) |
| `backend/tests/test_api.py` | MOD | +33 | 3 HTTP-level tests |
| `frontend/**` | NOT MODIFIED | — | Open follow-up (toggle, types, i18n) |

**Working tree status** (per `git status --short`):
```
 M backend/jobs/serializers.py
 M backend/jobs/views.py
 M backend/pipeline/orchestrator.py
 M backend/pipeline/preprocess.py
 M backend/pipeline/types.py
 M backend/tests/test_api.py
 M frontend/tsconfig.tsbuildinfo
 M shared/api-contract.json
?? backend/pipeline/fuzzy_threshold.py
?? backend/tests/test_fuzzy_threshold.py
?? frontend/.next-root-owned/
```
