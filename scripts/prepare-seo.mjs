import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { guide } from '../content.mjs';
import { renderGuide } from '../guide.mjs';
import { settings, renderSeo, robots, sitemap } from '../seo.mjs';

// SEO konfigurace se sdílí mezi statickými soubory a Node serverem.
const config = settings();
const formatting = (await resolveConfig('index.html')) ?? {};

// 1. Hlavní stránka: přepíšeme pouze označený blok metadat.
const homepage = await readFile('index.html', 'utf8');
await writeFile(
  'index.html',
  await format(renderSeo(homepage, config), { ...formatting, parser: 'html' }),
);

// 2. Průvodce: text pochází ze šablony v guide.mjs.
await writeFile(
  guide.path.slice(1),
  await format(renderGuide(config), { ...formatting, parser: 'html' }),
);

// 3. Soubory pro procházení a indexaci webu.
await writeFile('robots.txt', robots(config));
await writeFile('sitemap.xml', sitemap(config));

console.log(
  config.canIndex
    ? `SEO připraveno pro ${config.siteUrl}`
    : 'SEO připraveno pro náhled (noindex). Doplňte siteUrl v seo.config.json pro produkční indexaci.',
);
