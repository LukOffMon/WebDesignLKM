"""Optimiza los posters después de render.cjs.

- Cuantiza cada PNG a 256 colores con tramado (≈ la mitad de peso, sin diferencia visible).
- Crea miniaturas WebP para la cuadrícula del sitio (posters/thumb/, posters/story/thumb/).
- Rehace posters/cantina-real-posters.zip.

Uso (desde cantina-real/):  python _tools/optimize.py
"""
import glob
import os
import zipfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTERS = os.path.join(ROOT, "posters")


def optimize(folder):
    os.makedirs(os.path.join(folder, "thumb"), exist_ok=True)
    for path in sorted(glob.glob(os.path.join(folder, "*.png"))):
        im = Image.open(path).convert("RGB")
        thumb = im.copy()
        thumb.thumbnail((420, 760))
        thumb.save(os.path.join(folder, "thumb", os.path.basename(path)[:-4] + ".webp"), quality=80, method=6)
        if Image.open(path).mode != "P":
            im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(path, optimize=True)


optimize(POSTERS)
optimize(os.path.join(POSTERS, "story"))

with zipfile.ZipFile(os.path.join(POSTERS, "cantina-real-posters.zip"), "w", zipfile.ZIP_STORED) as z:
    for path in sorted(glob.glob(os.path.join(POSTERS, "*.png"))):
        z.write(path, "post-4x5/" + os.path.basename(path))
    for path in sorted(glob.glob(os.path.join(POSTERS, "story", "*.png"))):
        z.write(path, "historia-9x16/" + os.path.basename(path))
print("ok")
