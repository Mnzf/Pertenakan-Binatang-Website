// dev/check-site.js - checks the pages of a PUBLISHED website: does every page load, does every
// image / script / stylesheet / link on it exist, is any [placeholder] text still showing?
// Plain functions (no page code) so they can be tested.

export const PAGES = [
  'index.html', 'pages/about.html', 'pages/animals.html', 'pages/animal-detail.html', 'pages/inquire.html',
  'pages/contact.html', 'pages/buyer-login.html', 'pages/buyer-register.html', 'pages/buyer-dashboard.html',
  'pages/buyer-messages.html', 'pages/buyer-settings.html', 'pages/staff-login.html', 'pages/staff-dashboard.html',
  'pages/animal-records.html', 'pages/animal-profile.html', 'pages/animal-form.html', 'pages/staff-inquiries.html',
];

// Developer tools that must NOT be on the final website (the checker itself is allowed while you test)
export const DEV_FILES = ['dev/firebase-test.html', 'dev/seed-animals.html', 'dev/check-hooks.html', 'dev/import-animals.html'];

const SKIP = /^(#|mailto:|tel:|javascript:|data:|blob:)/i;

// fetchResponse(url) -> Promise<{ status, text() }>       parseHtml(html) -> Document
export async function checkSite({ baseUrl, fetchResponse, parseHtml, pages = PAGES, devFiles = DEV_FILES, onProgress = () => {} }) {
  const base = new URL(baseUrl);
  const statusCache = new Map();
  const statusOf = (url) => {
    if (!statusCache.has(url)) statusCache.set(url, fetchResponse(url).then((r) => r.status).catch(() => 0));
    return statusCache.get(url);
  };

  const results = [];
  for (const page of pages) {
    onProgress(page);
    const item = { page, problems: [], warnings: [] };
    results.push(item);
    const pageUrl = new URL(page, base).href;

    let response;
    try { response = await fetchResponse(pageUrl); } catch { response = null; }
    if (!response || response.status !== 200) { item.problems.push(`page does not load (${response ? 'HTTP ' + response.status : 'network error'})`); continue; }
    const html = await response.text();
    const doc = parseHtml(html);

    if (!doc.documentElement.getAttribute('lang')) item.warnings.push('<html> has no lang attribute');
    if (!doc.title || /figma|untitled|document/i.test(doc.title)) item.warnings.push(`unhelpful page title: "${doc.title}"`);

    // every local file the page uses
    const refs = new Map();
    for (const element of doc.querySelectorAll('[href],[src]')) {
      const raw = element.getAttribute('href') ?? element.getAttribute('src');
      if (!raw || SKIP.test(raw.trim())) continue;
      let url;
      try { url = new URL(raw.trim(), pageUrl); } catch { item.problems.push(`invalid address: ${raw}`); continue; }
      if (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') item.warnings.push(`not secure (http://): ${raw}`);
      if (url.origin !== base.origin) continue;            // other websites are not checked here
      url.hash = '';
      refs.set(url.href, raw.trim());
    }
    for (const [url, raw] of refs) {
      const status = await statusOf(url);
      if (status !== 200) item.problems.push(`missing file: ${raw} (${status || 'network error'})`);
    }

    // images need alt text
    const noAlt = [...doc.querySelectorAll('img')].filter((img) => !img.hasAttribute('alt')).length;
    if (noAlt) item.warnings.push(`${noAlt} image(s) without alt text`);

    // leftover [placeholder] text in what visitors can read
    const body = doc.body.cloneNode(true);
    body.querySelectorAll('script,style,noscript').forEach((el) => el.remove());
    const placeholders = [...new Set((body.textContent.match(/\[[^\]\n]{3,}\]/g) ?? []).map((t) => t.replace(/\s+/g, ' ')))];
    if (placeholders.length) item.warnings.push(`placeholder text still showing: ${placeholders.slice(0, 6).join(' ')}${placeholders.length > 6 ? ' ...' : ''}`);

    if (/localhost|127\.0\.0\.1/.test(html)) item.warnings.push('mentions localhost / 127.0.0.1');
  }

  const site = { page: 'whole site', problems: [], warnings: [] };
  for (const file of devFiles) {
    if (await statusOf(new URL(file, base).href) === 200) site.warnings.push(`developer file is published: ${file} (delete the dev/ folder before the final submission)`);
  }
  results.push(site);
  return results;
}
