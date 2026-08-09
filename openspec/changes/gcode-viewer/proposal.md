# Proposal: Visualizador de G-Code

## Intent

Los usuarios solo ven G-Code como texto crudo. No pueden verificar visualmente las trazas antes de enviar al SCARA. Este cambio agrega un visor 2D en canvas.

## Scope

### In Scope
- `GCodeViewer.tsx` — parser inline + renderizado en `<canvas>`
- Pestañas: Image Preview | G-Code Viewer | G-Code Text
- Estado vacío: marco 210×297mm + texto "Convierte una imagen para ver la visualización"
- Fit-to-canvas con aspect ratio
- Errores parciales: warning + renderizar lo parseable

### Out of Scope
- Zoom/pan, animación, exportación SVG/PNG
- Cambios backend, escala exacta, URLs compartibles

## Capabilities

### New Capabilities
- `gcode-viewer`: Visualización 2D de G-Code. Parser de 6 comandos (G21/G90/G0/G1/M3/M5). G1 sólido negro, G0 gris punteado. Marco de trabajo 210×297mm. Estado vacío con placeholder.

### Modified Capabilities
- `ui-layout`: Layout de apilado a pestañas en `page.tsx`.

## Approach

Raw-canvas (~150-250 LOC), sin dependencias nuevas. Patrón `useRef` + `useEffect` idéntico a `CanvasPreview.tsx`.

- Parser regex por línea: extraer G + X/Y
- M3→M5 = trazos, G0 entre bloques = traslado punteado
- Escala fit-to-canvas, coordenadas en mm, origen bottom-left

## Affected Areas

| Archivo | Impacto | Descripción |
|---------|---------|-------------|
| `frontend/components/GCodeViewer.tsx` | New | Parser + canvas (~100 LOC) |
| `frontend/app/page.tsx` | Modified | Tabs + renderizado condicional (~60 LOC) |
| `frontend/components/GCodeOutput.tsx` | Modified | Wrap para tabs (~10 LOC) |
| `frontend/components/CanvasPreview.tsx` | Modified | Wrap para tabs (~10 LOC) |

## Risks

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| G-Code malformado rompe parser | Low | Parser tolerante + warning |
| Performance con G-Code largo | Low | Canvas nativo; limitar si necesario |

## Rollback Plan

Eliminar `GCodeViewer.tsx` y revertir los 3 archivos modificados. Sin migraciones, sin deps nuevas. `git checkout` de los 4 archivos.

## Dependencies

Ninguna. React + canvas nativo + Tailwind ya presentes.

## Success Criteria

- [ ] Trazos G1 y traslados G0 visibles post-conversión
- [ ] Pestañas funcionan: Image Preview | G-Code Viewer | G-Code Text
- [ ] Estado vacío muestra marco + texto en español
- [ ] G-Code parcial renderiza con warning
- [ ] Cero dependencias nuevas
