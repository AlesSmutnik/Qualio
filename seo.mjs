import { guide } from './content.mjs';
import config from './seo.config.json' with { type: 'json' };
// 01 — Načtení a kontrola konfigurace domény
export function settings(overrides = {}) {
  const result = { ...config, ...overrides };
  if (result.siteUrl) {
    const url = new URL(result.siteUrl);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      /^(localhost|127\.|\[::1\]|.*\.example$)/.test(url.hostname)
    ) {
      throw new Error('siteUrl musí být veřejná HTTPS doména bez cesty, parametrů a fragmentu.');
    }
    result.siteUrl = url.origin + '/';
  }
  result.canIndex = Boolean(result.siteUrl && result.indexable);
  return result;
}
// 02 — Bezpečné vložení textu do HTML
export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
// 03 — Metatagy, sociální sítě a strukturovaná data
export function metadata(c = settings()) {
  const url = c.siteUrl;
  const pageUrl = url ? new URL(c.path || '/', url).href : null;
  const graph = [
    {
      '@type': 'WebSite',
      '@id': url ? url + '#website' : '#website',
      name: c.name,
      inLanguage: c.language,
      ...(url ? { url } : {}),
    },
    {
      '@type': 'WebPage',
      '@id': pageUrl ? pageUrl + '#webpage' : '#webpage',
      name: c.title,
      description: c.description,
      inLanguage: c.language,
      isPartOf: { '@id': url ? url + '#website' : '#website' },
      ...(pageUrl ? { url: pageUrl } : {}),
      about: {
        '@type': 'Thing',
        name: c.topic || 'Systém řízení kvality výroby (QMS)',
        description:
          c.topicDescription ||
          'QUALIO je projekt SaaS ve vývoji. Plánované oblasti: záznam kontrol na pracovišti, evidence neshod a směnový reporting.',
      },
    },
  ];
  if (c.path && url)
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: c.name, item: url },
        { '@type': 'ListItem', position: 2, name: c.heading, item: pageUrl },
      ],
    });
  return `<meta name="description" content="${escapeHtml(c.description)}">
<title>${escapeHtml(c.title)}</title>
<meta name="robots" content="${c.canIndex ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' : 'noindex, follow'}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${escapeHtml(c.locale)}">
<meta property="og:site_name" content="${escapeHtml(c.name)}">
<meta property="og:title" content="${escapeHtml(c.title)}">
<meta property="og:description" content="${escapeHtml(c.description)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(c.title)}">
<meta name="twitter:description" content="${escapeHtml(c.description)}">
${
  url
    ? `<link rel="canonical" href="${escapeHtml(pageUrl)}">\n<meta property="og:url" content="${escapeHtml(pageUrl)}">
<meta property="og:image" content="${escapeHtml(url)}assets/inspection.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1254">
<meta property="og:image:height" content="1254">
<meta property="og:image:alt" content="Vizualizace měření kovové příruby — QUALIO, kontrola kvality výroby">
<meta name="twitter:image" content="${escapeHtml(url)}assets/inspection.jpg">
<meta name="twitter:image:alt" content="Vizualizace měření kovové příruby při kontrole kvality">`
    : ''
}
${c.googleSiteVerification ? `<meta name="google-site-verification" content="${escapeHtml(c.googleSiteVerification)}">` : ''}
${c.bingSiteVerification ? `<meta name="msvalidate.01" content="${escapeHtml(c.bingSiteVerification)}">` : ''}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}
// 04 — Obnovení označeného SEO bloku hlavní stránky
export function renderSeo(html, config = settings()) {
  return html.replace(
    /<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/,
    `<!-- SEO:START -->\n${metadata(config)}\n<!-- SEO:END -->`,
  );
}
// 05 — Pravidla pro roboty a seznam indexovatelných stránek
export function robots(config = settings()) {
  // Allow crawling so crawlers can read the preview's noindex directive.
  return `User-agent: *\nAllow: /\n\n# ChatGPT search discovery\nUser-agent: OAI-SearchBot\nAllow: /\n\n${config.canIndex ? `Sitemap: ${config.siteUrl}sitemap.xml\n` : ''}`;
}
export function sitemap(config = settings()) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${config.canIndex ? ['/', guide.path].map((page) => `\n  <url><loc>${escapeHtml(new URL(page, config.siteUrl).href)}</loc></url>`).join('') + '\n' : ''}</urlset>\n`;
}
