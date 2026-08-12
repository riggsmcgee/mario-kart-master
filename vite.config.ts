import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const PROTO_DIR = resolve(import.meta.dirname, 'src/proto');

/**
 * Every prototype is its own page: `src/proto/<id>/index.html`.
 * Vite is a multi-page app here, so each one gets discovered and built
 * without touching this config again. (1a1)
 */
function protoPages(): Record<string, string> {
  if (!existsSync(PROTO_DIR)) return {};
  const entries: Record<string, string> = {};
  for (const dir of readdirSync(PROTO_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const page = resolve(PROTO_DIR, dir.name, 'index.html');
    if (existsSync(page)) entries[`proto-${dir.name}`] = page;
  }
  return entries;
}

export default defineConfig(({ command }) => ({
  // Dev runs at the root; a production build is pathed for GitHub Pages
  // (repo-name subpath). Deployed by .github/workflows/deploy.yml since 1a5.
  base: command === 'build' ? '/mario-kart-master/' : '/',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        // The course is the front door (2a1). The Phase 1 lab moved to /testbed/ — it is kept
        // because the tuning panels live there and nowhere else.
        index: resolve(import.meta.dirname, 'index.html'),
        testbed: resolve(import.meta.dirname, 'testbed/index.html'),
        ...protoPages(),
      },
    },
  },
  server: {
    open: true,
  },
}));
