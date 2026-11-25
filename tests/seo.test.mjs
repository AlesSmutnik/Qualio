import { format, resolveConfig } from 'prettier';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { settings, renderSeo, metadata, robots, sitemap } from '../seo.mjs';
import { createServer } from '../server.mjs';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const production = settings({ indexable: true });
const preview = settings({ indexable: false });
const publicHtml = renderSeo(html, production);
function schema(source) {
  return JSON.parse(source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
}

test('production canonical, schema and sitemap agree on qualio.cz', () => {
  assert.equal(production.siteUrl, 'https://qualio.cz/');
  assert.match(publicHtml, /<link rel="canonical" href="https:\/\/qualio.cz\/">/);
  assert.match(publicHtml, /<meta name="robots" content="index, follow/);
  const graph = schema(publicHtml)['@graph'];
  assert.equal(graph[0].url, production.siteUrl);
  assert.equal(graph[1].url, production.siteUrl);
  assert.equal(graph[1].isPartOf['@id'], graph[0]['@id']);
  assert.match(sitemap(production), /<loc>https:\/\/qualio.cz\/<\/loc>/);
  assert.equal((sitemap(production).match(/<loc>/g) || []).length, 2);
  assert.ok(!sitemap(production).includes('#'));
  assert.match(robots(production), /Sitemap: https:\/\/qualio.cz\/sitemap.xml/);
});
test('preview uses noindex and stays crawlable so noindex can be read', () => {
  assert.match(metadata(preview), /content="noindex, follow"/);
  assert.ok(!robots(preview).includes('Disallow: /'));
  assert.ok(!sitemap(preview).includes('<loc>'));
  assert.ok(!robots(preview).includes('Sitemap:'));
  const unconfigured = settings({ siteUrl: null });
  assert.equal(unconfigured.canIndex, false);
  assert.ok(!metadata(unconfigured).includes('rel="canonical"'));
});
test('rejects malformed canonical origins', () => {
  for (const siteUrl of [
    'http://qualio.cz/',
    'https://qualio.cz/path',
    'https://qualio.cz/?x=1',
    'https://user:pass@qualio.cz/',
    'https://localhost/',
  ])
    assert.throws(() => settings({ siteUrl }));
});
test('metadata is unique, escaped and generated idempotently', () => {
  assert.equal((publicHtml.match(/<title>/g) || []).length, 1);
  assert.equal((publicHtml.match(/name="description"/g) || []).length, 1);
  assert.equal((publicHtml.match(/name="robots"/g) || []).length, 1);
  assert.equal((publicHtml.match(/rel="canonical"/g) || []).length, 1);
  assert.equal(renderSeo(publicHtml, production), publicHtml);
  const hostile = metadata(
    settings({ title: 'A < B "test"', description: '</script><img src=x>' }),
  );
  assert.ok(hostile.includes('&lt; B &quot;test&quot;'));
  assert.equal(schema(hostile)['@graph'][1].description, '</script><img src=x>');
  assert.ok(!hostile.includes('</script><img'));
});
test('headings, Czech content and section anchors exist without JavaScript', () => {
  assert.match(html, /<html lang="cs"/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  for (const topic of ['kontrolni-plany', 'rizeni-neshod', 'audity-kvality', 'otazky'])
    assert.ok(html.includes(`id="${topic}"`));
  assert.ok(html.includes('Aplikace je ve vývoji.'));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const link of html.matchAll(/href="#([^"]+)"/g))
    assert.ok(ids.includes(link[1]), `Missing anchor ${link[1]}`);
  assert.match(
    html,
    /<img[^>]+width="1254"\s+height="1254"[^>]+alt="[^"]+"[^>]+fetchpriority="high"/,
  );
  assert.ok(!html.includes('hreflang='));
});
test('structured data describes the demo without invented product reviews or offers', () => {
  const data = schema(publicHtml);
  assert.equal(data['@context'], 'https://schema.org');
  assert.ok(!JSON.stringify(data).includes('aggregateRating'));
  assert.ok(!JSON.stringify(data).includes('offers'));
  assert.equal(data['@graph'][1].inLanguage, 'cs');
  assert.match(
    publicHtml,
    /<meta property="og:image" content="https:\/\/qualio.cz\/assets\/inspection.jpg">/,
  );
});

test('HTTP routes, redirects, caching, assets and crawl endpoints', async () => {
  const server = createServer(production);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(origin);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-robots-tag'), null);
    const body = await response.text();
    assert.match(body, /rel="canonical" href="https:\/\/qualio.cz\/"/);
    for (const asset of [...body.matchAll(/(?:src|href)="(\/(?!#)[^"?]+)"/g)].map((m) => m[1]))
      assert.equal((await fetch(origin + asset)).status, 200, asset);
    const image = await fetch(origin + '/assets/inspection.jpg');
    assert.equal(image.headers.get('content-type'), 'image/jpeg');
    assert.ok(
      Number(image.headers.get('content-length')) < 300000 ||
        (await image.arrayBuffer()).byteLength < 300000,
    );
    assert.equal(
      (await fetch(origin, { headers: { 'If-None-Match': response.headers.get('etag') } })).status,
      304,
    );
    assert.equal((await fetch(origin, { method: 'HEAD' })).status, 200);
    const redirect = await fetch(origin + '/index.html?utm_source=test', { redirect: 'manual' });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('location'), '/?utm_source=test');
    for (const route of [
      '/neexistuje',
      '/seo.config.json',
      '/package.json',
      '/design/01-hero.png',
      '/server.mjs',
    ]) {
      const r = await fetch(origin + route);
      assert.equal(r.status, 404, route);
      assert.equal(r.headers.get('x-robots-tag'), 'noindex');
    }
    assert.equal((await fetch(origin, { method: 'POST' })).status, 405);
    const bot = await fetch(origin + '/robots.txt');
    assert.match(await bot.text(), /Sitemap: https:\/\/qualio.cz\/sitemap.xml/);
    const map = await fetch(origin + '/sitemap.xml');
    assert.match(map.headers.get('content-type'), /application\/xml/);
    assert.match(await map.text(), /<loc>https:\/\/qualio.cz\/<\/loc>/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test('preview HTTP response includes noindex in both HTML and headers', async () => {
  const server = createServer(preview);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}`);
    assert.match(r.headers.get('x-robots-tag'), /noindex/);
    assert.match(await r.text(), /name="robots" content="noindex, follow"/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('guide is independently indexable with its own canonical and consistent breadcrumbs', async () => {
  const { renderGuide } = await import('../guide.mjs');
  const { guide } = await import('../content.mjs');
  const body = renderGuide(production);
  assert.equal((body.match(/<h1>/g) || []).length, 1);
  assert.ok(body.includes(`rel="canonical" href="https://qualio.cz${guide.path}"`));
  assert.ok(!body.includes('rel="canonical" href="https://qualio.cz/"'));
  assert.ok(!body.includes('<script src='));
  const graph = schema(body)['@graph'];
  assert.equal(graph[1].url, 'https://qualio.cz' + guide.path);
  assert.equal(graph[2]['@type'], 'BreadcrumbList');
  assert.equal(graph[2].itemListElement[1].item, graph[1].url);
  for (const match of body.matchAll(/href="#([^"]+)"/g))
    assert.ok(body.includes(`id="${match[1]}"`));
  assert.ok(html.includes(`href="${guide.path}"`));
  assert.ok(sitemap(production).includes('https://qualio.cz' + guide.path));
  assert.match(renderGuide(preview), /name="robots" content="noindex, follow"/);
  assert.equal(
    await readFile(new URL('..' + guide.path, import.meta.url), 'utf8'),
    await format(renderGuide(settings()), {
      ...(await resolveConfig('index.html')),
      parser: 'html',
    }),
  );
});
test('search crawler and human receive the same public content, with an honest development status', async () => {
  const server = createServer(production);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.match(robots(production), /User-agent: OAI-SearchBot\nAllow: \//);
    for (const route of ['/', '/vyber-systemu-kvality.html']) {
      const human = await fetch(origin + route);
      const bot = await fetch(origin + route, { headers: { 'User-Agent': 'OAI-SearchBot' } });
      assert.equal(human.status, 200);
      assert.equal(bot.status, 200);
      assert.equal(human.headers.get('x-robots-tag'), null);
      assert.equal(bot.headers.get('x-robots-tag'), null);
      const text = await human.text();
      assert.equal(text, await bot.text());
      assert.match(text, /ve vývoji/);
    }
    const previewServer = createServer(preview);
    await new Promise((resolve) => previewServer.listen(0, '127.0.0.1', resolve));
    try {
      const response = await fetch(
        `http://127.0.0.1:${previewServer.address().port}/vyber-systemu-kvality.html`,
      );
      assert.match(response.headers.get('x-robots-tag'), /noindex/);
      assert.match(await response.text(), /name="robots" content="noindex, follow"/);
    } finally {
      await new Promise((resolve) => previewServer.close(resolve));
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
