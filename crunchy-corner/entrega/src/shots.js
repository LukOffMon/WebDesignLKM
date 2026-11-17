// Toma capturas del menú (pantalla de iPhone) para la propuesta.
// Uso: node crunchy-corner/entrega/src/shots.js
const path = require('path');
const { chromium, devices } = require('playwright');
const OUT = path.join(__dirname, 'shots');
const URL = 'file://' + path.resolve(__dirname, '../../index.html');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  const shot = async (name) => p.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 82 });
  const goTo = async (sel, dy = 0) => {
    await p.evaluate(([s, d]) => { const el = document.querySelector(s); scrollTo(0, el.getBoundingClientRect().top + scrollY + d); }, [sel, dy]);
    await p.waitForTimeout(1600);
  };

  await p.waitForTimeout(2400);
  await shot('hero');

  await goTo('#promo', -70);
  await shot('promo');

  await goTo('#sgrid', -150);
  await shot('salsas');

  await goTo('.roulette', -120);
  await p.click('#spin');
  await p.waitForTimeout(4200);
  await shot('ruleta');

  await goTo('#boneless', -40);
  await shot('boneless');

  const card = p.locator('#boneless .card').first();
  await card.locator('.sizes button').nth(1).click();
  await card.locator('.add').click();
  await p.waitForTimeout(700);
  await p.locator('#addBody [data-as="buffalo-cream"]').click();
  await p.locator('#addBody [data-aex="0"]').click();
  await p.waitForTimeout(500);
  await shot('agregar');
  await p.click('#aGo');
  await p.waitForTimeout(800);

  await goTo('#burgers', -40);
  await p.locator('#burgers .card').first().locator('.add').click();
  await p.waitForTimeout(600);
  await p.click('#aGo');
  await p.waitForTimeout(2200);
  await p.click('#cartBtn');
  await p.waitForTimeout(800);
  await p.fill('#who', 'Mesa 4');
  await shot('orden');

  await b.close();
})();
