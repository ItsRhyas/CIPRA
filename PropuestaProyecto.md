**CIPRA: Convertidor Inteligente de Píxeles a Rutas Automatizadas.**

**Componente:** Módulo de IA y Backend (Django REST Framework) + Frontend (Next.js 14)

## 1. Objetivo General del Proyecto

Desarrollar una aplicación web robusta capaz de transformar imágenes bidimensionales (fotografías o retratos) en trayectorias geométricas optimizadas y traducidas a un lenguaje intermedio estándar (G-Code Geométrico), con el fin de servir como el sistema de percepción y planificación para un brazo robótico articulado.

## 2. Arquitectura del Sistema y Stack Tecnológico

El sistema se divide en una arquitectura desacoplada de dos capas principales:

[ Cliente / Navegador ] <--- (JSON / Archivos) ---> [ Backend de Procesamiento ]
      (Next.js 14)                                         (Django REST / OpenCV)

### A. Frontend (Capa de Interacción y Visualización)

* **Tecnología:** Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS.
* **Responsabilidades:**
  * Interfaz de carga de imágenes mediante arrastrar y soltar (drag-and-drop) con validación.
  * Panel de control paramétrico completo: presets de tipo de imagen, escala, umbral automático (control difuso), umbral manual, tolerancia de simplificación, variante de preprocesamiento, transformaciones (rotación/espejo), y configuración de área de trabajo y velocidades.
  * Previsualización interactiva de las trayectorias vectoriales mediante HTML5 Canvas.
  * Descarga y envío del archivo .gcode final; copiar al portapapeles.
  * Internacionalización completa (español/inglés) con persistencia en localStorage.

### B. Backend (Capa de IA y Cómputo de Visión)

* **Tecnología:** Django 5 + Django REST Framework + channels/daphne (ASGI/WebSocket).
* **Responsabilidades:**
  * Exposición de endpoints API REST para procesamiento asíncrono y síncrono.
  * Pipeline de procesamiento digital de imágenes (OpenCV) y álgebra lineal (NumPy).
  * Controlador difuso tipo Mamdani para selección automática de umbral Canny (contraste + densidad de bordes).
  * Ejecución de algoritmos de optimización combinatoria (TSP nearest-neighbor) para reducción de tiempos de trayectoria.
  * Formateador de G-Code puramente geométrico (G90, G21, M3, M5, G0, G1 con códigos F de avance).
  * Health checks y migraciones automáticas en contenedor de producción.

## 3. Pipeline de Procesamiento de la IA (Backend)

El núcleo del backend procesa cada imagen cargada a través de un pipeline secuencial de **seis etapas**:

### Fase 1: Preprocesamiento y Segmentación

1. **Carga y escalado:** Carga la imagen y aplica el factor `scale` (multiplicador de coordenadas de salida).
2. **Conversión de Espacio de Color:** Transformación de RGB a Escala de Grises (un solo canal).
3. **Reducción de Ruido:** Filtro de desenfoque gaussiano (Gaussian Blur) con núcleo determinista.
4. **Bifurcación por modo:**
   - Si `auto_threshold=false`: aplica Canny con umbral manual (`params.threshold`, high = min(low × 2, 255)).
   - Si `auto_threshold=true`: **solo guarda la imagen en escala de grises** para la etapa difusa; **no ejecuta Canny** aún.

### Fase 2: Controlador Difuso (Condicional — Solo si `auto_threshold=true`)

1. **Estadísticas de imagen:** `compute_image_stats` calcula `contrast` (std/255×100) y `edge_density` (% gradiente > 25) en rango 0–100. Entrada RGB reducida por media de canales.
2. **Fuzzificación:** Funciones de membresía `trimf`/`trapmf` sobre universos 0–100 (entradas) y 0–255 (salida):
   - Contraste: bajo (trapmf 0,0,10,25), medio (trimf 15,35,55), alto (trapmf 45,70,100,100)
   - Densidad: baja (trapmf 0,0,5,15), media (trimf 10,25,40), alta (trapmf 30,55,100,100)
   - Umbral: bajo (trapmf 0,0,30,60), medio (trimf 45,80,115), alto (trapmf 90,140,255,255)
3. **Base de reglas SI-ENTONCES (9 reglas, matriz 3×3, AND = min):**
   - R1: bajo+baja → bajo | R2: bajo+media → bajo | R3: bajo+alta → medio
   - R4: medio+baja → medio | R5: medio+media → medio | R6: medio+alta → alto
   - R7: alto+baja → medio | R8: alto+media → alto | R9: alto+alta → alto
4. **Inferencia Mamdani:** Agregación = max (min(activación, consecuente)) sobre 0–255; Defuzzificación = centroide (redondeo + clip [0,255]).
5. **Diagnósticos estructurados:** `inputs` {contrast, edge_density}, `memberships`, `fired_rules` [{rule, text, activation} > 0], `defuzzified`, `threshold`.
6. **Resultado:** Umbral seleccionado pasa a etapa Edges; meta difusa incluida en respuesta HTTP.

### Fase 3: Extracción de Bordes (Canny)

- Ejecuta Canny con umbral: **difuso** (si auto_threshold) o **manual** (params.threshold).
- `high = min(low × 2, 255)`.
- Devuelve imagen binaria de bordes.

### Fase 4: Extracción Topológica de Contornos

- `cv2.findContours` modo `RETR_EXTERNAL`, `CHAIN_APPROX_NONE`.
- Filtra por área mínima.
- Ordena contornos por posición (heurística lectura natural).

### Fase 5: Simplificación Geométrica, Escalado y Optimización TSP

