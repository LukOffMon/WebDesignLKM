const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + __dirname + '/built.html');
  const r = await p.evaluate(() => ({ sfx: window.SFX, riser: window.RISER_AT }));
  require('fs').writeFileSync(__dirname + '/sfx.json', JSON.stringify(r));
  console.log(r.sfx.length, 'sfx, riser at', r.riser.toFixed(2)); await b.close();
})();
