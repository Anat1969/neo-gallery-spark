// E2E v2 against `vite preview`: every Supabase call mocked, open editing (no sign-in).
import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = process.argv[2] || 'http://localhost:4173';
const OUT = process.argv[3] || '.';
const SUPA = 'https://ktqmwpbzcnzkhjskqisy.supabase.co';
const now = new Date().toISOString();
const svg = (c, w = 400, h = 300) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${c}"/></svg>`);
// Real-looking storage URLs so thumbUrl rewrites them; the route below serves an SVG for any of them
const img = (n) => `${SUPA}/storage/v1/object/public/neo-gallery-images/artworks/${n}.png`;

const categories = [{ id: 'c1', name: 'אדריכלות', sort_order: 0, created_at: now, project_name: 'פרויקט א', app_name: '' }, { id: 'c2', name: 'אומנות', sort_order: 1, created_at: now, project_name: '', app_name: '' }];
const galleries = [
  { id: 'g1', name: 'יפן', slug: 'יפן', description: 'מסע', category: 'אדריכלות', cover_image: img('cover1'), created_by: null, sort_order: 0, created_at: now, updated_at: now, project_name: '', app_name: '', artworks: [{ count: 4 }] },
  { id: 'g2', name: 'אותיות', slug: 'אותיות', description: '', category: 'אומנות', cover_image: img('cover2'), created_by: null, sort_order: 1, created_at: now, updated_at: now, project_name: '', app_name: '', artworks: [{ count: 1 }] },
];
const rooms = [{ id: 'r1', gallery_id: 'g1', name: 'קיוטו', slug: 'קיוטו', description: '', project_name: '', app_name: '', sort_order: 0, created_at: now, updated_at: now, cover_image: img('room') }];
const base = { topic: 'עץ', post: 'טקסט', tags: ['עץ'], style: '', concept: '', year: 2026, inspiration_url: '', inspiration_label: '', created_at: now, updated_at: now, mime: '', file_size: 1, room_id: null, gallery_id: 'g1' };
const artworks = [
  { ...base, id: 'a1', title: 'מקדש', image_url: img('a1'), media_url: img('a1'), media_type: 'image', width: 400, height: 600, sort_order: 0 },
  { ...base, id: 'a2', title: 'סרט גשר', image_url: img('a2'), media_url: `${SUPA}/storage/v1/object/public/neo-gallery-images/artworks/v.mp4`, media_type: 'video', width: 1280, height: 720, sort_order: 1 },
  { ...base, id: 'a3', title: 'פלייר', image_url: '', media_url: `${SUPA}/storage/v1/object/public/neo-gallery-images/artworks/f.pdf`, media_type: 'pdf', width: null, height: null, sort_order: 2 },
  { ...base, id: 'a4', title: 'מודל', image_url: '', media_url: `${SUPA}/storage/v1/object/public/neo-gallery-images/artworks/m.glb`, media_type: 'model', width: null, height: null, sort_order: 3 },
  { ...base, id: 'a5', title: 'בחדר', image_url: img('a5'), media_url: img('a5'), media_type: 'image', width: 500, height: 500, sort_order: 0, room_id: 'r1' },
].map((a) => ({ ...a, gallery: { id: 'g1', name: 'יפן', slug: 'יפן', category: 'אדריכלות', project_name: '', app_name: '' } }));
let favorites = [{ id: 'f1', user_id: '0', artwork_id: 'a1', created_at: now }];
const tables = { neo_categories: categories, neo_galleries: galleries, neo_rooms: rooms, neo_artworks: artworks };

const writes = [];
const errors = [];

function filterRows(rows, url) {
  let out = rows;
  for (const [k, v] of url.searchParams) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    let m = /^eq\.(.*)$/.exec(v);
    if (m) out = out.filter((r) => String(r[k]) === m[1]);
    m = /^is\.null$/.exec(v);
    if (m) out = out.filter((r) => r[k] == null);
  }
  return out;
}

