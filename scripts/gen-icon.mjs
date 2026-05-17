// Renders build/icon.svg to multi-resolution PNGs that electron-builder picks up.
//
// Usage: `node scripts/gen-icon.mjs`
// Requires the optional `sharp` package — installable with
// `npm install --no-save sharp` when regenerating.
//
// Outputs:
//   build/icon.png      (1024×1024 — source for icon.ico / icon.icns generation)
//   build/icon-512.png  (512×512   — convenience size for Linux / web)
//   build/icon-256.png  (256×256   — convenience size)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildDir = path.resolve(__dirname, '..', 'build');

await mkdir(buildDir, { recursive: true });

const svg = await readFile(path.join(buildDir, 'icon.svg'));

const sizes = [
  { name: 'icon.png', size: 1024 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-256.png', size: 256 },
];

for (const { name, size } of sizes) {
  const png = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(buildDir, name), png);
  console.log(`  wrote build/${name} (${size}×${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}

console.log('done.');
