"""QR personalizado de El Temorense.

Uso (desde la raíz del repo): python3 el-temorense/entrega/src/qr.py
Requiere: pip install qrcode pillow

Escribe:
  el-temorense/qr/qr-estilo.png    QR con su logo al centro, módulos redondeados y sus colores (1000 px)
  el-temorense/qr/og.jpg           vista previa 1200x630 para WhatsApp de la página del QR
  el-temorense/qr.png              QR simple (1200 px), por si la imprenta lo pide sin adornos
  el-temorense/entrega/qr.svg      QR vectorial para imprenta
  el-temorense/entrega/qr.png      copia del QR personalizado para el kit
Corrección de errores H: el logo tapa ~20 % del centro y el código se sigue leyendo.
"""
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import SolidFillColorMask
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer

URL = "https://lukoffmon.github.io/WebDesignLKM/el-temorense/"
SITE = Path(__file__).resolve().parents[2]
INK = (42, 23, 6)        # café de la marca (#2a1706): contraste 16:1 sobre blanco
EYE = (158, 42, 31)      # rojo chile oscuro (#9e2a1f) para los ojos del QR
GOLD = (236, 179, 84)    # dorado (#ecb354) del sitio
BS, BD = 20, 3


def font(size, bold=False):
    for f in (["DejaVuSerif-Bold.ttf", "LiberationSerif-Bold.ttf"] if bold else ["DejaVuSans.ttf", "LiberationSans-Regular.ttf"]):
        for d in ("/usr/share/fonts/truetype/dejavu/", "/usr/share/fonts/truetype/liberation/", ""):
            try:
                return ImageFont.truetype(d + f, size)
            except OSError:
                pass
    return ImageFont.load_default()


def styled():
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=BS, border=BD)
    q.add_data(URL)
    q.make(fit=True)
    img = q.make_image(image_factory=StyledPilImage, module_drawer=RoundedModuleDrawer(radius_ratio=1),
                       color_mask=SolidFillColorMask(back_color=(255, 255, 255), front_color=INK)).convert("RGB")
    d, n = ImageDraw.Draw(img), q.modules_count
    for ox, oy in ((0, 0), (n - 7, 0), (0, n - 7)):
        x0, y0 = (BD + ox) * BS, (BD + oy) * BS
        d.rectangle([x0, y0, x0 + 7 * BS - 1, y0 + 7 * BS - 1], fill="white")
        d.rounded_rectangle([x0, y0, x0 + 7 * BS - 1, y0 + 7 * BS - 1], radius=int(BS * 2.2), fill=INK)
        d.rounded_rectangle([x0 + BS, y0 + BS, x0 + 6 * BS - 1, y0 + 6 * BS - 1], radius=int(BS * 1.5), fill="white")
        d.rounded_rectangle([x0 + 2 * BS, y0 + 2 * BS, x0 + 5 * BS - 1, y0 + 5 * BS - 1], radius=int(BS * 1.0), fill=EYE)
    # Logo real al centro, en círculo con aro dorado.
    W = img.size[0]
    c, rad = W / 2, W * 0.105
    d.ellipse([c - rad - 14, c - rad - 14, c + rad + 14, c + rad + 14], fill="white")
    d.ellipse([c - rad - 4, c - rad - 4, c + rad + 4, c + rad + 4], fill=GOLD)
    logo = Image.open(SITE / "img" / "icon-512.png").convert("RGB").resize((int(rad * 2), int(rad * 2)), Image.LANCZOS)
    mask = Image.new("L", logo.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, logo.size[0] - 1, logo.size[1] - 1], fill=255)
    img.paste(logo, (int(c - rad), int(c - rad)), mask)
    return q, img.resize((1000, 1000), Image.LANCZOS)


def og(qr):
    img = Image.new("RGB", (1200, 630), (27, 17, 12))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([60, 55, 580, 575], radius=36, fill="white")
    img.paste(qr.resize((480, 480), Image.LANCZOS), (80, 75))
    x = 640
    d.text((x, 120), "CÓDIGO QR · MENÚ Y PEDIDOS", font=font(24), fill=GOLD)
    d.text((x, 175), "El Temorense", font=font(64, True), fill=(245, 232, 214))
    d.text((x, 255), "Sabor de la Sierra", font=font(34), fill=GOLD)
    y = 330
    for line in ["Escanéalo con la cámara:", "su carta completa con fotos", "y pedidos por WhatsApp."]:
        d.text((x, y), line, font=font(32), fill=(245, 232, 214))
        y += 46
    d.text((x, 540), "Listo para mesas, bolsas y volantes", font=font(24), fill=GOLD)
    img.save(SITE / "qr" / "og.jpg", quality=86, optimize=True)


def simple(q):
    m = q.get_matrix()
    n = len(m)
    path = "".join(f"M{x} {y}h1v1h-1z" for y, row in enumerate(m) for x, on in enumerate(row) if on)
    (SITE / "entrega" / "qr.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges">'
        f'<rect width="{n}" height="{n}" fill="#fff"/><path fill="#2a1706" d="{path}"/></svg>', encoding="utf-8")
    s = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, box_size=10, border=2)
    s.add_data(URL)
    s.make(fit=True)
    s.make_image(fill_color="#2a1706", back_color="white").convert("RGB").resize((1200, 1200), Image.NEAREST).save(SITE / "qr.png", optimize=True)


if __name__ == "__main__":
    (SITE / "qr").mkdir(exist_ok=True)
    q, img = styled()
    img.save(SITE / "qr" / "qr-estilo.png", optimize=True)
    img.save(SITE / "entrega" / "qr.png", optimize=True)
    og(img)
    simple(q)
    print(f"QR -> {URL} ({q.modules_count}x{q.modules_count} módulos, corrección H)")
