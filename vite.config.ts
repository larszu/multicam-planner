import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
  plugins: [react()],
  server: { port: 5173 },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
