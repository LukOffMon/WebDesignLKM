#!/usr/bin/env python3
"""Genera los menús QR de prospectos.

Uso (desde la raíz del repo):
    python3 menus-qr/_tools/build.py            # construye todo
    python3 menus-qr/_tools/build.py --fetch    # vuelve a bajar los menús de Rappi antes

Lee  menus-qr/_tools/prospectos.json  (datos de cada restaurante y la oferta)
y    menus-qr/_tools/raw/<slug>.json  (menú tal como viene de Rappi).
Escribe menus-qr/<slug>/index.html, qr.png, tarjeta-mesa.png, img/*.webp
y el panel menus-qr/index.html con el mensaje y el contacto de cada uno.
Requiere: pip install qrcode pillow
"""
import concurrent.futures as cf
import hashlib
import html
import json
import re
import subprocess
import sys
import unicodedata
from urllib.parse import quote
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
CFG = json.loads((TOOLS / "prospectos.json").read_text(encoding="utf-8"))
IMG_CDN = "https://images.rappi.com.mx/products/{}?e=webp&d=360x360&q=68"

# Categorías que no son parte de la carta del restaurante (promos de Rappi o marcas virtuales).
DROP_CATS = {
    "*": ["promociones", "combos by coca cola", "extras"],
    "china-poblana": ["pizza tradicional", "pizza gourmet", "papas para compartir", "boneless", "hamburguesas",
                      "solo wings", "combos", "otros"],
    "matilda": ["almuerzos"],
    "los-agustines": ["promo desayuno chilaquiles"],
}
RENAME_CATS = {
    "Ensalada": "Ensaladas", "Sopa": "Sopas",
    "Filetes Ia Tu Gusto!": "Filetes a tu gusto", "Ninos": "Niños", "Salmon-Atun": "Salmón y atún",
    "Spagueti": "Espagueti", "Especialidad": "Especialidades", "Teppanyakis": "Teppanyaki", "Ceviche": "Ceviches",
    "Cockteles": "Cócteles", "Bebidas Frias": "Bebidas frías", "Cafe": "Café", "Entradas Frias": "Entradas frías",
    "Miche Litro 2x$130": "Micheladas", "Postres / Tortas": "Postres y tortas", "Novedades del Cheff": "Novedades del chef",
    "de la Cava": "De la cava", "Zarandeados Estilo mi Chaparra": "Zarandeados estilo Mi Chaparra",
}
# Menús donde Rappi tiene las descripciones revueltas entre platillos: se muestran solo nombre y precio.
NO_DESC = {"el-acuario"}
RENAME_BY_SLUG = {
    "hanaichi": {"Entradas Calientes": "Entradas", "Entradas Frias": "Entradas", "Arroz": "Arroz y noodles",
                 "Arroz Y Noodles": "Arroz y noodles", "Empanizados & Fritos": "Empanizados y fritos"},
}
SMALL = {"de", "del", "la", "las", "el", "los", "y", "con", "a", "al", "en", "o", "para", "por", "sin"}
DRINK = re.compile(r"bebid|^caf[eé]|cerve|vino|licor|refresco|coctelería|alcohol|cava|michelad", re.I)
FOOD_KEYS = ["cazuela", "taco", "tostada", "filete", "camar", "coctel", "cóctel", "sopa", "caldo", "enchilad", "chilaquil",
             "torta", "ensalad", "hamburg", "pizza", "quesadill", "mojarra", "ceviche", "aguachile", "agua chile", "pulpo",
             "salm", "arroz", "crepa", "hot cake", "omelet", "huevo", "pastel", "pay ", "flan", "café", "jugo", "arrachera",
             "chuleta", "pollo", "cerdo", "costilla", "burrito", "rollo", "nigiri", "pescado", "sope", "gordita", "panucho",
             "flauta", "mollete", "tamal", "pozole", "consom", "pasta", "espagueti", "pechuga", "milanesa", "atún", "atun",
             "papas", "nachos", "alitas", "boneless", "brownie", "helado", "pan "]


