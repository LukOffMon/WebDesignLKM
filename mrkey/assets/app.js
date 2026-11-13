// Mr Key: utilidades compartidas por todas las páginas.
(function () {
  const PROD_API = "https://lsvyryanshcuysowlysp.supabase.co/functions/v1/mrkey/api";
  // En desarrollo local (localhost) se puede apuntar a otra API con ?api=… (se recuerda en este navegador).
  const API = (() => {
    if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return PROD_API;
    try {
      const q = new URLSearchParams(location.search).get("api");
      if (q) localStorage.setItem("mk_api", q);
      return localStorage.getItem("mk_api") || PROD_API;
    } catch (_) {
      return PROD_API;
    }
  })();
  const BASE = new URL(".", location.href.replace(/[?#].*$/, "")).href;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (_) {
      return null;
    }
  }

  async function api(path, { method = "GET", body, token } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    let res;
    try {
      res = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (_) {
      throw Object.assign(new Error("Sin conexión. Revisa tu internet e intenta de nuevo."), { status: 0 });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status });
    return data;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function qrSvg(text, cell = 4) {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: cell, margin: 0, scalable: true });
  }

  let toastTimer;
  function toast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  }

  function ago(iso) {
    if (!iso) return "nunca";
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "hace un momento";
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
    if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
    const d = Math.floor(s / 86400);
    if (d === 1) return "ayer";
    if (d < 60) return `hace ${d} días`;
    const mo = Math.floor(d / 30);
    return mo < 12 ? `hace ${mo} meses` : `hace ${Math.floor(d / 365)} año(s)`;
  }

  const dateFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });
  const timeFmt = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" });
  const dateTimeFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const fmtDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : "—");
  const fmtTime = (iso) => (iso ? timeFmt.format(new Date(iso)) : "—");
  const fmtDateTime = (iso) => (iso ? dateTimeFmt.format(new Date(iso)) : "—");

  // 4491234567 -> 449 123 4567
  function phoneFmt(p) {
    const d = String(p ?? "").replace(/\D/g, "");
    if (d.length === 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    if (d.length === 12 && d.startsWith("52")) return `+52 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
    return d;
  }
  function waLink(phone, text) {
    const d = String(phone ?? "").replace(/\D/g, "");
    const full = d.length === 10 ? "52" + d : d;
    return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  }
  const cardUrl = (serial) => `${BASE}tarjeta.html?s=${encodeURIComponent(serial)}`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // Hoja inferior reutilizable (en escritorio se ve como ventana centrada).
  let sheetEl, backdropEl, sheetOnClose = null;
  function ensureSheet() {
    if (sheetEl) return;
    backdropEl = document.createElement("div");
    backdropEl.className = "backdrop";
    sheetEl = document.createElement("div");
    sheetEl.className = "sheet";
    sheetEl.setAttribute("role", "dialog");
    sheetEl.setAttribute("aria-modal", "true");
    sheetEl.tabIndex = -1;
    document.body.append(backdropEl, sheetEl);
    backdropEl.addEventListener("click", () => closeSheet());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sheetEl.classList.contains("open") && !sheetEl.dataset.locked) closeSheet();
    });
  }
  function openSheet(html, { onClose = null, locked = false, label = "" } = {}) {
    ensureSheet();
    sheetEl.innerHTML = `${locked ? "" : '<button class="sheet-x" type="button" aria-label="Cerrar">×</button>'}<div class="stack sheet-body">${html}</div>`;
    sheetEl.dataset.locked = locked ? "1" : "";
    backdropEl.dataset.locked = locked ? "1" : "";
    if (label) sheetEl.setAttribute("aria-label", label);
    sheetEl.querySelector(".sheet-x")?.addEventListener("click", () => closeSheet());
    sheetOnClose = onClose;
    sheetEl.scrollTop = 0;
    requestAnimationFrame(() => {
      sheetEl.classList.add("open");
      backdropEl.classList.add("open");
      sheetEl.focus({ preventScroll: true });
    });
    return sheetEl;
  }
  function closeSheet(force = false) {
    if (!sheetEl || !sheetEl.classList.contains("open")) return;
    if (!force && sheetEl.dataset.locked) return;
    sheetEl.classList.remove("open");
    backdropEl.classList.remove("open");
    const cb = sheetOnClose;
    sheetOnClose = null;
    if (cb) cb();
  }
  const sheetOpen = () => !!sheetEl && sheetEl.classList.contains("open");
  const q = (sel) => sheetEl?.querySelector(sel);

  // Confirmación con botones grandes; devuelve true/false.
  function confirm({ title, text = "", ok = "Confirmar", cancel = "Cancelar", danger = false, icon = "" }) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => {
        if (done) return;
        done = true;
        resolve(v);
      };
      openSheet(`
        ${icon ? `<div class="big-check">${icon}</div>` : ""}
        <h2 style="font-size:1.5rem">${title}</h2>
        ${text ? `<p class="mute">${text}</p>` : ""}
        <button class="btn ${danger ? "danger-solid" : "gold"} block" data-ok type="button">${ok}</button>
        <button class="btn ghost block" data-cancel type="button">${cancel}</button>`, { onClose: () => finish(false) });
      q("[data-ok]").onclick = () => {
        finish(true);
        closeSheet();
      };
      q("[data-cancel]").onclick = () => closeSheet();
    });
  }

  async function copyText(text, okMsg = "Copiado") {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg);
    } catch (_) {
      window.prompt("Copia este texto:", text);
    }
  }

  const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);

  // Dibuja la tarjeta de lealtad tal como se ve en Wallet.
  function renderCard(el, m, card, { qr = true, popIndex = -1 } = {}) {
    const total = m.stamps_required;
    const stamps = card ? card.stamps : 0;
    el.className = "loyalty";
    el.style.setProperty("--c-bg", m.color_bg);
    el.style.setProperty("--c-fg", m.color_fg);
    el.style.setProperty("--c-acc", m.color_accent);
    const brand = m.logo_png ? `<img src="${m.logo_png}" alt="${esc(m.name)}">` : esc(m.name);
    let dots = "";
    for (let i = 0; i < total; i++) {
      const on = i < stamps;
      dots += `<div class="stamp${on ? " on" : ""}${i === popIndex ? " pop" : ""}">${on ? "★" : ""}</div>`;
    }
    const cols = total <= 6 ? total : total <= 10 ? 5 : 6;
    el.innerHTML = `
      <div class="top">
        <div class="brand">${brand}</div>
        <div class="right"><div class="lbl">Premios</div><div class="val">${card ? card.rewards_available : 0}</div></div>
      </div>
      <div class="stamps" style="grid-template-columns:repeat(${cols},1fr)">${dots}</div>
      <div class="meta">
        <div><div class="lbl">Recompensa</div><div class="val">${esc(m.reward_text)}</div></div>
        <div class="right"><div class="lbl">Sellos</div><div class="val">${stamps} de ${total}</div></div>
      </div>
      ${card ? `<div class="meta" style="margin-top:10px"><div><div class="lbl">Cliente</div><div class="val">${esc(card.name.split(" ")[0])}</div></div>${card.rewards_available ? `<div class="right"><div class="lbl">Estado</div><div class="val">🎁 Premio listo</div></div>` : ""}</div>` : ""}
      ${qr && card ? `<div class="qr">${qrSvg("MK:" + card.serial)}<div class="code">${esc(card.serial.slice(0, 8).toUpperCase())}</div></div>` : ""}`;
  }

  // Convierte una imagen subida en PNG redimensionado (para el logo y el icono del pase).
  function imageToPng(file, maxW, maxH, square = false) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        let w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        if (square) {
          canvas.width = canvas.height = maxW;
          const s = Math.min(maxW / img.width, maxW / img.height);
          w = img.width * s;
          h = img.height * s;
          canvas.getContext("2d").drawImage(img, (maxW - w) / 2, (maxW - h) / 2, w, h);
        } else {
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        }
        URL.revokeObjectURL(img.src);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen."));
      img.src = URL.createObjectURL(file);
    });
  }

  // Texto con lo que falta para el premio.
  function remainingText(m, card) {
    const left = m.stamps_required - (card?.stamps ?? 0);
    return left === 1 ? `Te falta 1 sello para: ${m.reward_text}` : `Te faltan ${left} sellos para: ${m.reward_text}`;
  }

  // Contraste WCAG entre dos colores #rrggbb (1 a 21).
  function contrast(a, b) {
    const lum = (hex) => {
      const n = parseInt(String(hex).slice(1), 16);
      const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    };
    const [x, y] = [lum(a), lum(b)].sort((p, r) => r - p);
    return (x + 0.05) / (y + 0.05);
  }

  window.MK = {
    API, BASE, api, store, esc, qrSvg, toast, ago, money, renderCard, imageToPng,
    fmtDate, fmtTime, fmtDateTime, phoneFmt, waLink, cardUrl, plural, remainingText, contrast,
    openSheet, closeSheet, sheetOpen, q, confirm, copyText,
  };
})();
