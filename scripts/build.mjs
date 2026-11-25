import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { settings } from '../seo.mjs';

// Sestavení pro Node hosting: formulář potřebuje server, samotný statický hosting nestačí.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
if (settings().canIndex)
  throw new Error('Náhled musí zůstat neindexovatelný. Před sestavením nastavte indexable: false.');
await import('./prepare-seo.mjs');
await mkdir(path.join(output, 'assets'), { recursive: true });
const files = [
  'index.html',
  'style.css',
  'app.js',
  'vyber-systemu-kvality.html',
  'robots.txt',
  'sitemap.xml',
  'server.mjs',
  'pilot.mjs',
  'seo.mjs',
  'seo.config.json',
  'guide.mjs',
  'content.mjs',
  'package.json',
  'package-lock.json',
  '.env.example',
];
for (const file of [...files, 'assets/favicon.svg', 'assets/inspection.jpg'])
  await cp(path.join(root, file), path.join(output, file));
await writeFile(
  path.join(output, 'SPUSTENI.txt'),
  'Neveřejný náhled Qualio\n\nVyžaduje Node.js 24.\n1. npm ci --omit=dev\n2. Doplňte proměnné podle .env.example do souboru .env nebo prostředí hostingu.\n3. npm start\n\nNáhled zůstává noindex. Nepovolujte indexaci ani veřejné DNS před potvrzením značky. Pro vzdálený náhled použijte přístupovou ochranu hostingu; noindex není autentizace.\nSamotné nahrání HTML na statický hosting nezprovozní /api/pilot.\n',
);
const html = await readFile(path.join(output, 'index.html'), 'utf8');
if (!html.includes('noindex, follow')) throw new Error('V sestavení chybí noindex.');
console.log('Sestavení neveřejného Node náhledu: dist/ (bez .env, klíčů a vývojových podkladů).');
