# CIPRA — Convertidor Inteligente de Píxeles a Rutas Automatizadas

CIPRA turns 2D images into geometric trajectories and emits standard G-Code for a SCARA robotic arm. The project is a decoupled monorepo with a Django REST backend, a future Next.js frontend, and a shared API contract.

## Stack

- **Backend**: Django + Django REST Framework + OpenCV + NumPy
- **Frontend**: Next.js (React) — placeholder in this slice
- **Contract**: JSON Schema under `shared/`
- **Tooling**: pytest, pytest-django, ruff
- **DevOps**: Docker, Docker Compose, GitHub Actions

## Repository layout

```
.
├── backend/            # Django project and processing packages (added in later slices)
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/           # Next.js frontend placeholder
├── shared/             # API contract and G-Code specification
├── .github/workflows/  # CI/CD
├── docker-compose.yml
├── Makefile
└── README.md
```

## Quickstart

Install the Python tooling locally:

```bash
make install
```

Run linting and tests:

```bash
make lint
make test
```

Start the development environment with Docker:

```bash
make docker-up
```

The backend service listens on port `8000` once the full Django project is added.

## Frontend

The Next.js 14 frontend lives in `frontend/` and provides the image-to-GCode converter UI.

Install dependencies:

```bash
cd frontend && npm install
```

Start the development server:

```bash
make frontend-dev
```

The app will be available at [http://localhost:3000](http://localhost:3000). API requests to `/api/v1/*` are proxied to the Django backend on `localhost:8000` via `next.config.mjs` rewrites, so the backend must be running for conversion to work.

Build for production:

```bash
make frontend-build
```

Lint the frontend source:

```bash
make frontend-lint
```

## Architecture overview

1. A client uploads an image plus processing parameters to `POST /api/v1/convert/`.
2. The backend runs a 4-stage vision pipeline:
   - **preprocess** — grayscale + Gaussian blur
   - **edges** — Canny edge detection
   - **contours** — contour extraction
   - **simplify** — Douglas-Peucker + TSP ordering
3. The G-Code formatter translates the resulting coordinate list into geometric G-Code (`G90`, `G21`, `M3`, `M5`, `G0`, `G1`).
4. The response contains the G-Code program, execution metadata, and any warnings.

Processing is synchronous in this scaffold; async workers may be introduced later.

## Development commands

| Command            | Description                                |
|--------------------|--------------------------------------------|
| `make help`        | Show this command list                     |
| `make install`     | Install editable Python dependencies       |
| `make test`        | Run pytest                                 |
| `make lint`        | Run ruff                                   |
| `make format`      | Format and auto-fix code                   |
| `make docker-up`   | Start services with Docker Compose         |
| `make docker-build`| Build the Docker image                     |
| `make clean`       | Remove caches and build artifacts          |

## License

MIT
