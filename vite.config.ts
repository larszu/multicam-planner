import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Inject package.json's version as a build-time constant. The release workflow
// (.github/workflows/release-build.yml) runs `npm version <git-tag>` before
// building, so the displayed version automatically matches the git release tag
// in shipped artifacts; in local dev it reflects whatever package.json says.
const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // Force the bundled 3D label font to inline as a base64 data: URL regardless
    // of size. troika (drei <Text>) loads fonts via fetch(), and in a packaged
    // Electron app (file:// origin) fetch() of a file:// URL is blocked by
    // Chromium — a data: URL works offline with no network and no file fetch.
    assetsInlineLimit(filePath) {
      if (filePath.includes('Roboto-Regular.ttf')) return true;
      return undefined; // everything else: default 4 KB threshold
    },
  },
});
