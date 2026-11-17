// Menú digital · plantilla compartida LKM'r. Lee window.MENU (datos) que cada página define antes de cargar este script.
(() => {
  const M = window.MENU;
  const $ = (s, el = document) => el.querySelector(s);
  const money = n => '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cart = new Map();
  const items = new Map();
  M.cats.forEach((c, ci) => c.items.forEach((it, ii) => items.set(`${ci}-${ii}`, it)));

  // Horario de hoy (un rango "HH:MM - HH:MM" para todos los días).
  const status = $('#status');
  if (M.horario && status) {
    const [a, b] = M.horario.split('-').map(s => s.trim().slice(0, 5));
    const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();
    let o = mins(a), c = mins(b); const open = c > o ? cur >= o && cur < c : cur >= o || cur < c;
    status.innerHTML = `<span class="dot ${open ? 'on' : ''}"></span>${open ? 'Abierto' : 'Cerrado'} · ${a}–${b}`;
  } else if (status) status.remove();

  // Navegación por categorías y lista de platillos.
  $('#chips').innerHTML = M.cats.map((c, i) => `<a href="#c${i}" data-i="${i}">${esc(c.name)}</a>`).join('');
  $('#list').innerHTML = M.cats.map((c, ci) => `
    <section class="cat" id="c${ci}" data-cat="${ci}">
      <h2>${esc(c.name)}</h2><p class="n">${c.items.length} ${c.items.length === 1 ? 'platillo' : 'platillos'}</p>
      <div class="grid">${c.items.map((it, ii) => `
        <article class="item ${it.img ? '' : 'noimg'}" data-k="${ci}-${ii}" data-s="${esc(norm(it.name + ' ' + (it.desc || '') + ' ' + c.name))}">
          <div>
            <h3>${esc(it.name)}</h3>
            ${it.desc ? `<p>${esc(it.desc)}</p>` : ''}
            <div class="row">
              ${it.price ? `<span class="price">${money(it.price)}</span>` : '<span class="price na">Precio en sucursal</span>'}
              <span class="ctl" data-k="${ci}-${ii}"></span>
            </div>
          </div>
          ${it.img ? `<div class="ph"><img src="${esc(it.img)}" alt="${esc(it.name)}" width="104" height="104" loading="lazy" decoding="async"></div>` : ''}
        </article>`).join('')}
      </div>
    </section>`).join('');

  const drawCtl = k => {
    const el = document.querySelector(`.ctl[data-k="${k}"]`); const q = cart.get(k) || 0;
    el.innerHTML = q ? `<span class="step"><button data-d="-1" aria-label="Quitar uno">−</button><span>${q}</span><button data-d="1" aria-label="Agregar uno">+</button></span>`
      : `<button class="add" data-d="1">+ Agregar</button>`;
  };
  items.forEach((_, k) => drawCtl(k));

  const setQty = (k, d) => {
    const q = Math.max(0, (cart.get(k) || 0) + d);
    q ? cart.set(k, q) : cart.delete(k);
    drawCtl(k); drawCart();
  };
  $('#list').addEventListener('click', e => {
    const b = e.target.closest('button[data-d]'); if (!b) return;
    setQty(b.closest('.ctl').dataset.k, Number(b.dataset.d));
  });

  // Búsqueda.
  const q = $('#q');
  q.addEventListener('input', () => {
    const t = norm(q.value.trim()); let any = 0;
    document.querySelectorAll('.cat').forEach(sec => {
      let n = 0;
      sec.querySelectorAll('.item').forEach(it => { const ok = !t || it.dataset.s.includes(t); it.hidden = !ok; n += ok; });
      sec.hidden = !n; any += n;
    });
    $('#empty').style.display = any ? 'none' : 'block';
  });

  // Chip activo según la sección visible.
  const chips = [...document.querySelectorAll('#chips a')];
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    chips.forEach(c => c.classList.toggle('on', c.dataset.i === e.target.dataset.cat));
    const on = chips[e.target.dataset.cat]; on && on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }), { rootMargin: '-140px 0px -65% 0px' });
  document.querySelectorAll('.cat').forEach(s => io.observe(s));

  // Pedido.
  const bar = $('#cartbar'), dlg = $('#cart');
  const totals = () => { let n = 0, sum = 0, unk = 0; cart.forEach((qq, k) => { n += qq; const p = items.get(k).price; p ? sum += p * qq : unk++; }); return { n, sum, unk }; };
  function drawCart() {
    const { n, sum, unk } = totals();
    bar.classList.toggle('show', n > 0);
    $('#barcount').textContent = n; $('#bartotal').textContent = money(sum) + (unk ? ' +' : '');
    $('#lines').innerHTML = [...cart].map(([k, qq]) => { const it = items.get(k); return `
      <div class="line"><div><b>${qq} × ${esc(it.name)}</b><br><small>${it.price ? money(it.price) + ' c/u' : 'Precio en sucursal'}</small></div>
      <span class="ctl" data-k="${k}"><span class="step"><button data-d="-1" aria-label="Quitar uno">−</button><span>${qq}</span><button data-d="1" aria-label="Agregar uno">+</button></span></span></div>`; }).join('');
    $('#total').textContent = money(sum) + (unk ? ' + platillos a confirmar' : '');
    if (!n && dlg.open) dlg.close();
  }
  $('#lines').addEventListener('click', e => {
    const b = e.target.closest('button[data-d]'); if (!b) return;
    setQty(b.closest('.ctl').dataset.k, Number(b.dataset.d));
  });
  bar.addEventListener('click', () => dlg.showModal());
  $('#close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  $('#send').addEventListener('click', e => {
    e.preventDefault();
    const { sum, unk } = totals();
    const who = $('#who').value.trim(), mesa = $('#mesa').value.trim(), notas = $('#notas').value.trim();
    const lines = [...cart].map(([k, qq]) => { const it = items.get(k); return `• ${qq} × ${it.name}${it.price ? ` — ${money(it.price * qq)}` : ''}`; });
    const txt = [`Hola ${M.nombre}, quiero hacer este pedido:`, '', ...lines, '', `Total aprox.: ${money(sum)}${unk ? ' (más platillos con precio por confirmar)' : ''}`,
      who && `Nombre: ${who}`, mesa && `Mesa / para llevar: ${mesa}`, notas && `Notas: ${notas}`, '', 'Pedido hecho desde el menú digital.'].filter(v => v !== '' && v !== undefined && v !== false).join('\n');
    window.open(`https://wa.me/52${M.whatsapp}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
  });

  // Compartir el menú.
  const share = $('#share');
  share && share.addEventListener('click', async () => {
    const data = { title: M.nombre, text: `Menú de ${M.nombre}`, url: location.href.split('#')[0] };
    try { if (navigator.share) return await navigator.share(data); await navigator.clipboard.writeText(data.url); toast('Enlace copiado'); } catch (_) {}
  });
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 1800); }
})();
