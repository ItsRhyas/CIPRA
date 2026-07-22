# Tasks: Visualizador de G-Code

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## [T1] Parser de G-Code puro
**Status**: done
**Depends on**: none
**Files**: `frontend/lib/gcode-parser.ts`
**Description**: Implementar `parseGCode(raw: string): ParsedGCode` con regex por línea, state machine M3/M5 y extracción de G0/G1 + coordenadas X/Y; exportar tipos `Point`, `Stroke`, `Travel`, `ParsedGCode`.
**Acceptance**: Parser devuelve `strokes[]`, `travels[]` y `warnings[]` para fixtures válidos; ignora `G21`/`G90`; no lanza excepciones ante líneas desconocidas.
**Commit message**: `feat(gcode): add pure G-Code parser with M3/M5 state machine`

## [T2] Componente GCodeViewer
**Status**: done
**Depends on**: T1
**Files**: `frontend/components/GCodeViewer.tsx`
**Description**: Crear componente canvas con `useRef` + `useEffect`; recibe `gcode: string | null`, dibuja marco 210×297mm, travels G0 gris punteado y strokes G1 negro sólido con flip-Y.
**Acceptance**: Renderiza marco, trazos y traslados; muestra estado vacío con texto "Convierte una imagen para ver la visualización" cuando `gcode === null`.
**Commit message**: `feat(ui): add GCodeViewer canvas component`

## [T3] Estado de pestañas en page.tsx
**Status**: done
**Depends on**: T2
**Files**: `frontend/app/page.tsx`
**Description**: Añadir `useState<TabId>('preview')`, tres botones de pestaña y renderizado condicional de `CanvasPreview`, `GCodeViewer` y `GCodeOutput`.
**Acceptance**: Solo el componente activo se renderiza; pestaña por defecto "Vista previa"; navegación entre pestañas funciona.
**Commit message**: `feat(ui): add tab state and conditional rendering in page`

## [T4] Envolver CanvasPreview
**Status**: done
**Depends on**: T3
**Files**: `frontend/components/CanvasPreview.tsx`
**Description**: Asegurar que `CanvasPreview` se renderiza correctamente dentro del layout de pestañas sin cambios funcionales.
**Acceptance**: Pestaña "Vista previa" muestra `CanvasPreview` con imagen cargada igual que antes.
**Commit message**: `refactor(ui): wrap CanvasPreview for tab rendering`

## [T5] Envolver GCodeOutput
**Status**: done
**Depends on**: T3
**Files**: `frontend/components/GCodeOutput.tsx`
**Description**: Asegurar que `GCodeOutput` se renderiza correctamente dentro del layout de pestañas sin cambios funcionales.
**Acceptance**: Pestaña "Código G" muestra el textarea con el G-Code generado.
**Commit message**: `refactor(ui): wrap GCodeOutput for tab rendering`

## [T6] Auto-switch a pestaña Visualizador
**Status**: done
**Depends on**: T3
**Files**: `frontend/app/page.tsx`
**Description**: Cambiar `activeTab` a `'viewer'` cuando `useConvert()` produzca `result.gcode` no vacío; comportamiento nice-to-have sin bloquear el flujo.
**Acceptance**: Tras convertir imagen, la pestaña activa cambia a "Visualizador" si estaba en "Vista previa"; fallo silencioso no rompe nada.
**Commit message**: `feat(ui): auto-switch to viewer tab after conversion`

## [T7] Advertencia de G-Code malformado
**Status**: done
**Depends on**: T2
**Files**: `frontend/components/GCodeViewer.tsx`, `frontend/lib/gcode-parser.ts`
**Description**: Mostrar warning sutil cuando `parsed.warnings.length > 0`; renderizar lo parseable sin lanzar errores.
**Acceptance**: G-Code con líneas no reconocidas renderiza lo parseable y muestra advertencia; la pestaña sigue funcional.
**Commit message**: `feat(gcode): show subtle warning for malformed lines`

## [T8] Verificación manual y build
**Status**: done
**Depends on**: T4, T5, T6, T7
**Files**: `frontend/`
**Description**: Ejecutar `next build` para type-check y probar manualmente los escenarios del spec.
**Acceptance**: `next build` sin errores; navegación, auto-switch, estado vacío, G-Code malformado y renderizado visual funcionan según escenarios.
**Commit message**: `chore(ui): verify GCode viewer with build and manual tests`
