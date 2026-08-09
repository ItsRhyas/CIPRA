# Design: Visualizador de G-Code

## Enfoque Técnico

Añadir un componente `GCodeViewer` que parsee la cadena `result.gcode` y la renderice en un `<canvas>` nativo, siguiendo el patrón `useRef` + `useEffect` ya establecido en `CanvasPreview.tsx`. Reorganizar `page.tsx` de layout vertical a pestañas (Image | Visualizador | G-Code Text). Cero dependencias nuevas.

## Decisiones de Arquitectura

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Canvas nativo vs SVG | Canvas: mejor performance con miles de segmentos, sin DOM nodes. SVG: escalable, seleccionable. | **Canvas** — consistencia con `CanvasPreview`, G-Code puede tener miles de líneas. |
| Parser inline vs librería | Inline: ~60 LOC, control total. Librería: más features pero dependencia. | **Inline** — dialecto CIPRA es mínimo (6 comandos), no justifica dependencia. |
| Estado de tabs en page vs Context | Page: simple, local. Context: over-engineering para 3 tabs. | **useState en page.tsx** — un solo consumidor, sin prop-drilling. |
| Parser como función pura vs hook | Pura: testeable, sin side-effects. Hook: acoplado a React. | **Función pura** en `lib/gcode-parser.ts` — separación de concerns. |

## Flujo de Datos

```
useConvert() → result.gcode (string)
                    │
                    ▼
            parseGCode(gcode)
                    │
                    ▼
         ParsedGCode { strokes[], travels[], warnings[] }
                    │
                    ▼
         GCodeViewer (canvas render)
              ├── drawWorkArea()  — marco 210×297mm
              ├── drawTravels()   — G0 gris punteado
              └── drawStrokes()   — G1 negro sólido
```

## Cambios de Archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `frontend/lib/gcode-parser.ts` | Create | Parser puro: `parseGCode(string) → ParsedGCode`. Regex por línea, tracking M3/M5. |
| `frontend/components/GCodeViewer.tsx` | Create | Componente canvas: recibe `gcode: string \| null`, renderiza strokes/travels/frame. |
| `frontend/app/page.tsx` | Modify | Añadir `activeTab` state, tab buttons, renderizado condicional, auto-switch post-conversión. |
| `frontend/components/CanvasPreview.tsx` | Modify | Sin cambios funcionales — solo se renderiza condicionalmente vía tabs. |
| `frontend/components/GCodeOutput.tsx` | Modify | Sin cambios funcionales — solo se renderiza condicionalmente vía tabs. |

## Interfaces / Contratos

```typescript
// lib/gcode-parser.ts

export interface Point {
  x: number;  // mm
  y: number;  // mm
}

export interface Stroke {
  points: Point[];  // Secuencia de puntos G1 entre M3..M5
}

export interface Travel {
  from: Point;
  to: Point;
}

export interface ParsedGCode {
  strokes: Stroke[];
  travels: Travel[];
  warnings: string[];  // Líneas no reconocidas
}

export function parseGCode(raw: string): ParsedGCode;
```

```typescript
// components/GCodeViewer.tsx

export interface GCodeViewerProps {
  gcode: string | null;
}
```

```typescript
// app/page.tsx — tab identifiers

type TabId = 'preview' | 'viewer' | 'gcode';
```

## Estrategia de Renderizado

### Mapeo de Coordenadas

- **Origen**: G-Code usa bottom-left; Canvas usa top-left → flip Y: `canvasY = canvasHeight - (mmY * scale)`
- **Escala**: `scale = Math.min(canvasW / 210, canvasH / 297)` — fit-to-canvas preservando aspect ratio
- **Padding**: 16px internos para que el marco no toque los bordes

### Orden de Dibujo

1. `clearRect` — limpiar canvas
2. Marco 210×297mm — borde gris `#ccc`, 1px
3. Travels (G0) — `#d1d5db`, dashed `[4, 4]`, 1px
4. Strokes (G1) — `#000000`, solid, 2px

### Estado Vacío

Cuando `gcode === null`: renderizar solo el marco + texto centrado "Convierte una imagen para ver la visualización".

### Tamaño del Canvas

Fijo: `width=560`, `height=792` (proporción A4 × 2.67). CSS `max-w-full` para responsividad. Sin ResizeObserver — mantener simple.

## Estrategia de Testing

| Capa | Qué Probar | Enfoque |
|-------|-----------|---------|
| Unit | `parseGCode()` con fixtures existentes | Manual: importar fixtures, verificar output structure |
| Integration | Renderizado de tabs | Manual: verificar navegación y auto-switch |
| E2E | Flujo completo upload→convert→view | Manual: pytest backend + verificación visual |

**Nota**: No existe framework de testing frontend (solo pytest backend). Verificación será manual + `next build` para type-checking.

## Migración / Rollout

No migration required. Feature es aditiva, sin cambios a API o base de datos. Rollback: eliminar `GCodeViewer.tsx` y revertir `page.tsx`.

## Preguntas Abiertas

- [ ] Ninguna bloqueante. El diseño está completo y listo para tasks.
