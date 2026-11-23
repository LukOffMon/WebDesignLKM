"""QR del menú de El Temorense.

Uso: python3 el-temorense/entrega/src/qr.py
Escribe entrega/qr.svg (para imprenta) y entrega/qr.png (1200 px).
Requiere: pip install qrcode pillow
"""
from pathlib import Path

import qrcode
import qrcode.image.svg

URL = "https://lukoffmon.github.io/WebDesignLKM/el-temorense/"
INK = "#1b110c"
OUT = Path(__file__).resolve().parent.parent


def build():
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, box_size=10, border=2)
    q.add_data(URL)
    q.make(fit=True)
    matrix = q.get_matrix()  # ya incluye el borde
    n = len(matrix)
    rects = []
    for y, row in enumerate(matrix):
        for x, on in enumerate(row):
            if on:
                rects.append(f"M{x} {y}h1v1h-1z")
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges">'
           f'<rect width="{n}" height="{n}" fill="#fff"/><path fill="{INK}" d="{"".join(rects)}"/></svg>')
    (OUT / "qr.svg").write_text(svg, encoding="utf-8")
    img = q.make_image(fill_color=INK, back_color="white").convert("RGB")
    img = img.resize((1200, 1200), resample=0)
    img.save(OUT / "qr.png", optimize=True)
    print(f"QR -> {URL} ({q.modules_count}x{q.modules_count} módulos)")


if __name__ == "__main__":
    build()
