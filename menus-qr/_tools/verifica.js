// Verificación de datos (protocolo, paso 7). Uso: node menus-qr/_tools/verifica.js
// 1) Cada QR y tarjeta de mesa abre el menú de SU restaurante.
// 2) Cada enlace de WhatsApp del panel lleva el número, el nombre y el menú de SU restaurante, y ningún otro.
//    El contacto inicial no lleva enlace ni precio; la venta lleva un solo enlace (el suyo) y el precio de la oferta.
// Requiere: npm install (en esta carpeta) para jsqr y pngjs.
const fs = require('fs'), path = require('path');
const jsQR = require('jsqr'), { PNG } = require('pngjs');
const MQ = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'prospectos.json'), 'utf8'));
const base = cfg.base_url, R = cfg.restaurantes, nombres = R.map(r => r.nombre);
const fmt = n => '$' + Number(n).toLocaleString('en-US');
let errores = 0; const mal = m => { errores++; console.log('✗', m); };

// 1) Códigos QR
let n = 0;
for (const r of R) for (const f of ['qr.png', 'tarjeta-mesa.png']) {
  const p = path.join(MQ, r.slug, f);
  if (!fs.existsSync(p)) { mal(`${r.slug}: falta ${f}`); continue; }
  const png = PNG.sync.read(fs.readFileSync(p)); n++;
  const q = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!q || q.data !== base + r.slug + '/') mal(`${r.slug}/${f} abre ${q ? q.data : '(no se lee)'}`);
}
console.log(`QR revisados: ${n}`);

// 2) Mensajes del panel
const panel = fs.readFileSync(path.join(MQ, 'index.html'), 'utf8');
const unesc = s => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
let m = 0;
for (const [, slug, body] of panel.matchAll(/<article class="card" data-slug="([^"]+)"([\s\S]*?)<\/article>/g)) {
  const r = R.find(x => x.slug === slug); if (!r) { mal(`tarjeta sin prospecto: ${slug}`); continue; }
  const wa = r.whatsapp || r.tel;
  for (const [, href] of body.matchAll(/href="(https:\/\/wa\.me\/[^"]+)"/g)) {
    const u = unesc(href), num = u.split('?')[0].split('/').pop(), txt = decodeURIComponent(u.split('text=')[1] || ''); m++;
    const otros = nombres.filter(x => x !== r.nombre && !r.nombre.includes(x) && txt.includes(x));
    if (num !== '52' + wa) mal(`${slug}: número ${num}, debía ser 52${wa}`);
    if (!txt.includes(r.nombre)) mal(`${slug}: el mensaje no menciona a ${r.nombre}`);
    if (otros.length) mal(`${slug}: menciona otro restaurante (${otros.join(', ')})`);
    if (!txt.includes('http')) { if (txt.includes('$')) mal(`${slug}: el contacto inicial trae precio`); }
    else {
      if ((txt.match(/https?:\/\//g) || []).length !== 1 || !txt.includes(base + slug + '/')) mal(`${slug}: la venta no lleva solo su enlace`);
      if (!txt.includes(fmt(cfg.oferta.instalacion)) || !txt.includes(fmt(cfg.oferta.mensualidad))) mal(`${slug}: la venta no trae el precio de la oferta`);
    }
  }
}
console.log(`Mensajes revisados: ${m}`);
console.log(errores ? `\n${errores} errores` : '\nTodo correcto');
process.exit(errores ? 1 : 0);
