const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const TL = JSON.parse(fs.readFileSync('timeline.json'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(tl => { window.TL = tl; }, TL);
  await p.goto('file://' + process.cwd() + '/promo.html');
  await p.evaluate(() => document.fonts.ready);
  const times = process.argv.slice(2).map(Number);
  for (const t of times) {
    await p.evaluate(t => window.renderAt(t), t);
    await p.screenshot({ path: `prev/t${t}.jpg`, type: 'jpeg', quality: 70 });
  }
  fs.writeFileSync('sfx.json', JSON.stringify(await p.evaluate(() => window.SFX)));
  console.log('errors', errs);
  await b.close();
})();
