// Toma capturas 1200x630 (vista previa para WhatsApp/Facebook) de las páginas HTML que genera build.py.
// Uso: node og.js trabajos.json   →   [{ "html": "/ruta/og.html", "out": "/ruta/og.jpg" }, ...]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const j of jobs) {
    await p.goto('file://' + j.html, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: j.out, type: 'jpeg', quality: 82 });
  }
  await b.close();
})();
