# Convenciones de Git para CIPRA

## Branches

| Branch | Uso | Notas |
|---|---|---|
| `main` | Producción estable (rama default) | Nunca se hace push directo; solo merges desde `develop` (release) o `hotfix` |
| `develop` | Desarrollo principal | Acumula features completas y testeadas; rama base de features, refactors y bugfixes |
| `feature/<nombre>` | Desarrollo de una nueva funcionalidad | Se crea desde `develop` y se mergea a `develop` vía Pull Request al terminar |
| `refactor/<nombre>` | Rediseño o refactor estructural sin cambio funcional | Se crea desde `develop` y se mergea a `develop` vía Pull Request (ej. `refactor/frontend-redesign`) |
| `bugfix/<nombre>` | Corrección de errores no urgentes | Se crea desde `develop` y se mergea a `develop` vía Pull Request |
| `hotfix/<nombre>` | Corrección urgente en producción | Se crea desde `main`; se mergea a `main` (con tag) y se propaga a `develop` |
| `release/<version>` | Preparación de release | Se crea desde `develop` antes de un release; permite ajustes menores y testing; se mergea a `main` y `develop` |

> **Nota:** CIPRA sigue **Git Flow simplificado con `develop`**. Todo el desarrollo de features/refactors/bugfixes vive en `develop`; `main` solo recibe releases y hotfixes. El `main` local siempre trackea `origin/main` y el `develop` local `origin/develop`; verifica con `git status -sb` que no aparezca "ahead/behind" sin motivo.

Ejemplos de nombres:

- `feature/gcode-ws-integration`
- `feature/vision-algorithms`
- `refactor/frontend-redesign`
- `bugfix/fix-aspect-ratio-ux`
- `hotfix/fix-frontend-build`
- `release/v0.2.0`

## Convenciones de commits

Se usan Conventional Commits, con mensajes en **inglés**:

```text
<tipo>(<área>): <descripción corta>

[body opcional]

[footer opcional]
```

Tipos permitidos:

| Tipo | Descripción | Ejemplo |
|---|---|---|
| `feat` | Nueva funcionalidad | `feat(ws): add envelope protocol and lock-safe SnapshotStore` |
| `fix` | Corrección de bug | `fix(jobs): emit E_EMPTY_PAYLOAD warning on empty gcode` |
| `docs` | Cambios en documentación | `docs(readme): document ASGI dev command` |
| `style` | Formato, linting, espacios | `style(backend): apply ruff formatting` |
| `refactor` | Refactorización sin cambio funcional | `refactor(frontend): simplify layout of cards` |
| `perf` | Mejoras de rendimiento | `perf(backend): optimize pipeline stage allocation` |
| `test` | Añadir o corregir tests | `test(frontend): add RED specs for ws status client` |
| `chore` | Tareas de mantenimiento | `chore(frontend): bootstrap vitest as the test runner` |
| `merge` | Resolución de conflictos al integrar `develop` (o `main`) en la rama | `merge: resolve PR #17 conflicts` |
| `build` | Cambios en el sistema de build/deps | `build(backend): add channels and daphne deps for ASGI` |

Áreas (`<área>`) usadas en el proyecto:

| Área | Alcance |
|---|---|
| `frontend` | UI React/Next.js, componentes, hooks, i18n |
| `backend` | Django/DRF, views, serializers, config |
| `ws` | Capa WebSocket/ASGI (channels, daphne, consumers) |
| `jobs` | Servicio de conversión/publish |
| `gcode` | Formateador de G-Code |
| `pipeline` | Pipeline de visión (preprocess, simplify, edges, orchestrator) |
| `vision` | Algoritmos de visión/OpenCV |
| `api` | Contrato de API (shared/api-contract.json) |
| `ui` | Tokens de diseño, estilos, layout |
| `ci` | GitHub Actions, pipelines de CI |
| `scaffold` | Estructura inicial del repositorio |
| `docs` | Documentación y openspec |

Reglas generales:

- Mensaje corto: máximo 50 caracteres en la primera línea.
- Descripción en **inglés e imperativo**: "Add feature" en lugar de "Added feature".
- Body opcional para explicar el qué y el porqué.
- Footer opcional para issues o breaking changes:

```text
BREAKING CHANGE: cambia el formato de respuesta de /api/v1/convert/
Closes #42
```

- **Prohibido**: `Co-Authored-By`, atribución de IA o firmas de herramientas en los commits.
- Los merges de PR los genera GitHub (`Merge pull request #N from ItsRhyas/...`); no los crees manualmente salvo la resolución de conflictos (`merge: ...`).

## Flujo de trabajo recomendado

Siempre partir de `develop` actualizado para nuevas features:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre
```

Hacer commits frecuentes y atómicos siguiendo las convenciones.

Al terminar la feature:

```bash
git push origin feature/nombre
# Abrir Pull Request hacia develop con reviewers
# Esperar CI verde: ruff + pytest (backend), tsc + lint + build (frontend)
```

Merge de la PR a `develop` (merge commit, el estándar del repositorio):

```bash
gh pr merge <numero> --merge
git checkout develop
git pull origin develop
```

Para preparar releases:

```bash
git checkout develop
git pull origin develop
git checkout -b release/vX.Y.Z
# Ajustes menores y pruebas
git checkout main
git merge --no-ff release/vX.Y.Z
git tag vX.Y.Z
git push origin main --tags
git checkout develop
git merge --no-ff release/vX.Y.Z
git push origin develop
```

Para hotfixes críticos:

```bash
git checkout main
git checkout -b hotfix/nombre
# arreglar bug
git checkout main
git merge --no-ff hotfix/nombre
git tag vX.Y.Z+1
git push origin main --tags
git checkout develop
git merge --no-ff hotfix/nombre
git push origin develop
```

## Resolución de conflictos

Cuando una PR queda `CONFLICTING` contra `develop`:

```bash
git checkout feature/nombre
git merge develop
# resolver conflictos (preferir el diseño vigente de develop e integrar la feature encima)
git add <archivos> && git commit -m "merge: resolve conflicts with develop"
git push origin feature/nombre
```

Verificar que la PR quede `MERGEABLE` y con CI verde antes de mergear.

## Recomendaciones adicionales

- Antes de abrir una PR, haz `git pull --rebase origin develop` en tu rama local para evitar conflictos.
- Utilizar reviewers en las Pull Requests.
- Evitar commits que rompan la compilación o los tests del proyecto.
- Mantener PRs pequeños y enfocados en una sola feature o bugfix; si una PR supera ~400 líneas, considerar dividirla en PRs encadenadas (chained PRs).
- No dejar el `main` o `develop` local con upstream roto: `main` debe apuntar a `origin/main` y `develop` a `origin/develop`.

## Verificación local

Backend (desde `backend/`, usando el venv):

```bash
.venv/bin/python -m pytest -q
.venv/bin/python -m pip install -e "./backend[dev]"   # si falta alguna dependencia
```

Frontend (desde `frontend/`):

```bash
npm test        # vitest
npm run build   # next build (compila + type-check)
```

Lint de backend:

```bash
ruff check backend
```

CI local completa (equivalente a `ci.yml`): `ruff check backend` + `pytest backend` + `npx tsc --noEmit` + `npx next lint` + `npx next build`.
