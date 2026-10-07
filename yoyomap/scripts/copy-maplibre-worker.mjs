// MapLibre GL loads its web worker from a file next to its own module, which the Next.js
// bundle doesn't emit. When OpenFreeMap tiles are on (NEXT_PUBLIC_MAP_TILES=openfreemap),
// copy the worker and the shared chunk it imports into public/ so the app can serve them
// (see src/app/[locale]/map/VectorTiles.tsx). Otherwise remove any old copy, so a default
// deploy carries no extra files.
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'vendor', 'maplibre');

if (process.env.NEXT_PUBLIC_MAP_TILES !== 'openfreemap') {
  rmSync(out, { recursive: true, force: true });
  process.exit(0);
}

const require = createRequire(import.meta.url);
const dist = join(dirname(require.resolve('maplibre-gl/package.json')), 'dist');
mkdirSync(out, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(dist, file), join(out, file));
}
console.log(`[maplibre] worker copied to ${out}`);
