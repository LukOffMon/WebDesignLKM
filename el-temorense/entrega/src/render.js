// Kit de entrega de El Temorense. Uso (desde la raíz del repo):
//   python3 el-temorense/entrega/src/qr.py    # QR (si cambia la URL)
//   node el-temorense/entrega/src/render.js   # capturas, propuesta.pdf, tarjeta-mesa.pdf/.png
const path = require('path'), fs = require('fs');
const { chromium, devices } = require('playwright');
const SRC = __dirname, OUT = path.resolve(SRC, '..'), SITE = path.resolve(SRC, '../../index.html');
const file = f => 'file://' + f;

(async () => {
  const b = await chromium.launch();
  fs.mkdirSync(path.join(SRC, 'shots'), { recursive: true });
  // Capturas del sitio en celular
  const m = await b.newPage({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
  await m.goto(file(SITE)); await m.evaluate(() => document.fonts.ready); await m.waitForTimeout(700);
  await m.screenshot({ path: path.join(SRC, 'shots/m-hero.png') });
  await m.evaluate(() => document.querySelector('#c-birria').scrollIntoView()); await m.waitForTimeout(500);
  await m.screenshot({ path: path.join(SRC, 'shots/m-menu.png') });
  await m.click('#c-birria .vars button >> nth=1');
  await m.click('#c-gorditas .add >> nth=0');
  await m.click('#c-bebidas .vars button >> nth=1');
  await m.click('#fab'); await m.waitForTimeout(500);
  await m.screenshot({ path: path.join(SRC, 'shots/m-cart.png') });

  const p = await b.newPage();
  for (const [name, out] of [['propuesta', 'propuesta.pdf'], ['tarjeta', 'tarjeta-mesa.pdf']]) {
    await p.goto(file(path.join(SRC, name + '.html')), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: path.join(OUT, out), preferCSSPageSize: true, printBackground: true });
    console.log('ok', out);
  }
  // Tarjeta a 300 dpi (4 x 6 in = 1200 x 1800 px)
  const hi = await b.newPage({ viewport: { width: 384, height: 576 }, deviceScaleFactor: 3.125 });
  await hi.goto(file(path.join(SRC, 'tarjeta.html')), { waitUntil: 'networkidle' });
  await hi.evaluate(() => document.fonts.ready);
  await hi.locator('.card').screenshot({ path: path.join(OUT, 'tarjeta-mesa.png') });
  fs.copyFileSync(path.join(OUT, 'tarjeta-mesa.png'), path.resolve(SRC, '../../tarjeta-mesa.png'));
  console.log('ok tarjeta-mesa.png (y copia en el-temorense/)');
  await b.close();
})();