async function run(viewport, label, theme) {
  favorites = [{ id: 'f1', user_id: '0', artwork_id: 'a1', created_at: now }];
  const dir = fs.mkdtempSync(`${OUT}/prof-`);
  const ctx = await chromium.launchPersistentContext(dir, { executablePath: '/opt/pw-browsers/chromium', headless: true, viewport, locale: 'he-IL', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  page.on('pageerror', (e) => errors.push(`${label} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts.g|net::ERR/.test(m.text())) errors.push(`${label} console: ${m.text()}`); });
  if (theme) await page.addInitScript((t) => localStorage.setItem('neo-theme', t), theme);

  await ctx.route('**/*.supabase.co/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    if (p.startsWith('/storage/v1/render/') || (p.startsWith('/storage/v1/object/public/') && req.method() === 'GET')) {
      if (/\.(mp4|pdf|glb)$/.test(p)) return route.fulfill({ status: 404, body: '' });
      const n = p.split('/').pop();
      const colors = ['#6b625a', '#3f4a52', '#8a7a66', '#4b4038', '#5c6b5e', '#7a6e8a'];
      const c = colors[[...n].reduce((a, ch) => a + ch.charCodeAt(0), 0) % colors.length];
      const [w, h] = n.startsWith('a1') ? [400, 600] : [600, 400];
      return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: decodeURIComponent(svg(c, w, h).split(',')[1]) });
    }
    if (p.startsWith('/storage/v1/object/')) { writes.push(['storage', req.method(), p]); return route.fulfill({ json: { Key: 'x' } }); }
    if (p.startsWith('/auth/v1/')) return route.fulfill({ json: {} });
    const t = p.replace('/rest/v1/', '');
    if (p.startsWith('/rest/v1/')) {
      if (!t.startsWith('neo_')) errors.push(`${label} request to non-neo table: ${t}`);
      if (t === 'neo_favorites') {
        if (req.method() === 'POST') { const b = JSON.parse(req.postData()); favorites.push({ id: 'f' + Math.random(), user_id: '0', created_at: now, ...b }); writes.push(['fav+', b.artwork_id]); return route.fulfill({ json: [] }); }
        if (req.method() === 'DELETE') { const id = url.searchParams.get('id').slice(3); favorites = favorites.filter((f) => f.id !== id); writes.push(['fav-', id]); return route.fulfill({ json: [] }); }
        const sel = url.searchParams.get('select') || '';
        const rows = sel.includes('artwork:') ? favorites.map((f) => ({ ...f, artwork: artworks.find((a) => a.id === f.artwork_id) })) : favorites;
        return route.fulfill({ json: rows });
      }
      if (req.method() !== 'GET' && req.method() !== 'HEAD') {
        writes.push([req.method(), t, url.search, req.postData()]);
        return route.fulfill({ json: req.method() === 'DELETE' ? [] : [{ id: 'new', ...(JSON.parse(req.postData() || '{}')) }] });
      }
      const rows = filterRows(tables[t] ?? [], url);
      const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
      return route.fulfill({ json: single ? rows[0] ?? null : rows, headers: { 'content-range': `0-${rows.length}/${rows.length}` } });
    }
    return route.fulfill({ json: {} });
  });

  const narrow = viewport.width < 768;
  const shot = (name) => page.screenshot({ path: `${OUT}/${label}-${name}.png` });
  const checkPage = async (path) => {
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (sw > 1) errors.push(`${label} horizontal scroll ${sw}px on ${path}`);
    if (!(await page.locator('header.app-header').isVisible())) errors.push(`${label} header missing on ${path}`);
    if (!(await page.getByRole('toolbar', { name: 'פס עריכה' }).isVisible())) errors.push(`${label} edit dock missing on ${path}`);
  };
  const visit = async (path, name) => {
    await page.goto(BASE + encodeURI(path), { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await checkPage(path);
    await shot(name);
  };

  await visit('/', 'home');
  if (!(await page.getByRole('region', { name: 'עבודות אחרונות' }).isVisible())) errors.push(`${label} latest strip missing`);
  await visit('/gallery/יפן', 'gallery');
  for (const t of ['מקדש', 'סרט גשר', 'פלייר', 'מודל']) if (!(await page.getByRole('link', { name: t }).count())) errors.push(`${label} wall missing ${t}`);
  await visit('/gallery/יפן/room/קיוטו', 'room');
  await visit('/artwork/a1', 'artwork');
  await visit('/artwork/a2', 'artwork-video');
  if (!(await page.locator('video[controls]').count())) errors.push(`${label} video viewer missing`);
  await visit('/artwork/a3', 'artwork-pdf');
  if (!(await page.locator('object[type="application/pdf"]').count())) errors.push(`${label} pdf viewer missing`);
  await visit('/favorites', 'favorites');
  await visit('/search', 'search');
  await visit('/admin', 'admin');
  await visit('/login', 'login-redirect');
  if (new URL(page.url()).pathname !== '/') errors.push(`${label} /login did not redirect home`);

  // Favorites toggle on the wall (desktop hover reveals the button)
  await page.goto(BASE + encodeURI('/gallery/יפן'), { waitUntil: 'networkidle' });
  const favBtn = page.getByRole('button', { name: 'הוספה לנבחרות' }).first();
  await favBtn.click({ force: true });
  await page.waitForTimeout(400);
  if (!writes.some((w) => w[0] === 'fav+')) errors.push(`${label} favorite not added`);

  // Screening mode
  await page.getByRole('button', { name: 'הקרנה' }).click();
  await page.getByRole('dialog', { name: /הקרנה/ }).waitFor();
  await page.waitForTimeout(1500);
  await shot('screening');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  if (await page.getByRole('dialog', { name: /הקרנה/ }).count()) errors.push(`${label} screening did not close`);

  // Edit dock: toggle, actions appear, per-work menu, upload via file input
  await page.getByRole('button', { name: 'עריכה', exact: true }).click();
  await page.getByRole('button', { name: 'העלאת קבצים' }).waitFor();
  await page.getByRole('button', { name: 'חדר חדש' }).waitFor();
  await shot('edit');
  await page.getByRole('button', { name: 'פעולות על מקדש' }).click();
  await page.getByRole('menuitem', { name: 'עריכת פרטים' }).waitFor();
  await page.keyboard.press('Escape');
  const input = page.locator('input[type=file][multiple]').first();
  await input.setInputFiles({ name: 'test-shot.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex') });
  await page.waitForTimeout(2500);
  if (!writes.some((w) => w[0] === 'storage' && w[1] === 'POST')) errors.push(`${label} upload did not hit storage`);
  if (!writes.some((w) => w[0] === 'POST' && w[1] === 'neo_artworks' && w[3].includes('test shot'))) errors.push(`${label} upload did not create artwork`);
  await page.getByRole('button', { name: 'סיום עריכה' }).click();

  // Header: theme toggle, quick search, copy link, nav
  if (narrow) await page.getByRole('button', { name: 'תפריט' }).click();
  await page.getByRole('button', { name: 'החלפת רקע' }).first().click();
  await page.waitForTimeout(700);
  const isLight = await page.evaluate(() => document.documentElement.classList.contains('light'));
  if (isLight === (theme === 'light')) errors.push(`${label} theme did not toggle`);
  await page.getByRole('button', { name: 'העתקת קישור' }).first().click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  if (!decodeURI(clip).includes('/gallery/יפן')) errors.push(`${label} copy link wrong: ${clip}`);
  if (narrow) await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.keyboard.press('Control+k');
  await page.getByPlaceholder('שם של גלריה או יצירה...').fill('אותיות');
  await page.waitForTimeout(400);
  await shot('quicksearch');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  if (!decodeURI(page.url()).includes('/gallery/אותיות')) errors.push(`${label} quick search did not navigate: ${decodeURI(page.url())}`);
  await page.getByRole('link', { name: /ART-AI גלריה/ }).click();
  await page.waitForURL(BASE + '/');

  // Installability + service worker
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(page);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  if (inst.installabilityErrors.length) errors.push(`${label} installability: ${JSON.stringify(inst.installabilityErrors)}`);

  // Speed: thumbnails come from the resize endpoint, never full originals on the wall
  const imgs = await page.evaluate(() => [...document.images].map((i) => i.currentSrc || i.src));
  const originals = imgs.filter((s) => s.includes('/object/public/') && !s.startsWith('data:'));
  if (originals.length) errors.push(`${label} home loads full-size originals: ${originals.length}`);

  await ctx.close();
}

await run({ width: 1366, height: 860 }, 'desktop-dark', 'dark');
await run({ width: 1366, height: 860 }, 'desktop-light', 'light');
await run({ width: 390, height: 844 }, 'mobile-dark', 'dark');
await run({ width: 390, height: 844 }, 'mobile-light', 'light');

fs.writeFileSync(`${OUT}/writes.json`, JSON.stringify(writes, null, 1));
console.log('writes:', writes.length);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ALL GREEN');
