// Renders build/icon.svg to multi-resolution PNGs that electron-builder picks up,
// plus a multi-resolution .ico file for the Windows NSIS installer.
//
// Usage: `node scripts/gen-icon.mjs`
// Requires the optional `sharp` + `png-to-ico` packages — installable with
//   npm install --no-save sharp png-to-ico
// when regenerating.
//
// Outputs:
//   build/icon.png      (1024×1024 — used by electron-builder build.{win,mac}.icon)
//   build/icon-512.png  (512×512   — convenience size for Linux / web)
//   build/icon-256.png  (256×256   — convenience size)
//   build/icon.ico      (multi-res: 16/24/32/48/64/128/256 — required by NSIS
//                        for installerIcon / uninstallerIcon / installerHeaderIcon)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildDir = path.resolve(__dirname, '..', 'build');

await mkdir(buildDir, { recursive: true });

const svg = await readFile(path.join(buildDir, 'icon.svg'));

const pngSizes = [
  { name: 'icon.png', size: 1024 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-256.png', size: 256 },
];

for (const { name, size } of pngSizes) {
  const png = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(buildDir, name), png);
  console.log(`  wrote build/${name} (${size}×${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}

// Generate a multi-resolution .ico. NSIS uses this for the installer chrome and
// rejects PNGs ("invalid icon file"), so it has to live next to the PNGs.
const icoBuffers = await Promise.all(
  [16, 24, 32, 48, 64, 128, 256].map((size) =>
    sharp(svg, { density: 384 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer(),
  ),
);
const ico = await pngToIco(icoBuffers);
await writeFile(path.join(buildDir, 'icon.ico'), ico);
console.log(`  wrote build/icon.ico (multi-res 16…256, ${(ico.length / 1024).toFixed(1)} KB)`);

console.log('done.');
