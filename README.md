# CIPRA — Convertidor Inteligente de Píxeles a Rutas Automatizadas

CIPRA convierte imágenes 2D en trayectorias geométricas y emite G-Code estándar para brazo robótico SCARA. Monorepo desacoplado: Django REST backend, Next.js frontend, contrato API compartido.

## Stack

- **Backend**: Django + Django REST Framework + OpenCV + NumPy (pipeline visión) + channels/daphne (WebSocket)
- **Frontend**: Next.js 14 (App Router) + React + Tailwind + i18n custom
- **Contrato**: JSON Schema en `shared/api-contract.json`
- **Testing**: pytest (backend), ESLint + TypeScript (frontend)
- **DevOps**: Docker, Docker Compose, GitHub Actions

## Estructura

```
.
├── backend/            # Django project + vision pipeline
│   ├── cipra_api/      # Django settings, ASGI, URLs
│   ├── jobs/           # API views, serializers
│   ├── pipeline/       # Vision pipeline (preprocess, edges, contours, simplify, fuzzy)
│   ├── tests/          # pytest (116 tests)
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/           # Next.js 14 app
│   ├── app/            # App Router pages
│   ├── components/     # ParameterPanel, Toggle, Tooltip, etc.
│   ├── hooks/          # useConvert
│   ├── lib/            # types, api, i18n, presets, scara-defaults
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── shared/             # API contract + G-Code spec
├── openspec/           # SDD artifacts (specs, changes)
├── .github/workflows/  # CI/CD
├── docker-compose.yml
├── Makefile
├── README.md
└── .env.example
```

---

## Quickstart — Docker (recomendado)

**Requisitos**: Docker + Docker Compose instalados.

```bash
git clone https://github.com/ItsRhyas/CIPRA.git
cd CIPRA
cp .env.example .env   # edita DJANGO_SECRET_KEY en producción
make docker-up
```

Abre:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/v1/
- **WebSocket**: ws://localhost:8000/ws/

### Detener

```bash
make docker-down
```

### Ver logs

```bash
docker compose logs -f
```

---

## Desarrollo local (sin Docker)

### Backend

