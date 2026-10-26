/* JkJ Stock: lógica compartida por todas las secciones (catálogo, carrito y pedido por WhatsApp). */
(() => {
  'use strict';

  /* =========================================================
     CONFIGURACIÓN
     ========================================================= */
  const CONFIG = {
    store: 'JkJ Stock',
    whatsapp: '524492094034',
    whatsappDisplay: '449 209 4034',
    instagram: 'https://www.instagram.com/l_u_k_a_mon/',
    markup: 0.25,           // +25 % sobre el precio base del proveedor
    pageSize: 24,
    storageKey: 'jkjstock.cart.v1',
    discount: { min: 2000, rate: 0.05 }, // 5 % automático desde $2,000
  };

  // Datos de la página actual (atributos data-* del <body>).
  const PAGE = {
    section: document.body.dataset.section || 'perfumes',
    root: document.body.dataset.root || '',
    one: document.body.dataset.noun || 'producto',
    many: document.body.dataset.nounPlural || 'productos',
  };

  const GENDER_LABEL = { hombre: 'Hombre', mujer: 'Mujer', unisex: 'Unisex' };

  /* =========================================================
     UTILIDADES
     ========================================================= */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const fmt = (n) => money.format(n);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const icons = () => window.lucide && window.lucide.createIcons();
  const vibrate = (p = 10) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sin soporte */ } };
  const storage = {
    get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* no disponible */ } },
  };

  // Todo el catálogo alimenta el carrito (compartido entre secciones); la cuadrícula muestra solo la sección actual.
  const ALL = (window.JKJ_CATALOG || []).map((p) => ({ ...p, images: p.images.map((src) => PAGE.root + src), price: Math.round(p.base * (1 + CONFIG.markup)), search: norm(`${p.name} ${p.brand}`) }));
  const byId = Object.fromEntries(ALL.map((p) => [p.id, p]));
  const PRODUCTS = ALL.filter((p) => p.section === PAGE.section);
  const tag = (p) => GENDER_LABEL[p.gender] || '';
  const plural = (n) => `${n} ${n === 1 ? PAGE.one : PAGE.many}`;

  /* =========================================================
     TOASTS
     ========================================================= */
  const toast = (html, icon = 'check') => {
    const el = document.createElement('div');
    el.className = 'toast pointer-events-auto flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lift';
    el.innerHTML = `<span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"><i data-lucide="${icon}" class="h-4 w-4"></i></span><p class="flex-1">${html}</p>`;
    $('#toasts').appendChild(el);
    icons();
    setTimeout(() => { el.classList.add('is-leaving'); el.addEventListener('animationend', () => el.remove(), { once: true }); }, 2800);
  };

  /* =========================================================
     CAPAS ACCESIBLES (ESC + trampa de foco)
     ========================================================= */
  class Layer {
    static stack = [];
    constructor(el, { trigger, onClose } = {}) {
      this.el = el; this.trigger = trigger; this.onClose = onClose;
      el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) this.close(); });
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const f = this.focusables(); if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      });
    }
    get isOpen() { return this.el.classList.contains('is-open'); }
    focusables() { return $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', this.el).filter((n) => n.offsetParent !== null); }
    open(opener) {
      if (this.isOpen) return;
      this.last = opener || document.activeElement;
      Layer.stack.push(this);
      this.el.classList.add('is-open'); this.el.setAttribute('aria-hidden', 'false');
      if (this.trigger) this.trigger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
      requestAnimationFrame(() => { const f = this.focusables()[0]; if (f) f.focus({ preventScroll: true }); });
    }
    close() {
      if (!this.isOpen) return;
      Layer.stack = Layer.stack.filter((l) => l !== this);
      this.el.classList.remove('is-open'); this.el.setAttribute('aria-hidden', 'true');
      if (this.trigger) this.trigger.setAttribute('aria-expanded', 'false');
      if (!Layer.stack.length) document.body.classList.remove('is-locked');
      if (this.onClose) this.onClose();
      if (this.last && document.contains(this.last)) this.last.focus({ preventScroll: true });
    }
    static init() { document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && Layer.stack.length) Layer.stack[Layer.stack.length - 1].close(); }); }
  }

  /* =========================================================
     CARRITO
     ========================================================= */
  class Cart {
    constructor() {
      const saved = storage.get(CONFIG.storageKey, []);
      this.items = Array.isArray(saved) ? saved.filter((i) => byId[i.id] && i.qty > 0) : [];
      this.subs = new Set();
    }
    subscribe(fn) { this.subs.add(fn); fn(); }
    emit() { storage.set(CONFIG.storageKey, this.items); this.subs.forEach((fn) => fn()); }
    add(id, qty = 1) { const l = this.items.find((i) => i.id === id); if (l) l.qty = Math.min(l.qty + qty, 99); else this.items.push({ id, qty }); this.emit(); }
    set(id, qty) { const l = this.items.find((i) => i.id === id); if (!l) return; if (qty <= 0) this.items = this.items.filter((i) => i.id !== id); else l.qty = Math.min(qty, 99); this.emit(); }
    clear() { this.items = []; this.emit(); }
    get count() { return this.items.reduce((s, i) => s + i.qty, 0); }
    get subtotal() { return this.items.reduce((s, i) => s + byId[i.id].price * i.qty, 0); }
    get discount() { return this.subtotal >= CONFIG.discount.min ? Math.round(this.subtotal * CONFIG.discount.rate) : 0; }
    get total() { return this.subtotal - this.discount; }
    lines() { return this.items.map((i) => ({ ...i, p: byId[i.id] })); }
  }

  const flyToCart = (img) => {
    const target = $('#cart-button');
    const bump = () => { target.classList.remove('cart-bump'); void target.offsetWidth; target.classList.add('cart-bump'); };
    if (!img || reduced) return bump();
    const s = img.getBoundingClientRect(), t = target.getBoundingClientRect();
    if (!s.width) return bump();
    const size = Math.min(s.width, 140);
    const g = document.createElement('img');
    g.src = img.currentSrc || img.src; g.alt = '';
    Object.assign(g.style, { position: 'fixed', zIndex: 150, left: `${s.left + s.width / 2 - size / 2}px`, top: `${s.top + s.height / 2 - size / 2}px`, width: `${size}px`, height: `${size}px`, objectFit: 'contain', background: '#fff', borderRadius: '50%', pointerEvents: 'none', boxShadow: '0 20px 40px rgba(18,17,16,.25)' });
    document.body.appendChild(g);
    const dx = t.left + t.width / 2 - (s.left + s.width / 2), dy = t.top + t.height / 2 - (s.top + s.height / 2);
    g.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 100}px) scale(.6)`, offset: 0.45 }, { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0.4 }], { duration: 850, easing: 'cubic-bezier(.55,0,.3,1)' }).onfinish = () => { g.remove(); bump(); };
  };

  /* =========================================================
     MENSAJE DE WHATSAPP (formato ASCII)
     ========================================================= */
  const WIDTH = 30;
  const line = (ch = '-') => ch.repeat(WIDTH);
  const leader = (left, right, width = WIDTH) => {
    const dots = Math.max(2, width - left.length - right.length - 2);
    return `${left} ${'.'.repeat(dots)} ${right}`;
  };
  // Parte el texto en renglones: el primero mide `first`, los demás llevan `indent` delante.
  const wrap = (text, first, indent) => {
    const out = []; let cur = '';
    text.split(/\s+/).forEach((w) => {
      const max = out.length ? WIDTH - indent.length : first;
      if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
    });
    if (cur) out.push(cur);
    return out.map((l, i) => (i === 0 ? l : indent + l));
  };
  const folio = () => `JKJ-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
  const stamp = () => new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date());

  const buildMessage = (order) => {
    const items = order.lines.map((l, i) => {
      const n = String(i + 1).padStart(2, '0');
      const name = wrap(l.p.name, WIDTH - 4, '    ');
      return [
        `${n}. ${name[0]}`,
        ...name.slice(1),
        `    ${[l.p.brand, tag(l.p)].filter(Boolean).join(' | ')}`,
        `    ${leader(`${l.qty} x ${fmt(l.p.price)}`, fmt(l.p.price * l.qty), WIDTH - 4)}`,
      ].join('\n');
    }).join('\n\n');
    const pieces = order.lines.reduce((s, l) => s + l.qty, 0);
    return [
      `*${CONFIG.store.toUpperCase()} :: NUEVO PEDIDO*`,
      '```',
      line('='),
      `Folio : ${order.folio}`,
      `Fecha : ${order.date}`,
      line('='),
      '```',
      '*CLIENTE*',
      '```',
      `Nombre : ${order.name}`,
      `Entrega: ${order.delivery === 'envio' ? 'Envio' : 'Entrega personal'}`,
      ...(order.delivery === 'envio' ? [`Ciudad : ${order.city}`] : []),
      ...(order.delivery === 'envio' && order.address ? wrap(`Direcc.: ${order.address}`, WIDTH, '         ') : []),
      `Pago   : ${order.pay}`,
      '```',
      '*PRODUCTOS*',
      '```',
      line('-'),
      items,
      line('-'),
      leader('Piezas', String(pieces)),
      ...(order.discount ? [leader('Subtotal', fmt(order.subtotal)), leader(`Desc. ${CONFIG.discount.rate * 100}%`, `-${fmt(order.discount)}`)] : []),
      leader('TOTAL', `${fmt(order.total)} MXN`),
      line('='),
      '```',
      ...(order.notes ? [`*NOTAS:* ${order.notes}`, ''] : []),
      '_Envio de pedido desde el catalogo web. Quedo atento(a) a la confirmacion de existencias, pago y entrega._',
    ].join('\n');
  };
  const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

  /* =========================================================
     CATÁLOGO
     ========================================================= */
  class Catalog {
    constructor(cart, modal) {
      this.cart = cart; this.modal = modal;
      this.state = { gender: 'all', brands: new Set(), price: null, q: '', sort: 'relevance', shown: CONFIG.pageSize };
      this.prices = this.priceBands();
      this.renderChips();
      this.bind();
      this.render();
    }
    priceBands() {
      const ps = PRODUCTS.map((p) => p.price).sort((a, b) => a - b);
      const q1 = ps[Math.floor(ps.length / 3)], q2 = ps[Math.floor((ps.length * 2) / 3)];
      return [
        { id: 'low', label: `Hasta ${fmt(q1)}`, test: (p) => p.price <= q1 },
        { id: 'mid', label: `${fmt(q1 + 1)} – ${fmt(q2)}`, test: (p) => p.price > q1 && p.price <= q2 },
        { id: 'high', label: `Más de ${fmt(q2)}`, test: (p) => p.price > q2 },
      ];
    }
    renderChips() {
      const brands = [...new Set(PRODUCTS.map((p) => p.brand))].sort((a, b) => PRODUCTS.filter((p) => p.brand === b).length - PRODUCTS.filter((p) => p.brand === a).length);
      $('#brand-chips').innerHTML = brands.map((b) => `<button type="button" class="chip" aria-pressed="false" data-brand="${esc(b)}">${esc(b)} <span class="text-[0.65rem] opacity-60">${PRODUCTS.filter((p) => p.brand === b).length}</span></button>`).join('');
      $('#price-chips').innerHTML = this.prices.map((b) => `<button type="button" class="chip" aria-pressed="false" data-price="${b.id}">${b.label}</button>`).join('');
    }
    filtered() {
      const s = this.state;
      let list = PRODUCTS.filter((p) =>
        (s.gender === 'all' || p.gender === s.gender) &&
        (!s.brands.size || s.brands.has(p.brand)) &&
        (!s.price || this.prices.find((b) => b.id === s.price).test(p)) &&
        (!s.q || s.q.split(' ').every((w) => p.search.includes(w))));
      const sorters = {
        relevance: (a, b) => a.order - b.order,
        'price-asc': (a, b) => a.price - b.price || a.order - b.order,
        'price-desc': (a, b) => b.price - a.price || a.order - b.order,
        az: (a, b) => a.name.localeCompare(b.name, 'es'),
        za: (a, b) => b.name.localeCompare(a.name, 'es'),
      };
      return list.sort(sorters[s.sort]);
    }
    card(p, i) {
      const alt = p.images[1];
      return `
      <article class="product-card card-in group flex flex-col overflow-hidden rounded-[22px] bg-white shadow-card" style="--d:${(i % CONFIG.pageSize) * 35}ms" data-id="${p.id}">
        <button type="button" class="relative block aspect-square overflow-hidden bg-white focus-ring" data-action="view" aria-label="Ver ${esc(p.name)}">
          <img class="img-a ${alt ? 'has-alt' : ''} absolute inset-0 h-full w-full object-contain p-3 sm:p-5" loading="lazy" decoding="async" src="${p.images[0]}" alt="${esc(p.name)}" />
          ${alt ? `<img class="img-b absolute inset-0 h-full w-full object-contain p-3 sm:p-5" loading="lazy" decoding="async" src="${alt}" alt="" />` : ''}
          ${tag(p) ? `<span class="absolute left-2.5 top-2.5 rounded-full bg-ivory/90 px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-wider text-ink-soft backdrop-blur sm:left-3 sm:top-3">${tag(p)}</span>` : ''}
        </button>
        <div class="flex flex-1 flex-col p-3.5 pt-3 sm:p-5 sm:pt-4">
          <p class="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-bronze sm:text-[0.65rem]">${esc(p.brand)}</p>
          <h3 class="mt-1 line-clamp-2 flex-1 text-[0.82rem] font-semibold leading-snug sm:text-[0.95rem]">${esc(p.name)}</h3>
          <div class="mt-3 flex items-center justify-between gap-2">
            <p class="text-base font-extrabold sm:text-lg">${fmt(p.price)}</p>
            <button type="button" class="btn btn-ink h-9 w-9 shrink-0 !rounded-full p-0 sm:h-10 sm:w-auto sm:px-4 sm:text-xs" data-action="add" aria-label="Agregar ${esc(p.name)} al carrito"><i data-lucide="plus" class="h-4 w-4"></i><span class="hidden sm:inline">Agregar</span></button>
          </div>
        </div>
      </article>`;
    }
    render(resetPage = false) {
      if (resetPage) this.state.shown = CONFIG.pageSize;
      const list = this.filtered();
      const visible = list.slice(0, this.state.shown);
      $('#grid').innerHTML = visible.map((p, i) => this.card(p, i)).join('');
      $('#empty').classList.toggle('hidden', list.length > 0);
      $('#results').textContent = list.length ? plural(list.length) : '';
      $('#progress-text').textContent = list.length ? `Mostrando ${visible.length} de ${list.length}` : '';
      $('#progress-bar').style.width = list.length ? `${(visible.length / list.length) * 100}%` : '0';
      $('#progress-bar').parentElement.classList.toggle('hidden', !list.length);
      $('#load-more').classList.toggle('hidden', visible.length >= list.length);
      const active = this.state.brands.size + (this.state.price ? 1 : 0);
      $('#filters-badge').textContent = active;
      $('#filters-badge').classList.toggle('hidden', !active);
      $('#clear-filters').classList.toggle('hidden', !(active || this.state.q || this.state.gender !== 'all'));
      $('#empty-wa').href = waLink(`Hola ${CONFIG.store}, busco: ${$('#search').value || '(escribe aquí)'}`);
      icons();
    }
    setGender(g) {
      this.state.gender = g;
      $$('#gender-tabs [data-gender]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.gender === g)));
      this.render(true);
    }
    reset() {
      this.state.brands.clear(); this.state.price = null; this.state.q = '';
      $('#search').value = '';
      $$('[data-brand], [data-price]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      this.setGender('all');
    }
    bind() {
      $('#gender-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-gender]'); if (b) this.setGender(b.dataset.gender); });
      $('#brand-chips').addEventListener('click', (e) => {
        const b = e.target.closest('[data-brand]'); if (!b) return;
        const v = b.dataset.brand, on = !this.state.brands.has(v);
        on ? this.state.brands.add(v) : this.state.brands.delete(v);
        b.setAttribute('aria-pressed', String(on)); vibrate(6); this.render(true);
      });
      $('#price-chips').addEventListener('click', (e) => {
        const b = e.target.closest('[data-price]'); if (!b) return;
        this.state.price = this.state.price === b.dataset.price ? null : b.dataset.price;
        $$('#price-chips [data-price]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.price === this.state.price)));
        vibrate(6); this.render(true);
      });
      $('#filters-toggle').addEventListener('click', (e) => {
        const open = $('#filters-panel').classList.toggle('hidden') === false;
        e.currentTarget.setAttribute('aria-expanded', String(open));
      });
      $('#sort').addEventListener('change', (e) => { this.state.sort = e.target.value; this.render(true); });
      let t;
      $('#search').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { this.state.q = norm(e.target.value.trim()); this.render(true); }, 150); });
      $('#clear-filters').addEventListener('click', () => this.reset());
      $('#load-more').addEventListener('click', () => { this.state.shown += CONFIG.pageSize; this.render(); });
      $('#grid').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]'); if (!btn) return;
        const card = btn.closest('[data-id]'); const p = byId[card.dataset.id];
        if (btn.dataset.action === 'view') this.modal.show(p, btn);
        if (btn.dataset.action === 'add') {
          this.cart.add(p.id); flyToCart($('.img-a', card)); vibrate();
          toast(`<strong>${esc(p.name)}</strong> agregado`, 'shopping-bag');
        }
      });
      $$('[data-quick-gender]').forEach((a) => a.addEventListener('click', () => this.setGender(a.dataset.quickGender)));
    }
  }

  /* =========================================================
     VISTA RÁPIDA
     ========================================================= */
  class ProductModal {
    constructor(cart) {
      this.cart = cart; this.qty = 1;
      this.layer = new Layer($('#product-modal'));
      $('#pm-minus').addEventListener('click', () => this.setQty(this.qty - 1));
      $('#pm-plus').addEventListener('click', () => this.setQty(this.qty + 1));
      $('#pm-add').addEventListener('click', () => {
        this.cart.add(this.p.id, this.qty); flyToCart($('#pm-img')); vibrate();
        toast(`${this.qty} × <strong>${esc(this.p.name)}</strong> en tu carrito`, 'shopping-bag');
        this.layer.close();
      });
      $('#pm-wa').addEventListener('click', () => {
        this.cart.add(this.p.id, this.qty);
        this.layer.close();
        window.dispatchEvent(new CustomEvent('open-cart'));
        toast('Completa tus datos para enviar el pedido', 'message-circle');
      });
      $('#pm-thumbs').addEventListener('click', (e) => { const b = e.target.closest('[data-src]'); if (b) this.setImage(b.dataset.src); });
    }
    setImage(src) {
      $('#pm-img').src = src;
      $$('#pm-thumbs [data-src]').forEach((b) => b.classList.toggle('!border-ink', b.dataset.src === src));
    }
    setQty(q) {
      this.qty = Math.max(1, Math.min(99, q));
      $('#pm-qty').textContent = this.qty;
      $('#pm-total').textContent = `· ${fmt(this.p.price * this.qty)}`;
      $('#pm-minus').disabled = this.qty <= 1;
    }
    show(p, opener) {
      this.p = p;
      $('#pm-img').alt = p.name;
      $('#pm-brand').textContent = p.brand;
      $('#pm-title').textContent = p.name;
      $('#pm-price').textContent = fmt(p.price);
      $('#pm-meta').innerHTML = [tag(p), p.ml && `${p.ml} ml`, ...(p.details || []), p.available === false ? 'Bajo pedido' : 'Disponible'].filter(Boolean)
        .map((t) => `<span class="rounded-full border border-black/10 bg-ivory px-3 py-1.5 text-xs font-semibold text-ink-soft">${t}</span>`).join('');
      $('#pm-thumbs').innerHTML = p.images.length > 1 ? p.images.map((src) => `<button type="button" class="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-transparent bg-white focus-ring" data-src="${src}" aria-label="Ver imagen"><img class="h-full w-full object-contain" src="${src}" alt="" loading="lazy" /></button>`).join('') : '';
      this.setImage(p.images[0]);
      this.setQty(1);
      icons();
      this.layer.open(opener);
    }
  }

  /* =========================================================
     CARRITO (drawer + pedido por WhatsApp)
     ========================================================= */
  class CartDrawer {
    constructor(cart) {
      this.cart = cart; this.delivery = 'envio';
      this.layer = new Layer($('#cart-drawer'), { trigger: $('#cart-button'), onClose: () => { if (this.done) setTimeout(() => this.view('cart'), 500); } });
      $('#cart-button').addEventListener('click', (e) => this.layer.open(e.currentTarget));
      $('#open-cart-footer').addEventListener('click', (e) => this.layer.open(e.currentTarget));
      window.addEventListener('open-cart', () => this.layer.open($('#cart-button')));
      cart.subscribe(() => this.render());
      $('#cart-items').addEventListener('click', (e) => {
        const b = e.target.closest('[data-op]'); if (!b) return;
        const l = this.cart.items.find((i) => i.id === b.dataset.id); if (!l) return;
        vibrate(6);
        if (b.dataset.op === 'inc') this.cart.set(l.id, l.qty + 1);
        if (b.dataset.op === 'dec') this.cart.set(l.id, l.qty - 1);
        if (b.dataset.op === 'del') this.cart.set(l.id, 0);
      });
      $$('[data-delivery]').forEach((b) => b.addEventListener('click', () => {
        this.delivery = b.dataset.delivery;
        $$('[data-delivery]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        $$('[data-delivery-field]').forEach((f) => f.classList.toggle('hidden', f.dataset.deliveryField !== this.delivery));
      }));
      ['o-name', 'o-city'].forEach((id) => $(`#${id}`).addEventListener('input', () => this.err(id, '')));
      const saved = storage.get('jkjstock.customer', null);
      if (saved) { $('#o-name').value = saved.name || ''; $('#o-city').value = saved.city || ''; }
      $('#send-order').addEventListener('click', () => this.send());
      $('#os-new').addEventListener('click', () => { this.layer.close(); });
    }
    err(id, msg) {
      $(`#${id}`).setAttribute('aria-invalid', msg ? 'true' : 'false');
      $(`#e-${id.slice(2)}`).textContent = msg;
    }
    view(v) {
      this.done = v === 'success';
      $('#cart-view').classList.toggle('hidden', v !== 'cart'); $('#cart-view').classList.toggle('flex', v === 'cart');
      $('#cart-success').classList.toggle('hidden', v !== 'success'); $('#cart-success').classList.toggle('flex', v === 'success');
    }
    render() {
      const n = this.cart.count;
      const badge = $('#cart-count');
      badge.textContent = n > 99 ? '99+' : n;
      badge.style.transform = n ? 'scale(1)' : 'scale(0)';
      $('#cart-button').setAttribute('aria-label', `Abrir carrito, ${n} ${n === 1 ? 'pieza' : 'piezas'}`);
      $('#cart-empty').classList.toggle('hidden', n > 0);
      $('#order-form').classList.toggle('hidden', n === 0);
      $('#cart-footer').classList.toggle('hidden', n === 0);
      $('#cart-sub').textContent = n ? `${n} ${n === 1 ? 'pieza' : 'piezas'}` : 'Aún no agregas productos';
      $('#cart-pieces').textContent = n;
      const { subtotal, discount, total } = this.cart;
      const missing = CONFIG.discount.min - subtotal;
      $('#cart-subtotal').textContent = fmt(subtotal);
      $('#cart-discount').textContent = `-${fmt(discount)}`;
      $$('[data-discount-row]').forEach((r) => r.classList.toggle('hidden', !discount));
      $('#cart-total').textContent = fmt(total);
      $('#discount-hint').classList.toggle('hidden', !n || missing <= 0);
      $('#discount-missing').textContent = fmt(missing);
      $('#discount-bar').style.width = `${Math.min(100, (subtotal / CONFIG.discount.min) * 100)}%`;
      $('#cart-items').innerHTML = this.cart.lines().map((l) => `
        <li class="flex gap-3 rounded-2xl bg-white p-3 shadow-card">
          <img class="h-20 w-20 shrink-0 rounded-xl object-contain" src="${l.p.images[0]}" alt="" loading="lazy" />
          <div class="flex min-w-0 flex-1 flex-col">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-bronze">${esc(l.p.brand)}</p>
                <p class="line-clamp-2 text-sm font-semibold leading-snug">${esc(l.p.name)}</p>
              </div>
              <button type="button" class="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-mute hover:text-red-600 focus-ring" data-op="del" data-id="${l.id}" aria-label="Quitar ${esc(l.p.name)}"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
            </div>
            <div class="mt-auto flex items-center justify-between pt-2">
              <div class="flex items-center rounded-full border border-black/10">
                <button type="button" class="grid h-8 w-8 place-items-center focus-ring" data-op="dec" data-id="${l.id}" aria-label="Quitar uno"><i data-lucide="minus" class="h-3.5 w-3.5"></i></button>
                <span class="w-6 text-center text-sm font-bold tabular-nums">${l.qty}</span>
                <button type="button" class="grid h-8 w-8 place-items-center focus-ring" data-op="inc" data-id="${l.id}" aria-label="Agregar uno"><i data-lucide="plus" class="h-3.5 w-3.5"></i></button>
              </div>
              <p class="font-extrabold tabular-nums">${fmt(l.p.price * l.qty)}</p>
            </div>
          </div>
        </li>`).join('');
      icons();
    }
    send() {
      if (!this.cart.count) return;
      const name = $('#o-name').value.trim(), city = $('#o-city').value.trim();
      let ok = true;
      if (name.length < 3) { this.err('o-name', 'Escribe tu nombre para identificar el pedido.'); ok = false; }
      if (this.delivery === 'envio' && city.length < 3) { this.err('o-city', 'Indica tu ciudad para cotizar el envío.'); ok = false; }
      if (!ok) {
        const b = $('#send-order'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        const f = $('#order-form [aria-invalid="true"]'); if (f) f.focus();
        return;
      }
      storage.set('jkjstock.customer', { name, city });
      const order = {
        folio: folio(), date: stamp(), name, city, delivery: this.delivery,
        address: $('#o-address').value.trim(), pay: $('#o-pay').value, notes: $('#o-notes').value.trim(),
        lines: this.cart.lines(), subtotal: this.cart.subtotal, discount: this.cart.discount, total: this.cart.total,
      };
      const link = waLink(buildMessage(order));
      window.open(link, '_blank', 'noopener');
      $('#os-name').textContent = name.split(' ')[0];
      $('#os-folio').textContent = order.folio;
      $('#os-wa').href = link;
      this.cart.clear();
      $('#o-notes').value = '';
      this.view('success');
      vibrate([10, 40, 20]);
      $('#cart-success').focus();
    }
  }

  /* =========================================================
     EFECTOS
     ========================================================= */
  const effects = () => {
    const header = $('#site-header');
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } }), { threshold: 0.12 });
    $$('[data-reveal]').forEach((el) => io.observe(el));
    document.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.btn'); if (!b || b.disabled) return;
      const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), sp = document.createElement('span');
      sp.className = 'ripple';
      Object.assign(sp.style, { width: `${s}px`, height: `${s}px`, left: `${e.clientX - r.left - s / 2}px`, top: `${e.clientY - r.top - s / 2}px` });
      b.appendChild(sp); sp.addEventListener('animationend', () => sp.remove(), { once: true });
    });
  };

  const decorate = () => {
    // Imágenes del hero: las indicadas en data-hero o las primeras de la sección.
    const wanted = (document.body.dataset.hero || '').split(',').map((id) => byId[id]).filter(Boolean);
    const heroes = [...wanted, ...PRODUCTS.filter((p) => !wanted.includes(p))].slice(0, 3);
    heroes.forEach((p, i) => { $(`#hero-img-${i + 1}`).src = p.images[0]; });
    $$('[id^="hero-img-"]').forEach((img) => img.classList.toggle('hidden', !img.getAttribute('src')));
    const brands = [...new Set(PRODUCTS.map((p) => p.brand))].filter((b) => b !== 'Otras' && b !== 'Genérico');
    const row = brands.map((b) => `<span>${esc(b)}</span><span class="text-bronze">✦</span>`).join('');
    $('#brand-marquee').innerHTML = row.repeat(Math.max(2, Math.ceil(8 / Math.max(brands.length, 1))) * 2);
    $('#brand-marquee').parentElement.classList.toggle('hidden', !brands.length);
    $('#stat-count').textContent = PRODUCTS.length;
    $('#hero-count').textContent = plural(PRODUCTS.length);
    $('#stat-brands').textContent = brands.length;
    $('#stat-min').textContent = PRODUCTS.length ? fmt(Math.min(...PRODUCTS.map((p) => p.price))) : '';
    // Instagram: primero la sección actual, luego el resto de la tienda.
    const ig = [...PRODUCTS, ...ALL.filter((p) => p.section !== PAGE.section)].filter((p) => p.images.length > 1).slice(0, 6);
    $('#ig-grid').innerHTML = ig.map((p) => `<a href="${CONFIG.instagram}" target="_blank" rel="noopener" class="group relative aspect-square overflow-hidden rounded-2xl bg-white" aria-label="Ver en Instagram"><img class="h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-110" src="${p.images[1]}" alt="${esc(p.name)}" loading="lazy" /><span class="absolute inset-0 grid place-items-center bg-ink/50 opacity-0 transition-opacity group-hover:opacity-100"><i data-lucide="instagram" class="h-6 w-6 text-white"></i></span></a>`).join('');
    // Secciones sin productos todavía: se muestra el aviso de "próximamente".
    $$('[data-if-products]').forEach((el) => el.classList.toggle('hidden', !PRODUCTS.length));
    $$('[data-if-empty]').forEach((el) => el.classList.toggle('hidden', !!PRODUCTS.length));
    $('#year').textContent = new Date().getFullYear();
  };

  /* =========================================================
     ARRANQUE
     ========================================================= */
  const start = () => {
    Layer.init();
    const cart = new Cart();
    const modal = new ProductModal(cart);
    if (PRODUCTS.length) new Catalog(cart, modal);
    $('#search-jump').addEventListener('click', () => {
      $('#catalogo').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      if (PRODUCTS.length) setTimeout(() => $('#search').focus({ preventScroll: true }), reduced ? 0 : 500);
    });
    new CartDrawer(cart);
    const nav = new Layer($('#mobile-nav'), { trigger: $('#nav-toggle') });
    $('#nav-toggle').addEventListener('click', (e) => nav.open(e.currentTarget));
    $$('[data-close-nav]').forEach((a) => a.addEventListener('click', () => nav.close()));
    decorate();
    effects();
    icons();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();})();
