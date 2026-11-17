// Genera los archivos de entrega a partir de las plantillas HTML.
// Uso (desde la raíz del repo):
//   python3 crunchy-corner/entrega/src/qr.py      # QR (si cambia la URL)
//   node crunchy-corner/entrega/src/shots.js      # capturas (si cambia el menú)
//   node crunchy-corner/entrega/src/render.js     # PDFs y tarjeta PNG
const path = require('path');
const { chromium } = require('playwright');
const SRC = __dirname;
const OUT = path.resolve(SRC, '..');
const url = f => 'file://' + path.join(SRC, f);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const open = async f => {
    await p.goto(url(f), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const fonts = await p.evaluate(() => document.fonts.check('20px Anton'));
    if (!fonts) throw new Error(`${f}: no cargó la fuente Anton`);
  };
  for (const name of ['propuesta', 'imprimibles']) {
    await open(name + '.html');
    await p.pdf({ path: path.join(OUT, name + '.pdf'), preferCSSPageSize: true, printBackground: true });
    console.log('ok', name + '.pdf');
  }
  // Tarjeta de mesa sola, a 300 dpi (4 x 6 in = 1200 x 1800 px).
  const hi = await b.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 3.125 });
  await hi.goto(url('imprimibles.html'), { waitUntil: 'networkidle' });
  await hi.evaluate(() => document.fonts.ready);
  await hi.locator('.card').first().screenshot({ path: path.join(OUT, 'tarjeta-mesa.png') });
  console.log('ok tarjeta-mesa.png');
  await b.close();
})();
