# CIPRA Frontend

Next.js 14 (App Router) application for the CIPRA image-to-GCode converter.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`)
- **Internationalization**: Custom context provider (`lib/i18n/`)
- **API**: `lib/types.ts` mirrors `shared/api-contract.json` (hand-written)
- **Testing**: Vitest
- **Linting**: ESLint (`next/core-web-vitals`)

## Structure

```
frontend/
├── app/
│   ├── page.tsx              # Main page: upload + parameter panel + preview
│   ├── layout.tsx            # Root layout, fonts, metadata
│   └── globals.css           # Tailwind + design tokens + global styles
├── components/
│   ├── ParameterPanel.tsx    # Parameter controls + work area config
│   ├── Toggle.tsx            # Accessible switch (role="switch")
│   ├── Tooltip.tsx           # Hover/focus tooltip
│   ├── ImageDropzone.tsx     # Drag-and-drop upload
│   ├── CanvasPreview.tsx     # Image preview on HTML5 Canvas
│   ├── GCodeViewer.tsx       # Parsed G-Code rendered on a canvas
│   ├── GCodeOutput.tsx       # G-Code text output + copy/download
│   ├── ConnectionBadge.tsx   # WebSocket status badge
│   ├── LanguageSwitcher.tsx  # EN/ES language toggle
│   ├── EmptyState.tsx        # Shared empty state
│   └── WarningsList.tsx      # Pipeline warnings
├── hooks/
│   ├── useConvert.ts         # Debounced conversion + manual trigger
│   └── useGcodeWs.ts         # WebSocket connection + publish
├── lib/
│   ├── api.ts                # API client (FormData + JSON params)
│   ├── types.ts              # ConvertParams, ConvertResponse, Variant
│   ├── presets.ts            # Image-type presets (photo, line_art, sketch, text)
│   ├── machine-defaults.ts   # Default conversion parameters
│   ├── gcode-parser.ts       # G-Code parsing helper
│   ├── ws.ts                 # WebSocket status client
│   └── i18n/                 # Provider, hook, and en/es dictionaries
├── public/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── vitest.config.mts
└── Dockerfile / Dockerfile.prod
```

## Features Implemented

- **Drag-and-drop image upload** with validation (PNG/JPEG/WebP ≤ 10 MB)
- **Parameter panel** with:
  - Image type presets (Photo, Line Art, Sketch, Text) — apply preset + reset `auto_threshold`
  - Scale (0.1–5.0, numeric input)
  - Auto Threshold toggle (accessible switch) — when ON, blocks threshold slider and sends `auto_threshold: true`
  - Threshold slider (0–255) + numeric input — disabled when Auto Threshold is ON
  - Tolerance slider (0.1–10.0) + numeric input (Douglas-Peucker)
  - Variant select (Fast / Detailed / Balanced)
  - Transform controls: rotation (0/90/180/270), flip H/V
  - Work Area collapsible: presets (A4, A3, Letter) + custom W/H + travel/draw speeds
- **Real-time canvas preview** of vector trajectories
- **G-Code download** and copy-to-clipboard
- **WebSocket status badge** with reconnect backoff
- **Full i18n** (English/Spanish) with localStorage persistence
- **Proxy rewrites** `/api/v1/*` → backend via `next.config.mjs`

## Development

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check
npm run build        # Production build (standalone output)
npm test             # Vitest
```

## Docker

Development (hot-reload):
```bash
make docker-up       # From repo root
```

Production (standalone, multi-stage build):
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## API Contract

`lib/types.ts` mirrors the JSON Schema in `shared/api-contract.json` by hand so
the frontend stays in sync with the backend request/response shape. The backend
`pipeline/types.py` module is regenerated from that same contract via:

```bash
python ../scripts/generate-contract-types.py
```
