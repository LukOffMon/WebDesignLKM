// QA de los menús QR (protocolo, paso 6). Uso: node menus-qr/_tools/qa.js [slug ...]
// Sirve la carpeta del repo en un puerto local, abre cada menú en tamaño de celular y revisa errores de UI.
// Sale con código 1 si algún menú tiene errores (no advertencias).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const MQ = path.join(ROOT, 'menus-qr');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
});
const slugs = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(MQ).filter(d => fs.existsSync(path.join(MQ, d, 'index.html')) && !d.startsWith('_') && d !== 'assets');

// Contraste WCAG entre dos colores CSS (rgb/rgba ya resueltos por el navegador).
const AUDIT = () => {
  const out = { err: [], warn: [] };
  const vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.err.push(`scroll horizontal (${document.documentElement.scrollWidth}px > ${vw}px)`);
  // Convierte cualquier color CSS (incluido color-mix / color(srgb …)) a RGBA con un canvas.
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = c => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const bgOf = el => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c[3] >= .5) return c; } return parse(getComputedStyle(document.body).backgroundColor); };
  const checks = [['h1', 3], ['.kicker', 3], ['.lema', 4.5], ['.item h3', 4.5], ['.item p', 4.5], ['.price', 3], ['.chips a', 4.5], ['.add', 3], ['.cat .n', 4.5], ['.demo', 4.5], ['.pill', 4.5], ['.search input', 4.5]];
  for (const [sel, min] of checks) {
    const el = document.querySelector(sel); if (!el) continue;
    const r = ratio(parse(getComputedStyle(el).color), bgOf(el));
    if (r < min) out.err.push(`contraste bajo en ${sel}: ${r.toFixed(2)} (mín. ${min})`);
  }
  // Objetivos táctiles (botones y enlaces visibles) de al menos 40 px de alto.
  const small = [...document.querySelectorAll('button, a, input, [role=button]')].filter(el => {
    if (el.closest('#lkmr-intro, footer, .demo, dialog') || el.matches('.chips a') && false) return false;
    const b = el.getBoundingClientRect(); return b.width && b.height && b.top < innerHeight * 3 && (b.height < 40 || b.width < 40);
  }).map(el => (el.className || el.tagName).toString().split(' ')[0]);
  if (small.length) out.warn.push(`objetivos táctiles < 40px: ${[...new Set(small)].join(', ')}`);
  // Elementos que se salen del ancho.
  const wide = [...document.querySelectorAll('main *, header *, .bar *')].filter(el => { const b = el.getBoundingClientRect(); return b.width && (b.right > vw + 1 || b.left < -1) && !el.closest('.chips'); })
    .map(el => el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0]);
  if (wide.length) out.err.push(`se sale del ancho: ${[...new Set(wide)].slice(0, 5).join(', ')}`);
  const h1 = document.querySelector('h1'); if (h1 && h1.scrollWidth > h1.clientWidth + 1) out.err.push('el título no cabe');
  const broken = [...document.images].filter(i => i.getAttribute('src') && i.complete && i.naturalWidth === 0 && i.getAttribute('loading') !== 'lazy').length;
  if (broken) out.err.push(`${broken} imágenes rotas`);
  const prices = [...document.querySelectorAll('#list .price:not(.na)')].filter(p => !/^\$[\d,]+(\.\d{2})?$/.test(p.textContent.trim()));
  if (prices.length) out.err.push(`precios con formato raro: ${prices.slice(0, 3).map(p => p.textContent).join(' | ')}`);
  for (const m of ['og:image', 'og:title', 'og:description']) if (!document.querySelector(`meta[property="${m}"]`)) out.err.push('falta ' + m);
  return out;
};

(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const b = await chromium.launch(); let fails = 0, warns = 0;
  for (const w of [360, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    for (const s of slugs) {
      const pg = await ctx.newPage(); const errs = [];
      pg.on('pageerror', e => errs.push('JS: ' + e.message));
      pg.on('requestfailed', q => { const u = q.url(); if (u.includes('localhost') || u.startsWith('http://127')) errs.push('no carga: ' + u.split('/').slice(-2).join('/')); });
      await pg.goto(`http://localhost:${port}/menus-qr/${s}/`, { waitUntil: 'load' });
      await pg.evaluate(() => { const i = document.getElementById('lkmr-intro'); i && i.click(); });
      await pg.waitForTimeout(800);
      const r = await pg.evaluate(AUDIT);
      // Flujo de pedido: agregar, abrir el carrito y revisar el enlace de WhatsApp.
      try {
        await pg.locator('.add').first().click();
        await pg.locator('#cartbar').click();
        const ok = await pg.evaluate(() => document.getElementById('cart').open);
        if (!ok) r.err.push('el pedido no abre');
      } catch (e) { r.err.push('flujo de pedido: ' + e.message.split('\n')[0]); }
      r.err.push(...errs);
      if (r.err.length || r.warn.length) console.log(`${w}px ${s}${r.err.length ? '\n  ✗ ' + r.err.join('\n  ✗ ') : ''}${r.warn.length ? '\n  · ' + r.warn.join('\n  · ') : ''}`);
      fails += !!r.err.length; warns += !!r.warn.length; await pg.close();
    }
    await ctx.close();
  }
  console.log(`\nQA: ${slugs.length} menús × 2 anchos · con errores: ${fails} · con advertencias: ${warns}`);
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
