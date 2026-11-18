// Menú digital · plantilla compartida LKM'r (v2). Lee window.MENU (datos) que cada página define antes de cargar este script.
(() => {
  'use strict';
  const M = window.MENU;
  const $ = (s, el = document) => el.querySelector(s);
  const money = n => { const v = Number(n); return '$' + v.toLocaleString('es-MX', Number.isInteger(v) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const buzz = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (_) {} };
  const items = new Map();
  M.cats.forEach((c, ci) => c.items.forEach((it, ii) => items.set(`${ci}-${ii}`, { ...it, cat: c.name })));

  // Pedido guardado mientras la pestaña siga abierta (si recargan, no se pierde).
  const KEY = 'lkm-pedido-' + location.pathname;
  const cart = new Map();
  try { (JSON.parse(sessionStorage.getItem(KEY) || '[]')).forEach(([k, q]) => items.has(k) && q > 0 && cart.set(k, q)); } catch (_) {}
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify([...cart])); } catch (_) {} };

  // Horario de hoy (un rango "HH:MM - HH:MM" para todos los días).
  const status = $('#status');
  if (M.horario && status) {
    const [a, b] = M.horario.split('-').map(s => s.trim().slice(0, 5));
    const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();
    const o = mins(a), c = mins(b); const open = c > o ? cur >= o && cur < c : cur >= o || cur < c;
    status.innerHTML = `<span class="dot ${open ? 'on' : ''}"></span>${open ? 'Abierto ahora' : 'Cerrado ahora'} · ${a}–${b}`;
  } else if (status) status.remove();

  // Categorías y platillos.
  $('#chips').innerHTML = M.cats.map((c, i) => `<a href="#c${i}" data-i="${i}">${esc(c.name)}</a>`).join('');
  $('#list').innerHTML = M.cats.map((c, ci) => `
    <section class="cat" id="c${ci}" data-cat="${ci}" aria-labelledby="h${ci}">
      <h2 id="h${ci}">${esc(c.name)}</h2><p class="n">${c.items.length} ${c.items.length === 1 ? 'platillo' : 'platillos'}</p>
      <div class="grid">${c.items.map((it, ii) => `
        <article class="item ${it.img ? '' : 'noimg'}" data-k="${ci}-${ii}" data-s="${esc(norm(it.name + ' ' + (it.desc || '') + ' ' + c.name))}">
          <button class="open" type="button" data-k="${ci}-${ii}"><span class="sr">Ver ${esc(it.name)}</span></button>
          <div>
            <h3>${esc(it.name)}</h3>
            ${it.desc ? `<p>${esc(it.desc)}</p>` : ''}
            <div class="row">
              ${it.price ? `<span class="price">${money(it.price)}</span>` : '<span class="price na">Precio en sucursal</span>'}
              <span class="ctl" data-k="${ci}-${ii}"></span>
            </div>
          </div>
          ${it.img ? `<div class="ph"><img src="${esc(it.img)}" alt="" width="108" height="108" loading="${ci < 1 && ii < 4 ? 'eager' : 'lazy'}" decoding="async"></div>` : ''}
        </article>`).join('')}
      </div>
    </section>`).join('');
  // Recomendados de la casa: los platillos estrella arriba, con foto grande (estándar de excelencia LKM'r).
  const recs = (M.dest || []).filter(k => items.has(k));
  if (recs.length >= 3) $('#list').insertAdjacentHTML('afterbegin', `
    <section class="recs" aria-labelledby="hrec">
      <h2 id="hrec">Recomendados de la casa</h2><p class="n">Lo que más se antoja aquí</p>
      <div class="rrow">${recs.map(k => { const it = items.get(k); return `
        <article class="rec"><button class="open" type="button" data-k="${k}"><span class="sr">Ver ${esc(it.name)}</span></button>
          ${it.img ? `<img src="${esc(it.img)}" alt="" width="220" height="160" loading="eager" decoding="async">` : ''}
          <h3>${esc(it.name)}</h3>${it.price ? `<span class="price">${money(it.price)}</span>` : ''}</article>`; }).join('')}</div>
    </section>`);
  // Las fotos aparecen suaves al cargar (y nunca se quedan invisibles si fallan).
  document.querySelectorAll('.ph img').forEach(img => {
    const ok = () => img.classList.add('ok');
    img.complete ? ok() : (img.addEventListener('load', ok), img.addEventListener('error', () => { img.closest('.ph').remove(); }));
  });

  const stepper = (k, q) => `<span class="step"><button type="button" data-d="-1" aria-label="Quitar uno">−</button><span aria-live="polite">${q}</span><button type="button" data-d="1" aria-label="Agregar uno">+</button></span>`;
  const drawCtl = k => {
    const el = document.querySelector(`#list .ctl[data-k="${k}"]`); if (!el) return; const q = cart.get(k) || 0;
    el.innerHTML = q ? stepper(k, q) : `<button class="add" type="button" data-d="1" aria-label="Agregar ${esc(items.get(k).name)}">+ Agregar</button>`;
    el.closest('.item').classList.toggle('in', q > 0);
  };
  items.forEach((_, k) => drawCtl(k));

  const setQty = (k, d) => {
    const q = Math.max(0, (cart.get(k) || 0) + d);
    q ? cart.set(k, q) : cart.delete(k);
    if (d > 0) { buzz(); bar.classList.remove('bump'); void bar.offsetWidth; bar.classList.add('bump'); }
    drawCtl(k); drawCart(); save(); if (dish.open && dishKey === k) drawDish();
  };
  $('#list').addEventListener('click', e => {
    const b = e.target.closest('button[data-d]');
    if (b) return setQty(b.closest('.ctl').dataset.k, Number(b.dataset.d));
    const o = e.target.closest('.open'); if (o) openDish(o.dataset.k);
  });

  // Búsqueda: la lupa despliega el campo encima de las categorías.
  const q = $('#q'), sbox = $('#search'), sbtn = $('#sbtn'), qinfo = $('#qinfo');
  const runSearch = () => {
    const t = norm(q.value.trim()); let any = 0;
    document.querySelectorAll('.cat').forEach(sec => {
      let n = 0;
      sec.querySelectorAll('.item').forEach(it => { const ok = !t || it.dataset.s.includes(t); it.hidden = !ok; n += ok; });
      sec.hidden = !n; any += n;
    });
    const rs = $('.recs'); if (rs) rs.hidden = !!t;
    $('#empty').style.display = any ? 'none' : 'block';
    qinfo.textContent = t ? `${any} ${any === 1 ? 'resultado' : 'resultados'} para "${q.value.trim()}"` : '';
    // Si estaban más abajo, sube a los resultados para que se vean.
    const top = $('main').getBoundingClientRect().top + scrollY - 70;
    if (t && scrollY > top) scrollTo({ top, behavior: 'auto' });
  };
  q.addEventListener('input', runSearch);
  const openSearch = () => { sbox.hidden = false; sbtn.setAttribute('aria-expanded', 'true'); q.focus(); };
  const closeSearch = () => { q.value = ''; runSearch(); sbox.hidden = true; sbtn.setAttribute('aria-expanded', 'false'); sbtn.focus(); };
  sbtn.addEventListener('click', openSearch);
  $('#qx').addEventListener('click', closeSearch);
  q.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); if (e.key === 'Enter') q.blur(); });

  // Chip activo según la sección visible.
  const chips = [...document.querySelectorAll('#chips a')];
  let lastOn = null;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const on = chips[e.target.dataset.cat]; if (!on || on === lastOn) return; lastOn = on;
    chips.forEach(c => c.classList.toggle('on', c === on));
    const box = $('#chips'); box.scrollTo({ left: on.offsetLeft - box.clientWidth / 2 + on.clientWidth / 2, behavior: 'smooth' });
  }), { rootMargin: '-70px 0px -70% 0px' });
  document.querySelectorAll('.cat').forEach(s => io.observe(s));

  // Hojas: bloquean el fondo mientras están abiertas.
  const lock = on => document.documentElement.classList.toggle('locked', on);
  const sheet = d => {
    d.addEventListener('close', () => lock(document.querySelectorAll('dialog[open]').length > 0));
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
  };

  // Detalle del platillo: foto grande, descripción completa y cantidad.
  const dish = $('#dish'); let dishKey = null; sheet(dish);
  function drawDish() {
    const it = items.get(dishKey), qn = cart.get(dishKey) || 0;
    $('#dcat').textContent = it.cat; $('#dname').textContent = it.name; $('#ddesc').textContent = it.desc || '';
    $('#ddesc').hidden = !it.desc;
    $('#dprice').textContent = it.price ? money(it.price) : 'Precio en sucursal';
    $('#dprice').className = 'price' + (it.price ? '' : ' na');
    $('#dstep').innerHTML = qn ? stepper(dishKey, qn) : '';
    $('#dadd').textContent = qn ? `Listo · ${qn} en tu pedido` : `Agregar${it.price ? ' · ' + money(it.price) : ''}`;
  }
  function openDish(k) {
    dishKey = k; const it = items.get(k), img = $('#dimg');
    $('.dimg', dish).hidden = !it.img; dish.classList.toggle('noimg', !it.img);
    if (it.img) { img.src = it.img; img.alt = it.name; }
    drawDish(); lock(true); dish.showModal();
  }
  $('#dstep').addEventListener('click', e => { const b = e.target.closest('button[data-d]'); b && setQty(dishKey, Number(b.dataset.d)); });
  $('#dadd').addEventListener('click', () => { if (!cart.get(dishKey)) setQty(dishKey, 1); dish.close(); });
  $('#dclose').addEventListener('click', () => dish.close());

  // Pedido.
  const bar = $('#cartbar'), dlg = $('#cart'); sheet(dlg);
  const totals = () => { let n = 0, sum = 0, unk = 0; cart.forEach((qq, k) => { n += qq; const p = items.get(k).price; p ? sum += p * qq : unk++; }); return { n, sum, unk }; };
  function drawCart() {
    const { n, sum, unk } = totals();
    bar.classList.toggle('show', n > 0); bar.setAttribute('aria-hidden', String(!n)); bar.tabIndex = n ? 0 : -1;
    $('#barcount').textContent = n; $('#bartotal').textContent = money(sum) + (unk ? ' +' : '');
    $('#lines').innerHTML = [...cart].map(([k, qq]) => { const it = items.get(k); return `
      <div class="line"><div><b>${esc(it.name)}</b><br><small>${it.price ? money(it.price) + ' c/u' : 'Precio en sucursal'}</small></div>
      <span class="ctl" data-k="${k}">${stepper(k, qq)}</span></div>`; }).join('');
    $('#total').textContent = money(sum) + (unk ? ' + por confirmar' : '');
    if (!n && dlg.open) dlg.close();
  }
  $('#lines').addEventListener('click', e => {
    const b = e.target.closest('button[data-d]'); if (!b) return;
    setQty(b.closest('.ctl').dataset.k, Number(b.dataset.d));
  });
  bar.addEventListener('click', () => { lock(true); dlg.showModal(); });
  $('#close').addEventListener('click', () => dlg.close());

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
  let tt; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 1800); }

  drawCart();
})();
