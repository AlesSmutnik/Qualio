import { createPilotService, handlePilotRequest } from './pilot.mjs';
import { guide } from './content.mjs';
import { renderGuide } from './guide.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { settings, renderSeo, robots, sitemap } from './seo.mjs';
// 01 — Cesty, MIME typy a veřejně dostupné soubory
const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
};
const publicFiles = new Set([
  '/style.css',
  '/app.js',
  '/assets/favicon.svg',
  '/assets/inspection.jpg',
]);
// 02 — HTTP server: stránky, zdroje, přesměrování a chyby
export function createServer(config = settings(), { pilotService = createPilotService() } = {}) {
  return http.createServer(async (req, res) => {
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
    if (!config.canIndex) headers['X-Robots-Tag'] = 'noindex, follow';
    function send(status, body, type = 'text/html; charset=utf-8') {
      res.writeHead(status, { ...headers, 'Content-Type': type });
      res.end(req.method === 'HEAD' ? undefined : body);
    }
    try {
      if (new URL(req.url, 'http://localhost').pathname === '/api/pilot') {
        return await handlePilotRequest(req, res, pilotService);
      }
      if (!['GET', 'HEAD'].includes(req.method)) {
        headers.Allow = 'GET, HEAD';
        return send(405, 'Method not allowed', 'text/plain; charset=utf-8');
      }
      const url = new URL(req.url, 'http://localhost');
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        return send(400, 'Bad request', 'text/plain; charset=utf-8');
      }
      if (pathname === '/index.html') {
        res.writeHead(301, { ...headers, Location: '/' + url.search });
        return res.end();
      }
      if (pathname === guide.path) {
        headers['Cache-Control'] = 'no-cache';
        return send(200, renderGuide(config));
      }
      if (pathname === '/robots.txt') return send(200, robots(config), 'text/plain; charset=utf-8');
      if (pathname === '/sitemap.xml')
        return send(200, sitemap(config), 'application/xml; charset=utf-8');
      if (pathname !== '/' && !publicFiles.has(pathname)) {
        headers['X-Robots-Tag'] = 'noindex';
        return send(
          404,
          '<!doctype html><html lang="cs"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Stránka nenalezena | QUALIO</title><h1>Stránka nebyla nalezena</h1><p>Zkontrolujte adresu nebo se vraťte na <a href="/">úvodní stránku QUALIO</a>.</p></html>',
        );
      }
      const raw = await readFile(
        path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1)),
      );
      const body = pathname === '/' ? Buffer.from(renderSeo(raw.toString('utf8'), config)) : raw;
      const etag = '"' + createHash('sha256').update(body).digest('base64url').slice(0, 24) + '"';
      headers.ETag = etag;
      headers['Cache-Control'] =
        pathname === '/' ? 'no-cache' : 'public, max-age=3600, must-revalidate';
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers);
        return res.end();
      }
      return send(200, body, mime[path.extname(pathname)] || 'text/html; charset=utf-8');
    } catch {
      return send(500, 'Internal server error', 'text/plain; charset=utf-8');
    }
  });
}
// 03 — Spuštění náhledu; --production povolí produkční indexaci
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createServer(settings());
  server.listen(Number(process.env.PORT) || 3000, process.env.HOST || '127.0.0.1', () =>
    console.log('QUALIO běží na http://localhost:' + server.address().port),
  );
}
