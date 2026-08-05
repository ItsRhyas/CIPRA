import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * CIPRA frontend test config (AD-4).
 *
 * Plain vitest without the next-vitest plugin. `environment: 'node'` keeps the
 * setup framework-free: tests only exercise pure modules (`lib/ws.ts`,
 * `lib/api.ts`) using `vi.stubGlobal` to fake `WebSocket` / `fetch`. Hooks and
 * components are intentionally NOT covered here (no jsdom / @testing-library
 * deps), so `next build` is unaffected.
 *
 * The `@/*` alias mirrors `tsconfig.json` paths so test imports resolve the same
 * way the app does.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});