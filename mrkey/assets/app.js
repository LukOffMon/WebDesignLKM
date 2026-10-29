// Mr Key: utilidades compartidas por todas las páginas.
(function () {
  const API = "https://lsvyryanshcuysowlysp.supabase.co/functions/v1/mrkey/api";
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
    return d === 1 ? "ayer" : `hace ${d} días`;
  }

  const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);

  // Sello de goma: aro doble y estrella, con borde irregular de tinta y un giro distinto en cada casilla.
  function ensureInkFilter() {
    if (document.getElementById("mk-ink")) return;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    defs.setAttribute("width", "0");
    defs.setAttribute("height", "0");
    defs.setAttribute("aria-hidden", "true");
    defs.style.position = "absolute";
    defs.innerHTML = `<filter id="mk-ink" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6"/></filter>`;
    document.body.appendChild(defs);
  }
  function stampSvg(i) {
    const turn = ((i * 47) % 31) - 15;
    return `<svg viewBox="0 0 40 40" aria-hidden="true" style="transform:rotate(${turn}deg)"><g filter="url(#mk-ink)" fill="none" stroke="currentColor">
      <circle cx="20" cy="20" r="17" stroke-width="2.6"/><circle cx="20" cy="20" r="13" stroke-width="1.1" stroke-dasharray="2 1.6"/>
      <path d="M20 11.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L20 24.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" fill="currentColor" stroke="none"/></g></svg>`;
  }

  // Dibuja la tarjeta de lealtad tal como se ve en Wallet.
  function renderCard(el, m, card, { qr = true, popIndex = -1 } = {}) {
    ensureInkFilter();
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
      dots += `<div class="stamp${on ? " on" : ""}${i === popIndex ? " pop" : ""}">${on ? stampSvg(i) : ""}</div>`;
    }
    const cols = total <= 6 ? total : total <= 10 ? 5 : 6;
    el.innerHTML = `
      <div class="top">
        <div class="brand">${brand}</div>
        <div class="right"><div class="lbl">Premios</div><div class="val">${card ? card.rewards_available : 0}</div></div>
      </div>
      <div class="stamps" style="grid-template-columns:repeat(${cols},1fr)" role="img" aria-label="${stamps} de ${total} sellos">${dots}</div>
      <div class="meta">
        <div><div class="lbl">Recompensa</div><div class="val">${esc(m.reward_text)}</div></div>
        <div class="right"><div class="lbl">Sellos</div><div class="val">${stamps} de ${total}</div></div>
      </div>
      ${card ? `<div class="meta" style="margin-top:10px"><div><div class="lbl">Cliente</div><div class="val">${esc(card.name.split(" ")[0])}</div></div></div>` : ""}
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

  window.MK = { API, BASE, api, store, esc, qrSvg, toast, ago, money, renderCard, imageToPng, stampSvg: (i) => (ensureInkFilter(), stampSvg(i)) };
})();