def slugify(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def tidy_name(s):
    s = re.sub(r"\s+", " ", (s or "").strip()).strip(".")
    if s.isupper() and len(s) > 3:
        s = s.title()
    words = s.split(" ")
    return " ".join(w.lower() if i and w.lower() in SMALL and w[:1].isupper() and w[1:].islower() else w
                    for i, w in enumerate(words))


def tidy_desc(s):
    s = re.sub(r"\s+", " ", (s or "").strip())
    words = [w for w in re.findall(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]+", s) if len(w) > 2]
    if words and sum(w[0].isupper() for w in words) / len(words) > 0.6:  # Texto Con Mayúsculas En Cada Palabra
        s = s[:1].upper() + s[1:].lower()
    return s


def desc_matches(name, desc):
    """Rappi a veces pega la descripción de otro platillo. Si el platillo nombra un ingrediente o tipo de plato
    y la descripción empieza hablando de otro distinto, la descripción se oculta."""
    n, d = name.lower(), desc.lower()
    nk = [k for k in FOOD_KEYS if k in n]
    if not nk:
        return True
    hits = sorted((d.find(k), -len(k), k) for k in FOOD_KEYS if k in d)
    if not hits:
        return True
    first = hits[0][2]
    return first in nk or any(first in k or k in first for k in nk)


def cat_rank(name):
    n = name.lower()
    if DRINK.search(n):
        return 9
    for rank, pat in [(0, r"desayun|hot cake|omelet|huevo|tostadas francesas|molletes|chilaquil|panader|frutas|pan$"),
                      (1, r"entrad|entremes|botan|antojit|del mercado|del comal|snack|para compartir"),
                      (2, r"sopa|caldo|ensalad|light|consom"),
                      (7, r"niñ|ninos|infantil"),
                      (8, r"postre|pastel|crepa|dulce|mole en pasta")]:
        if re.search(pat, n):
            return rank
    return 4


def clean_menu(slug, raw):
    drop = set(DROP_CATS["*"]) | set(DROP_CATS.get(slug, []))
    cats, seen, order = {}, set(), []
    for c in raw["menu"]:
        cname = RENAME_BY_SLUG.get(slug, {}).get(c["name"].strip()) or RENAME_CATS.get(c["name"].strip(), c["name"].strip())
        cname = cname[:1].upper() + cname[1:]
        if cname.lower() in drop or c["name"].strip().lower() in drop:
            continue
        for p in c["products"]:
            name = tidy_name(p["name"])
            price = p.get("price") or 0
            key = (name.lower(), price)
            if not name or key in seen:
                continue
            seen.add(key)
            desc = tidy_desc(p.get("desc"))
            if (slug in NO_DESC or len(desc.split()) < 2 or desc.lower().rstrip(".") == name.lower()
                    or not desc_matches(name, desc)):
                desc = ""
            if cname not in cats:
                cats[cname] = []
                order.append(cname)
            cats[cname].append({"name": name, "desc": desc, "price": price, "src": p.get("img")})
    pos = {c: i for i, c in enumerate(order)}
    order.sort(key=lambda c: (cat_rank(c), pos[c]))
    return [{"name": c, "items": cats[c]} for c in order if cats[c]]


def fetch_img(src, dest):
    if dest.exists() and dest.stat().st_size > 500:
        return True
    r = subprocess.run(["curl", "-sS", "-L", "-m", "40", "-o", str(dest), "-w", "%{http_code}", IMG_CDN.format(src)],
                       capture_output=True, text=True)
    ok = r.stdout.strip() == "200" and dest.exists() and dest.stat().st_size > 500
    if not ok and dest.exists():
        dest.unlink()
    return ok


def luminance(hexc):
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def fmt_tel(t):
    return f"{t[:2]} {t[2:6]} {t[6:]}" if t[:2] in ("55", "33", "81") else f"{t[:3]} {t[3:6]} {t[6:]}"


def money(n):
    return "${:,.0f}".format(n)


# ---------- página del menú ----------
ICON_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>'
ICON_TEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'
ICON_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>'
ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a8.1 8.1 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.4-.5.3-.5v-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.5 13.5 0 0 0 5.2 4.6c.7.3 1.3.5 1.7.6a4.2 4.2 0 0 0 1.9.1 3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3zM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.8 17.8L.2 23.8l6.1-1.6A11.8 11.8 0 0 0 12 23.6 11.8 11.8 0 0 0 20.4 3.6z"/></svg>'
ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'


def font_link(t):
    fams = []
    for f, w in ((t["titulo"], "600;700"), (t["texto"], "400;600;700;800")):
        q = f.replace(" ", "+") + ":wght@" + w
        if q not in fams:
            fams.append(q)
    return "https://fonts.googleapis.com/css2?" + "&".join("family=" + f for f in fams) + "&display=swap"


def render_menu(r, cats, url):
    t = r["tema"]
    on_acc = "#ffffff" if luminance(t["acc"]) < 0.45 else "#1a1a1a"
    wa = r.get("whatsapp") or r["tel"]
    data = {"nombre": r["nombre"], "whatsapp": wa, "horario": r.get("horario") or "",
            "cats": [{"name": c["name"], "items": [{k: v for k, v in it.items() if k in ("name", "desc", "price", "img") and v}
                                                    for it in c["items"]]} for c in cats]}
    n_items = sum(len(c["items"]) for c in cats)
    e = html.escape
    maps = "https://www.google.com/maps/search/?api=1&query=" + e(r["nombre"] + " " + r["direccion"]).replace(" ", "+")
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Menú · {e(r['nombre'])}</title>
<meta name="description" content="Menú digital de {e(r['nombre'])} ({e(r['ciudad'])}): {n_items} platillos con precios, fotos y pedido por WhatsApp.">
<meta name="robots" content="noindex">
<meta name="theme-color" content="{t['bg']}">
<meta property="og:title" content="Menú · {e(r['nombre'])}">
<meta property="og:description" content="{e(r['lema'])}">
<meta property="og:url" content="{url}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='{t['acc'].replace('#', '%23')}'/%3E%3Ctext x='32' y='44' font-size='34' text-anchor='middle' fill='{on_acc.replace('#', '%23')}' font-family='Georgia'%3E{e(r['nombre'][0])}%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{font_link(t)}">
<link rel="stylesheet" href="../assets/menu.css">
<style>:root{{--bg:{t['bg']};--fg:{t['fg']};--acc:{t['acc']};--card:{t['card']};--on-acc:{on_acc};--ft:'{t['titulo']}';--fb:'{t['texto']}';color-scheme:{'dark' if luminance(t['bg']) < .2 else 'light'}}}</style>
</head>
<body>
<div class="demo"><b>Muestra</b> preparada por LKM'r para {e(r['nombre'])} · precios de referencia tomados de Rappi ({e(CFG['fecha_menu'])}), se ajustan a los de salón.</div>
<header class="hero"><div class="wrap">
  <p class="kicker">Menú digital · {e(r['sucursal'])}</p>
  <h1>{e(r['nombre'])}</h1>
  <p class="lema">{e(r['lema'])}</p>
  <div class="meta">
    <span class="pill" id="status"></span>
    <a class="pill" href="{maps}" target="_blank" rel="noopener">{ICON_PIN}{e(r['ciudad'])}</a>
    <a class="pill" href="tel:+52{r['tel']}">{ICON_TEL}{fmt_tel(r['tel'])}</a>
    <button class="pill" id="share" type="button">{ICON_SHARE}Compartir</button>
  </div>
</div></header>
<div class="bar"><div class="wrap">
  <div class="search"><label>{ICON_SEARCH}<input id="q" type="search" placeholder="Buscar en {n_items} platillos…" autocomplete="off" aria-label="Buscar platillo"></label></div>
  <nav class="chips" id="chips" aria-label="Categorías"></nav>
</div></div>
<main class="wrap"><div id="list"></div><p class="empty" id="empty">No encontramos ese platillo. Prueba con otra palabra.</p></main>
<footer><div class="wrap">
  <span>{e(r['nombre'])} · {e(r['direccion'])}</span>
  <span>Los precios mostrados son de referencia y pueden cambiar. Confírmalos con tu mesero.</span>
  <span>Menú digital hecho por <a href="../">LKM'r</a>.</span>
</div></footer>
<button class="cartbar" id="cartbar" type="button"><span><span class="count" id="barcount">0</span>Ver mi pedido</span><span id="bartotal">$0</span></button>
<dialog id="cart" aria-labelledby="carttitle"><div class="sheet">
  <header><h2 id="carttitle">Tu pedido</h2><button class="x" id="close" type="button" aria-label="Cerrar">×</button></header>
  <div class="lines" id="lines"></div>
  <div class="total"><span>Total aprox.</span><span id="total">$0</span></div>
  <div class="two"><label class="field">Nombre<input id="who" autocomplete="name"></label><label class="field">Mesa o para llevar<input id="mesa" placeholder="Ej. mesa 4"></label></div>
  <label class="field">Notas<textarea id="notas" rows="2" placeholder="Sin cebolla, salsa aparte…"></textarea></label>
  <a class="send" id="send" href="#">{ICON_WA}Enviar pedido por WhatsApp</a>
  <p class="note">Se abre WhatsApp con tu pedido listo; el restaurante confirma total y tiempo.</p>
</div></dialog>
<div class="toast" id="toast" role="status"></div>
<script>window.MENU={json.dumps(data, ensure_ascii=False, separators=(',', ':'))};</script>
<script src="../assets/menu.js" defer></script>
</body>
</html>
"""


# ---------- QR y tarjeta de mesa ----------
def font(size, bold=False):
    names = ["DejaVuSerif-Bold.ttf" if bold else "DejaVuSans.ttf"]
    for n in names:
        for d in ("/usr/share/fonts/truetype/dejavu/",):
            p = Path(d + n)
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def make_qr(url, fg):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, box_size=20, border=2)
    q.add_data(url)
    q.make(fit=True)
    return q.make_image(fill_color=fg, back_color="white").convert("RGB")


def wrap_text(draw, text, fnt, width):
    lines, cur = [], ""
    for w in text.split():
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=fnt) <= width:
            cur = test
        else:
            lines.append(cur)
            cur = w
    return lines + [cur]


def make_card(r, qr_img, dest):
    t = r["tema"]
    W, H = 1200, 1700
    bg = t["bg"] if luminance(t["bg"]) < 0.2 else "#ffffff"
    fg = t["fg"] if luminance(t["bg"]) < 0.2 else "#1d1d1b"
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 26], fill=t["acc"])
    d.rectangle([0, H - 26, W, H], fill=t["acc"])
    f_k, f_t, f_s, f_x = font(34), font(86, True), font(44), font(30)
    y = 120
    d.text((W / 2, y), "MENÚ DIGITAL", font=f_k, fill=t["acc"], anchor="mm")
    y += 90
    for line in wrap_text(d, r["nombre"], f_t, W - 160):
        d.text((W / 2, y), line, font=f_t, fill=fg, anchor="mm")
        y += 104
    y += 30
    size = 820
    q = qr_img.resize((size, size), Image.NEAREST)
    pad = 34
    d.rounded_rectangle([(W - size) / 2 - pad, y - pad, (W + size) / 2 + pad, y + size + pad], radius=40, fill="white")
    img.paste(q, (int((W - size) / 2), int(y)))
    y += size + pad + 80
    d.text((W / 2, y), "Escanea con tu cámara para ver la carta", font=f_s, fill=fg, anchor="mm")
    y += 62
    d.text((W / 2, y), "y haz tu pedido por WhatsApp", font=f_s, fill=fg, anchor="mm")
    d.text((W / 2, H - 80), r["ciudad"], font=f_x, fill=t["acc"], anchor="mm")
    img.save(dest, optimize=True)


# ---------- mensaje de propuesta ----------
def mensaje(r, url, cats):
    of = CFG["oferta"]
    top = []
    for c in cats:
        for it in c["items"]:
            if it.get("img") and it["price"] and len(top) < 3 and cat_rank(c["name"]) in (1, 4):
                top.append(it["name"])
    platillos = ", ".join(top[:-1]) + " y " + top[-1] if len(top) > 1 else (top[0] if top else "sus platillos")
    return (f"Hola, buen día. ¿Hablo con {r['nombre']}?\n\n"
            f"Les escribo de LKM'r: hacemos menús digitales y páginas para restaurantes. Les preparé, sin costo, "
            f"una muestra de su menú con QR, ya con su carta ({platillos}, entre otros):\n"
            f"{url}\n\n"
            f"{r['gancho']}\n\n"
            "Cómo funciona: imprimen el QR para mesas y mostrador, el cliente lo escanea con la cámara y ve la carta "
            "con fotos, buscador y categorías. Puede armar su pedido y mandarlo directo a su WhatsApp. Es una página "
            "ligera, no un PDF borroso, y no hay que descargar nada.\n"
            f"Su QR ya está listo: {url}qr.png\n\n"
            f"{r['mejora']} Los precios de la muestra los tomé de Rappi; se los dejo con sus precios de salón.\n\n"
            f"Inversión: {money(of['instalacion'])} de instalación (menú + QR listos para imprimir) y "
            f"{money(of['mensualidad'])} al mes, con cambios de precios y platillos ilimitados.\n\n"
            "Si les gusta, lo dejo listo esta misma semana. ¿Con quién lo puedo platicar?")


# ---------- panel ----------
def render_panel(rows):
    e = html.escape
    of = CFG["oferta"]
    cards = []
    for i, (r, url, cats, msg) in enumerate(rows, 1):
        n = sum(len(c["items"]) for c in cats)
        wa = r.get("whatsapp") or r["tel"]
        alt = f'<div class="alt">Otro número: <a href="tel:+52{r["tel_alt"]}">{fmt_tel(r["tel_alt"])}</a></div>' if r.get("tel_alt") and r["tel_alt"] != wa else ""
        if r.get("whatsapp") and r["whatsapp"] != r["tel"]:
            alt = f'<div class="alt">Teléfono fijo: <a href="tel:+52{r["tel"]}">{fmt_tel(r["tel"])}</a></div>'
        cards.append(f"""
<article class="card" data-slug="{r['slug']}" style="--a:{r['tema']['acc']}">
  <header>
    <span class="num">{i:02d}</span>
    <div><h2>{e(r['nombre'])}</h2><p>{e(r['ciudad'])} · {e(r['sucursal'])}</p></div>
    <label class="done"><input type="checkbox"> Contactado</label>
  </header>
  <div class="body">
    <img class="qr" src="{r['slug']}/qr.png" alt="QR del menú de {e(r['nombre'])}" width="132" height="132" loading="lazy">
    <div class="info">
      <a class="phone" href="tel:+52{wa}">{fmt_tel(wa)}</a>{alt}
      <div class="conf">{e(r['confianza'])}</div>
      <div class="addr">{e(r['direccion'])}</div>
      <div class="stats">{n} platillos · {len(cats)} categorías · <a href="https://www.rappi.com.mx/restaurantes/{r['rappi']}" target="_blank" rel="noopener">fuente: Rappi</a></div>
    </div>
  </div>
  <div class="actions">
    <a class="btn wa" href="https://wa.me/52{wa}?text={e(quote(msg))}" target="_blank" rel="noopener">Abrir WhatsApp con el mensaje</a>
    <a class="btn" href="tel:+52{wa}">Llamar</a>
    <a class="btn" href="{r['slug']}/" target="_blank" rel="noopener">Ver menú</a>
    <button class="btn copy" type="button">Copiar mensaje</button>
    <a class="btn" href="{r['slug']}/tarjeta-mesa.png" download>Tarjeta de mesa</a>
    <a class="btn" href="{r['slug']}/qr.png" download>QR</a>
  </div>
  <details><summary>Ver mensaje</summary><pre class="msg">{e(msg)}</pre></details>
</article>""")
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prospectos Menú QR</title>
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;600;700&display=swap">
<style>
:root {{ --bg:#0c0d10; --fg:#ecebe6; --soft:#9a9a95; --card:#15171c; --line:#262931; --gold:#d8b14a; color-scheme: dark; }}
:root[data-theme="light"] {{ --bg:#f6f4ee; --fg:#1b1c1f; --soft:#66665f; --card:#fff; --line:#e3e0d6; --gold:#9a7412; color-scheme: light; }}
@media (prefers-color-scheme: light) {{ :root:not([data-theme="dark"]) {{ --bg:#f6f4ee; --fg:#1b1c1f; --soft:#66665f; --card:#fff; --line:#e3e0d6; --gold:#9a7412; color-scheme: light; }} }}
* {{ box-sizing: border-box; }}
body {{ margin:0; background:var(--bg); color:var(--fg); font:400 15px/1.5 Inter, system-ui, sans-serif; }}
.wrap {{ width:min(1180px, 100% - 32px); margin-inline:auto; }}
header.top {{ padding:40px 0 24px; }}
.kick {{ font:700 12px/1 'Space Grotesk', sans-serif; letter-spacing:.22em; text-transform:uppercase; color:var(--gold); }}
h1 {{ font:700 clamp(30px, 6vw, 48px)/1.05 'Space Grotesk', sans-serif; margin:12px 0 10px; }}
.lead {{ color:var(--soft); max-width:70ch; margin:0; }}
.sum {{ display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }}
.sum span {{ border:1px solid var(--line); background:var(--card); padding:8px 12px; border-radius:12px; font-size:14px; }}
.sum b {{ color:var(--gold); }}
.grid {{ display:grid; gap:16px; grid-template-columns:repeat(auto-fill, minmax(min(100%, 520px), 1fr)); padding-bottom:60px; }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:20px; padding:18px; display:grid; gap:14px; border-top:4px solid var(--a); }}
.card.is-done {{ opacity:.55; }}
.card header {{ display:flex; gap:12px; align-items:flex-start; }}
.num {{ font:700 13px/1 'Space Grotesk'; color:var(--soft); padding-top:6px; }}
.card h2 {{ font:700 21px/1.15 'Space Grotesk', sans-serif; margin:0; }}
.card header p {{ margin:2px 0 0; color:var(--soft); font-size:14px; }}
.done {{ margin-left:auto; display:flex; gap:6px; align-items:center; font-size:13px; color:var(--soft); white-space:nowrap; cursor:pointer; }}
.body {{ display:flex; gap:16px; align-items:flex-start; }}
.qr {{ width:132px; height:132px; border-radius:12px; background:#fff; flex:none; }}
.info {{ display:grid; gap:6px; min-width:0; }}
.phone {{ font:700 24px/1.1 'Space Grotesk', sans-serif; color:var(--fg); text-decoration:none; }}
.alt, .addr, .stats {{ font-size:13.5px; color:var(--soft); }}
.alt a, .stats a {{ color:inherit; }}
.conf {{ font-size:13px; border-left:3px solid var(--gold); padding-left:8px; }}
.actions {{ display:flex; flex-wrap:wrap; gap:8px; }}
.btn {{ border:1px solid var(--line); background:transparent; color:var(--fg); padding:9px 12px; border-radius:10px; font:600 13.5px Inter, sans-serif; text-decoration:none; cursor:pointer; }}
.btn.wa {{ background:#1fa855; border-color:#1fa855; color:#fff; }}
.btn:hover {{ border-color:var(--soft); }}
details summary {{ cursor:pointer; color:var(--soft); font-size:14px; }}
.msg {{ white-space:pre-wrap; font:400 14px/1.55 Inter, sans-serif; background:var(--bg); border:1px solid var(--line); border-radius:12px; padding:14px; margin:10px 0 0; }}
.how {{ border:1px solid var(--line); border-radius:16px; padding:16px 18px; margin:0 0 20px; background:var(--card); }}
.how ol {{ margin:8px 0 0; padding-left:20px; color:var(--soft); }}
.toast {{ position:fixed; left:50%; bottom:20px; transform:translate(-50%, 200%); background:var(--fg); color:var(--bg); padding:10px 16px; border-radius:999px; font-weight:700; transition:transform .3s; }}
.toast.show {{ transform:translate(-50%, 0); }}
@media (max-width:520px) {{ .body {{ flex-direction:column; }} .done {{ font-size:12px; }} }}
</style>
</head>
<body>
<header class="top wrap">
  <div class="kick">Maletín · Menús digitales y QR</div>
  <h1>12 restaurantes listos para contactar</h1>
  <p class="lead">Cada uno tiene su menú digital publicado, su QR y una tarjeta de mesa lista para imprimir. El botón verde abre WhatsApp con la propuesta ya escrita; si el número es fijo y no tiene WhatsApp, usa Llamar o copia el mensaje para Instagram o Facebook.</p>
  <div class="sum"><span>Oferta: <b>{money(of['instalacion'])}</b> instalación + <b>{money(of['mensualidad'])}</b>/mes</span><span>Menús tomados de Rappi el {e(CFG['fecha_menu'])}</span><span id="prog">0 de {len(rows)} contactados</span></div>
</header>
<main class="wrap">
  <div class="how"><b>Antes de enviar</b><ol>
    <li>Abre su menú y revisa que cargue bien en tu celular.</li>
    <li>Los números con confianza "Media" confírmalos con una llamada antes de mandar el mensaje.</li>
    <li>Cuando acepten: pídeles su carta de salón (foto o PDF) y su logo, y cambia el aviso de "Muestra" por su información real.</li>
  </ol></div>
  <div class="grid">{''.join(cards)}</div>
</main>
<div class="toast" id="toast" role="status">Mensaje copiado</div>
<script>
(() => {{
  const KEY = 'lkm-menuqr-contactados';
  let done = [];
  try {{ done = JSON.parse(localStorage.getItem(KEY) || '[]'); }} catch (_) {{}}
  const prog = document.getElementById('prog');
  const paint = () => {{
    document.querySelectorAll('.card').forEach(c => {{
      const on = done.includes(c.dataset.slug); c.classList.toggle('is-done', on); c.querySelector('.done input').checked = on;
    }});
    prog.textContent = done.length + ' de {len(rows)} contactados';
  }};
  document.querySelectorAll('.done input').forEach(i => i.addEventListener('change', () => {{
    const s = i.closest('.card').dataset.slug; done = i.checked ? [...new Set([...done, s])] : done.filter(x => x !== s);
    try {{ localStorage.setItem(KEY, JSON.stringify(done)); }} catch (_) {{}}
    paint();
  }}));
  paint();
  const toast = document.getElementById('toast');
  document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', async () => {{
    const t = b.closest('.card').querySelector('.msg').textContent;
    try {{ await navigator.clipboard.writeText(t); }} catch (_) {{
      const a = document.createElement('textarea'); a.value = t; document.body.append(a); a.select(); document.execCommand('copy'); a.remove();
    }}
    toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1600);
  }}));
}})();
</script>
</body>
</html>
"""


def update_portfolio(rows):
    """Escribe la sección MENÚS QR del portafolio (index.html de la raíz) entre sus marcadores."""
    page = ROOT.parent / "index.html"
    e = html.escape
    cards = []
    for r, url, cats, msg in rows:
        n = sum(len(c["items"]) for c in cats)
        thumb = next((it["img"] for c in cats if cat_rank(c["name"]) in (1, 4) for it in c["items"] if it.get("img")),
                     next((it["img"] for c in cats for it in c["items"] if it.get("img")), ""))
        cards.append(
            f'      <a class="card qr-card" href="menus-qr/{r['slug']}/">\n'
            f'        <div class="thumb" style="background-image:url(\'menus-qr/{r['slug']}/{thumb}\')"></div>\n'
            f'        <div class="body"><p class="tag" style="color:{r['tema']['acc'] if luminance(r['tema']['acc']) > .12 else '#d6b47a'}">{e(r['ciudad'])}</p>'
            f'<p class="name">{e(r['nombre'])}</p><p class="desc">{e(r['lema'])}. {n} platillos con foto, buscador y pedido por WhatsApp.</p>'
            f'<p class="go">Ver menú →</p></div>\n      </a>')
    block = ("<!-- MENUS-QR:START (lo genera menus-qr/_tools/build.py) -->\n"
             '    <section class="qr-sec" id="menus-qr">\n'
             '      <p class="eyebrow">Menús QR</p>\n'
             '      <h2>Menús digitales con QR para restaurantes.</h2>\n'
             f'      <p class="qr-lead">{len(rows)} muestras en {len(rows)} ciudades del país: carta con fotos, buscador, categorías y pedido directo por WhatsApp. Se imprime el QR para mesas y mostrador.</p>\n'
             '      <div class="grid">\n' + "\n".join(cards) + "\n      </div>\n    </section>\n"
             "    <!-- MENUS-QR:END -->")
    src = page.read_text(encoding="utf-8")
    if "<!-- MENUS-QR:START" in src:
        src = re.sub(r"<!-- MENUS-QR:START.*?<!-- MENUS-QR:END -->", lambda m: block, src, flags=re.S)
    else:
        src = src.replace("    <footer>", "    " + block + "\n    <footer>", 1)
    css = ("    .qr-sec { margin-top: 88px; padding-top: 40px; border-top: 1px solid var(--line); }\n"
           "    .qr-sec h2 { font-family: Fraunces, Georgia, serif; font-weight: 500; font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.05; margin: 14px 0 0; letter-spacing: -.02em; }\n"
           "    .qr-lead { color: var(--mute); max-width: 60ch; line-height: 1.6; margin: 14px 0 0; }\n"
           "    .qr-sec .grid { margin-top: 32px; }\n"
           "    .qr-card .thumb { aspect-ratio: 16/9; }\n")
    if ".qr-sec {" not in src:
        src = src.replace("  </style>", css + "  </style>", 1)
    page.write_text(src, encoding="utf-8")


def main():
    if "--fetch" in sys.argv:
        for r in CFG["restaurantes"]:
            subprocess.run([sys.executable, str(TOOLS / "rappi.py"), f"https://www.rappi.com.mx/restaurantes/{r['rappi']}",
                            str(TOOLS / "raw" / f"{r['slug']}.json")], check=True)
    rows, report = [], []
    for r in CFG["restaurantes"]:
        raw = json.loads((TOOLS / "raw" / f"{r['slug']}.json").read_text(encoding="utf-8"))
        r["horario"] = raw.get("schedule") or ""
        out = ROOT / r["slug"]
        (out / "img").mkdir(parents=True, exist_ok=True)
        cats = clean_menu(r["slug"], raw)
        jobs = {}
        for c in cats:
            for it in c["items"]:
                src = it.pop("src", None)
                if src:
                    name = hashlib.sha1(src.encode()).hexdigest()[:12] + ".webp"
                    jobs.setdefault(name, src)
                    it["img"] = "img/" + name
        with cf.ThreadPoolExecutor(8) as ex:
            ok = dict(zip(jobs, ex.map(lambda kv: fetch_img(kv[1], out / "img" / kv[0]), jobs.items())))
        for c in cats:
            for it in c["items"]:
                if it.get("img") and not ok.get(it["img"][4:]):
                    del it["img"]
        keep = {k for k, v in ok.items() if v}
        for f in (out / "img").glob("*.webp"):
            if f.name not in keep:
                f.unlink()
        url = CFG["base_url"] + r["slug"] + "/"
        (out / "index.html").write_text(render_menu(r, cats, url), encoding="utf-8")
        qr_img = make_qr(url, "#111111")
        qr_img.save(out / "qr.png", optimize=True)
        make_card(r, qr_img, out / "tarjeta-mesa.png")
        rows.append((r, url, cats, mensaje(r, url, cats)))
        report.append(f"{r['slug']:22} {sum(len(c['items']) for c in cats):4} platillos  {len(keep):3} fotos  {len(cats):2} categorías")
    (ROOT / "index.html").write_text(render_panel(rows), encoding="utf-8")
    update_portfolio(rows)
    md = ["# Prospectos · Menú digital y QR", "",
          f"Menús tomados de Rappi el {CFG['fecha_menu']}. Oferta: {money(CFG['oferta']['instalacion'])} de instalación + "
          f"{money(CFG['oferta']['mensualidad'])} al mes.", "",
          "| # | Restaurante | Ciudad | Teléfono | Confianza | Menú | QR |", "|---|---|---|---|---|---|---|"]
    for i, (r, url, cats, msg) in enumerate(rows, 1):
        wa = r.get("whatsapp") or r["tel"]
        md.append(f"| {i} | {r['nombre']} | {r['ciudad']} | [{fmt_tel(wa)}](https://wa.me/52{wa}) | {r['confianza'].split(':')[0]} | "
                  f"[{r['slug']}/]({url}) | [qr.png]({url}qr.png) |")
    md += ["", "## Mensajes", ""]
    for i, (r, url, cats, msg) in enumerate(rows, 1):
        md += [f"### {i}. {r['nombre']} · {r['ciudad']}", "",
               f"Teléfono: {fmt_tel(r.get('whatsapp') or r['tel'])}" + (f" (otro: {fmt_tel(r['tel_alt'])})" if r.get('tel_alt') else "") + f". {r['confianza']}", "",
               "```", msg, "```", ""]
    (ROOT / "PROSPECTOS.md").write_text("\n".join(md), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
