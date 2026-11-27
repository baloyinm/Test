// End-to-end walk of every page at 390 and 1280 px against a running server.
//   node tests/e2e/walk.mjs http://localhost:4391
// Server must run with INTAKE_DRY_RUN=1 so no form saves or sends anything live.
// Needs playwright-core and (optionally) axe-core; set UX_CHROME_PATH for an installed Chromium.
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

const base = (process.argv[2] || 'http://localhost:4391').replace(/\/$/, '');
const PAGES = ['/', '/philosophy', '/language-of-luxury', '/advisory', '/experiences', '/contact', '/privacy', '/terms', '/refund-policy'];
const WIDTHS = [390, 1280];
const require = createRequire(import.meta.url);
let axeSource = null;
try { axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); } catch {}

let pass = 0; const fails = [];
const check = (ok, label) => { if (ok) pass++; else { fails.push(label); console.log('FAIL', label); } };

const chrome = process.env.UX_CHROME_PATH || ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'].find(existsSync);
const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
const linkStatus = new Map();
const external = /^(https?:)?\/\/(?!localhost)|^mailto:/;

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, reducedMotion: 'reduce' });
  for (const path of PAGES.concat(['/no-such-page'])) {
    const tag = `${path} @${width}`;
    const page = await ctx.newPage();
    const errors = [], badReq = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_TUNNEL|ERR_PROXY|status of 404/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
    page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400 && !path.includes('no-such')) badReq.push(`${r.status()} ${r.url()}`); });
    const resp = await page.goto(base + path, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    const missing = path === '/no-such-page';
    check(resp.status() === (missing ? 404 : 200), `${tag} status ${resp.status()}`);
    check(await page.locator('html[lang]').count() === 1, `${tag} html lang`);
    check((await page.title()).includes('Infinae'), `${tag} title has Infinae`);
    check(await page.locator('h1').count() === 1, `${tag} exactly one h1`);
    check(await page.locator('main').count() === 1, `${tag} one main`);
    check(await page.locator('nav a').count() > 0 || missing, `${tag} nav present`);
    check(await page.locator('footer a[href="/privacy"]').count() > 0 || missing, `${tag} footer legal links`);
    const imgs = await page.$$eval('img', (els) => els.map((i) => ({ src: i.currentSrc, ok: i.complete && i.naturalWidth > 0, alt: i.getAttribute('alt') })));
    for (const i of imgs) { check(i.ok, `${tag} image loads ${i.src}`); check(i.alt !== null, `${tag} image has alt ${i.src}`); }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check(!overflow, `${tag} no sideways scroll`);
    // mobile menu opens
    if (width < 600 && !missing && await page.locator('#navToggle').count()) {
      await page.click('#navToggle');
      check(await page.locator('#navToggle').getAttribute('aria-expanded') === 'true', `${tag} menu toggle opens`);
    }
    // links
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    for (const h of new Set(hrefs)) {
      if (external.test(h)) continue;
      const u = new URL(h, base + path); const key = u.pathname;
      if (!linkStatus.has(key)) linkStatus.set(key, (await ctx.request.get(base + key)).status());
      check(linkStatus.get(key) === 200, `${tag} link ${h} -> ${linkStatus.get(key)}`);
    }
    if (axeSource) {
      await page.evaluate(axeSource);
      const res = await page.evaluate(() => axe.run({ runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }));
      for (const v of res.violations) check(false, `${tag} axe ${v.id} (${v.nodes.length}): ${v.help} e.g. ${v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' ' + (n.any[0]?.message || '').slice(0, 120)).join(' ; ')}`);
      check(res.violations.length === 0, `${tag} axe clean`);
    }
    check(errors.length === 0, `${tag} no console errors: ${errors.join(' | ').slice(0, 200)}`);
    check(badReq.length === 0, `${tag} no failed same-origin requests: ${badReq.join(' | ')}`);

    if (path === '/contact') {
      const labels = await page.$$eval('#contact-form input:not([type=hidden]):not([name=company_website]), #contact-form select, #contact-form textarea', (els) => els.map((e) => !!document.querySelector(`label[for="${e.id}"]`) || !!e.closest('label')));
      check(labels.length > 0 && labels.every(Boolean), `${tag} every field has a label`);
      // client-side required validation blocks an empty submit
      let posted = 0; page.on('request', (r) => { if (r.url().endsWith('/api/intake')) posted++; });
      await page.click('button[type=submit]');
      check(posted === 0, `${tag} empty submit is blocked in the browser`);
      await page.fill('#name', 'Test Person'); await page.fill('#email', 'test@example.com'); await page.fill('#phone', '+27 11 000 0000');
      await page.selectOption('#interest', 'Advisory'); await page.check('input[name=consent]');
      await page.click('button[type=submit]');
      await page.waitForSelector('#form-status:has-text("Thank you")', { timeout: 8000 }).then(() => check(true, ''), () => check(false, `${tag} success message shown`));
      check(posted === 1, `${tag} exactly one post made`);
    }
    await page.close();
  }
  await ctx.close();
}

// API behaviour (dry run: nothing saved)
const api = async (fields, ip) => { const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.append(k, v); const r = await fetch(base + '/api/intake', { method: 'POST', body: fd, headers: { 'x-forwarded-for': ip } }); return { status: r.status, body: await r.json() }; };
const ok = { name: 'Test Person', email: 'test@example.com', phone: '+27 11 000 0000', consent: 'yes', interest: 'Advisory' };
let r = await api(ok, '10.0.0.1'); check(r.status === 200 && r.body.dryRun === true, 'api valid post -> 200 dry run (nothing saved)');
r = await api({ ...ok, email: 'bad' }, '10.0.0.2'); check(r.status === 400 && !!r.body.errors.email, 'api bad email -> 400 with field error');
r = await api({ ...ok, company_website: 'spam.example' }, '10.0.0.3'); check(r.status === 200 && !r.body.dryRun, 'api honeypot -> quiet success, not processed');
let last; for (let i = 0; i < 6; i++) last = await api(ok, '10.0.0.9'); check(last.status === 429, 'api 6th post in a minute from one address -> 429');

await browser.close();
console.log(`E2E: ${pass} checks passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