```bash
cd backend
pip install -e ".[dev]"
# Requiere: Python 3.12+, libgl1, libglib2.0-0 (OpenCV)
cp ../.env.example .env
python manage.py migrate
daphne -b 0.0.0.0 -p 8000 cipra_api.asgi:application
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Contrato API (`shared/api-contract.json`)

Endpoint principal: **POST `/api/v1/convert/`** — multipart/form-data

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `image` | File | Sí | PNG/JPEG/WebP ≤ 10 MB |
| `params` | JSON string | Sí | Parámetros de conversión (ver abajo) |
| `variant` | enum | Sí | `fast` \| `detailed` \| `balanced` |

### `ConvertParams` (frontend: `lib/types.ts`)

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `scale` | number | 1.0 | Multiplicador de coordenadas de salida (mm) |
| `threshold` | number | 128 | Umbral bajo Canny (0–255). **Ignorado si `auto_threshold=true`** |
| `simplify_tolerance` | number | 1.0 | Tolerancia Douglas-Peucker (suavizado) |
| `auto_threshold` | boolean | false | Activa selector difuso automático de umbral (Mamdani) |
| `scara.work_area_w_mm` | number | 210 | Ancho área trabajo SCARA (mm) |
| `scara.work_area_h_mm` | number | 297 | Alto área trabajo SCARA (mm) |
| `scara.travel_speed` | number? | — | Velocidad G0 (mm/min) |
| `scara.draw_speed` | number? | — | Velocidad G1 (mm/min) |
| `rotation_deg` | number | 0 | Rotación: 0, 90, 180, 270 |
| `flip_h` | boolean | false | Espejo horizontal |
| `flip_v` | boolean | false | Espejo vertical |

### `ConvertResponse`

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

> `meta.fuzzy` **solo presente** cuando `auto_threshold=true`. `stages_run` incluye `"fuzzy"` solo en ese caso.

---

## Pipeline Backend — Proceso completo

`backend/pipeline/orchestrator.py` ejecuta etapas en orden:

### 1. Preprocess (`backend/pipeline/preprocess.py`)
- Carga imagen → escala según `scale`
- Convierte a escala de grises
- Guarda grayscale en `StageResult.meta["grayscale"]` (para fuzzy)
- **Si `auto_threshold=false`**: aplica GaussianBlur + Canny con `threshold` manual
- **Si `auto_threshold=true`**: solo guarda grayscale; **no** hace Canny aún

### 2. Fuzzy (condicional — `backend/pipeline/fuzzy_threshold.py`)
> Solo si `auto_threshold=true`
- `compute_image_stats(grayscale)` → `contrast` (std/255×100) + `edge_density` (% gradiente > 25)
- **Fuzzificación**: `trimf`/`trapmf` sobre universos 0–100 (entradas) y 0–255 (salida)
- **9 reglas SI-ENTONCES** (R1–R9, matriz 3×3 contraste × densidad)
- **AND = min**, **Agregación = max**, **Defuzzificación = centroide**
- Devuelve `FuzzyThresholdResult(threshold: int, diagnostics: dict)`
- Umbral elegido pasa a etapa Edges

### 3. Edges (`backend/pipeline/edges.py`)
- Canny con umbral: **difuso** (si auto) o **manual** (params.threshold)
- `high = min(low × 2, 255)`
- Devuelve imagen binaria de bordes

### 4. Contours (`backend/pipeline/contours.py`)
- `cv2.findContours` modo `RETR_EXTERNAL`, `CHAIN_APPROX_NONE`
- Filtra por área mínima
- Ordena contornos por posición (heurística lectura natural)

### 5. Simplify (`backend/pipeline/simplify.py`)
- Douglas-Peucker (`simplify_tolerance`) por contorno
- **TSP nearest-neighbor** para ordenar segmentos (minimiza desplazamientos G0)
- Emite lista de coordenadas `(x, y)` en mm

### 6. G-Code Formatter (`backend/pipeline/gcode_formatter.py`)
- Header: `G90 G21 M3`
- `G0` (travel) con `F{travel_speed}` o default
- `G1` (draw) con `F{draw_speed}` o default
- `M5` al final

---

## Frontend — UI y Parámetros

### `ParameterPanel` (`components/ParameterPanel.tsx`)

Panel principal de parámetros. Props:
- `params: ConvertParams & { variant: Variant }`
- `onChange(partialParams)`
- `disabled?: boolean` (true durante upload)
- `imageType` + `onImageTypeChange` (presets foto/line_art/sketch/text)

**Controles:**

| Parámetro | UI | Comportamiento |
|-----------|----|----------------|
| **Image Type** | Píldoras (Photo, Line Art, Sketch, Text) | Aplica preset + resetea `auto_threshold=false` |
| **Scale** | Solo input numérico (0.1–5.0, step 0.1) | Sin slider arrastrable |
| **Auto Threshold** | **Switch** (Toggle) | OFF: slider threshold activo; ON: slider **bloqueado**, usa fuzzy |
| **Threshold** | Slider (0–255) + input numérico | **Bloqueado** cuando Auto Threshold = ON |
| **Tolerance** | Slider (0.1–10.0) + input numérico | Suavizado Douglas-Peucker |
| **Variant** | Select (Fast / Detailed / Balanced) | Modo preprocess |
| **Transform** | Píldoras rotación (0/90/180/270) + botones Flip H/V | Rotación y espejo |
| **Work Area** | Collapsible: preset A4/A3/Letter + inputs W/H + speeds | Config SCARA |

### Toggle Auto Threshold

- Reusa componente `Toggle` (accesible: `role="switch"`, `aria-checked`)
- Prop `disabled` respeta `disabled` global del panel (upload)
- i18n: `params.autoThreshold` / `params.autoThreshold.tooltip` (en/es)

### Presets (`lib/presets.ts`)

| Preset | threshold | simplify_tolerance | variant | auto_threshold |
|--------|-----------|-------------------|---------|----------------|
| Photo | 100 | 2.0 | balanced | false |
| Line Art | 180 | 0.5 | fast | false |
| Sketch | 150 | 1.0 | balanced | false |
| Text | 200 | 0.3 | fast | false |

> Al aplicar preset → `auto_threshold` se resetea a `false` (comportamiento predecible).

### Estado y Flujo

- **Owner**: `app/page.tsx` → `useState<ConvertParams & {variant}>(DEFAULTS)`
- **Convert**: `hooks/useConvert.ts` (debounce 500ms + botón manual)
- **API call**: `lib/api.ts` → `FormData` con `image` + `params` (JSON string) + `variant`
- **Proxy**: `next.config.mjs` reescribe `/api/v1/*` → `http://localhost:8000/api/v1/*`

### i18n

Custom context provider (`lib/i18n/`):
- Diccionarios planos: `en.ts`, `es.ts` (claves idénticas)
- Hook `useT()` → `t('key', {vars})` con interpolación `{placeholder}`
- Persistencia locale en `localStorage['cipra-lang']`

---

## Docker — Detalles y Compatibilidad

### Arquitectura compose

```yaml
services:
  backend:
    build: ./backend
    command: daphne -b 0.0.0.0 -p 8000 cipra_api.asgi:application
    volumes: ["./backend:/app"]          # hot-reload dev
    environment: [DJANGO_DEBUG, DJANGO_SECRET_KEY, PYTHONUNBUFFERED]
    ports: ["8000:8000"]

  frontend:
    build: ./frontend
    command: npm run dev
    volumes: ["./frontend:/app", "/app/node_modules"]
    environment: [NEXT_PUBLIC_API_URL=http://backend:8000]
    ports: ["3000:3000"]
    depends_on: [backend]
```

### ¿Funciona en cualquier SO con un comando?

**Sí, con Docker Desktop instalado** (Windows, macOS, Linux).

| Entorno | Comandos | Qué incluye |
|---------|----------|-------------|
| **Dev** | `make docker-up` **(1 comando)** | Hot-reload, bind mounts, defaults en compose |
| **Prod** | `cp .env.example .env` (1 vez) + **1 comando** docker compose | Build multi-stage, migraciones auto, healthchecks, no-root, restart policy, resource limits |

---

#### Desarrollo (hot-reload)

```bash
make docker-up
```

Abre http://localhost:3000 (frontend) / http://localhost:8000 (API).

---

#### Producción (standalone, 1 comando tras configurar .env)

```bash
# 1. Solo la primera vez: configura secrets
cp .env.example .env
# Edita DJANGO_SECRET_KEY y DJANGO_ALLOWED_HOSTS en .env

# 2. Un solo comando que lo hace TODO (build + migraciones + arranque + healthchecks)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**Lo que hace ese único comando prod:**

| Orden | Acción |
|-------|--------|
| 1 | `docker compose build` → compila backend (multi-stage) + frontend (standalone) |
| 2 | `python manage.py migrate --noinput` → migraciones Django **automáticas** |
| 3 | `daphne --proxy-headers` → backend ASGI listo |
| 4 | `node server.js` → frontend standalone listo |
| 5 | Healthchecks cada 30s (`/health/` backend, `/` frontend) |
| 6 | Restart policy `unless-stopped` |

**Archivos añadidos para prod:**
- `docker-compose.prod.yml` — orquestación prod (sin volúmenes, healthchecks, resources limits)
- `backend/Dockerfile` — multi-stage `dev` / `prod` (target `prod` en compose)
- `frontend/Dockerfile.prod` — build standalone Next.js (`output: 'standalone'`)
- `backend/jobs/views.py` — `HealthCheckView` en `/health/` (sin auth)
- `backend/jobs/urls.py` + `cipra_api/urls.py` — rutas `/health/`
- `frontend/next.config.mjs` — `output: 'standalone'`

---

#### Desarrollo vs Producción (resumen)

| Aspecto | `docker-compose.yml` (dev) | `docker-compose.prod.yml` (prod) |
|---------|---------------------------|----------------------------------|
| Volúmenes | Bind mounts (hot-reload) | **No** — código copiado en imagen |
| Backend CMD | `daphne` directo | `migrate` → `daphne --proxy-headers` |
| Frontend CMD | `npm run dev` | `node server.js` (standalone build) |
| Usuario | root (dev) | `app` (no-root) |
| Healthchecks | No | Sí (30s interval) |
| Restart policy | No | `unless-stopped` |
| Resources limits | No | Sí (memory limits) |
| `.env` | Opcional (defaults) | **Requerido** (secrets reales) |
| Migraciones Django | Manual | **Automáticas** |

---

## Testing

```bash
# Backend (requiere venv + Django settings)
cd backend
pytest tests/test_fuzzy_threshold.py -v      # 24 tests fuzzy
pytest tests/test_api.py -v                   # API integration (requiere Django)

# Frontend
cd frontend
npm run lint       # ESLint
npx tsc --noEmit  # TypeScript check
npm run build     # Next.js build (requiere .next escribible)
```

---

## SDD Artifacts

Cambios trazados en `openspec/changes/` y specs en `openspec/specs/`. Último cambio archivado: `fuzzy-auto-threshold` (motor difuso + switch frontend).

---

## Licencia

MIT