1. **Douglas-Peucker:** Reducción de vértices por contorno según `simplify_tolerance`.
2. **Normalización Espacial:** Conversión px → mm dentro del área de trabajo (ej. A4: 210 mm × 297 mm), origen (0,0) en referencia acordada.
3. **TSP Nearest-Neighbor:** Reordena segmentos para minimizar desplazamientos en aire (G0).

### Fase 6: Formateo G-Code

- Header: `G90 G21 M3`
- Por trazo: `G0 X... Y... F{travel_speed}` → `M3` → `G1 X... Y... F{draw_speed}`... → `M5`
- Postamble: `M5` (idempotente)
- Velocidades por defecto o desde `machine.travel_speed` / `machine.draw_speed`

## 4. Contrato de Interfaz (Especificación del G-Code)

La salida final de la API es exclusivamente un archivo de texto plano con instrucciones puramente geométricas. El conjunto de comandos aceptado se limita estrictamente a:

* G90: Posicionamiento absoluto.
* G21: Unidades expresadas en milímetros.
* M5: Comando de control para levantar el lápiz (Eje Z virtual inactivo).
* G0 X[valor] Y[valor]: Movimiento lineal rápido en el aire hacia las coordenadas de inicio de una línea.
* M3: Comando de control para bajar el lápiz (Eje Z virtual activo sobre el papel).
* G1 X[valor] Y[valor]: Movimiento lineal de dibujo interpolado hacia la siguiente coordenada geométrica.
* F[valor]: Velocidad de avance (feed rate) en mm/min — en G0 usa `travel_speed`, en G1 usa `draw_speed`.

## 5. API Contract (shared/api-contract.json)

Endpoint principal: **POST `/api/v1/convert/`** — multipart/form-data

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `image` | File | Sí | PNG/JPEG/WebP ≤ 10 MB |
| `params` | JSON string | Sí | Parámetros de conversión (ver abajo) |
| `variant` | enum | Sí | `fast` \| `detailed` \| `balanced` |

### ConvertParams

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `scale` | number | 1.0 | Multiplicador de coordenadas de salida (mm) |
| `threshold` | number | 128 | Umbral bajo Canny (0–255). **Ignorado si `auto_threshold=true`** |
| `simplify_tolerance` | number | 1.0 | Tolerancia Douglas-Peucker (suavizado) |
| `auto_threshold` | boolean | false | Activa selector difuso automático de umbral (Mamdani) |
| `machine.work_area_w_mm` | number | 210 | Ancho área trabajo (mm) |
| `machine.work_area_h_mm` | number | 297 | Alto área trabajo (mm) |
| `machine.travel_speed` | number? | — | Velocidad G0 (mm/min) |
| `machine.draw_speed` | number? | — | Velocidad G1 (mm/min) |
| `rotation_deg` | number | 0 | Rotación: 0, 90, 180, 270 |
| `flip_h` | boolean | false | Espejo horizontal |
| `flip_v` | boolean | false | Espejo vertical |

### ConvertResponse

```json
{
  "gcode": "G90\nG21\nM3\nG0 X0 Y0 F3000\nG1 X10 Y10 F1500\nM5\n",
  "meta": {
    "variant": "balanced",
    "stages_run": ["preprocess", "edges", "contours", "simplify", "fuzzy"],
    "elapsed_ms": 142,
    "fuzzy": {
      "inputs": {"contrast": 45.2, "edge_density": 12.8},
      "memberships": {"contrast": {"bajo": 0.1, "medio": 0.7, "alto": 0.2}, ...},
      "fired_rules": [{"id": "R5", "text": "SI contraste=medio Y edge_density=media ENTONCES threshold=medio", "activation": 0.65}],
      "defuzzified": 127.3,
      "threshold": 127
    }
  },
  "warnings": []
}
```

> `meta.fuzzy` **solo presente** cuando `auto_threshold=true`. `stages_run` incluye `"fuzzy"` solo en ese caso. Cuando `auto_threshold=false`, `stages_run` es exactamente `["preprocess", "edges", "contours", "simplify"]` y `meta.fuzzy` está ausente.

## 6. Presets de Tipo de Imagen (Frontend)

| Preset | threshold | simplify_tolerance | variant | auto_threshold |
|--------|-----------|-------------------|---------|----------------|
| Photo | 100 | 2.0 | balanced | false |
| Line Art | 180 | 0.5 | fast | false |
| Sketch | 150 | 1.0 | balanced | false |
| Text | 200 | 0.3 | fast | false |

> Al aplicar preset → `auto_threshold` se resetea a `false` (comportamiento predecible).

## 7. Despliegue

### Desarrollo (Docker Compose, hot-reload)

```bash
make docker-up
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api/v1/
# WebSocket: ws://localhost:8000/ws/
```

### Producción (Standalone, 1 comando tras configurar .env)

```bash
cp .env.example .env
# Edita DJANGO_SECRET_KEY y DJANGO_ALLOWED_HOSTS
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**Lo que hace ese único comando prod:**
1. `docker compose build` → compila backend (multi-stage) + frontend (standalone Next.js)
2. `python manage.py migrate --noinput` → migraciones Django **automáticas**
3. `daphne --proxy-headers` → backend ASGI listo
4. `node server.js` → frontend standalone listo
5. Healthchecks cada 30s (`/health/` backend, `/` frontend)
6. Restart policy `unless-stopped`, usuario no-root, resource limits

## 8. Testing

```bash
# Backend (requiere venv + Django settings)
cd backend
pytest tests/test_fuzzy_threshold.py -v      # 24 tests fuzzy
pytest tests/test_api.py -v                   # API integration (requiere Django)
pytest tests/ -v                              # Suite completa (116 tests)

# Frontend
cd frontend
npm run lint       # ESLint
npx tsc --noEmit  # TypeScript check
npm run build     # Next.js build
npm test          # Vitest
```