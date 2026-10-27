# Video promocional de Mr Key (60 s, 9:16)

Todo se genera desde código, sin material con derechos de autor:

- `script.json`: guion de la voz en off (voz neural es-MX-JorgeNeural vía `edge-tts`).
- `timeline.py`: mide cada locución y arma la línea de tiempo (`timeline.json`).
- `promo.html`: la animación; `renderAt(t)` dibuja cualquier instante y define los efectos de sonido (`window.SFX`).
- `mix.py`: sintetiza la música jazz (contrabajo, piano eléctrico, ride, escobillas, vibráfono) y los efectos, baja la música cuando habla la voz y mezcla.
- `render.js`: captura los 1,908 cuadros con Playwright y codifica el MP4 con ffmpeg.

Orden: `edge-tts` por escena → `python timeline.py` → `node preview.js` (genera `sfx.json`) → `python mix.py` + loudnorm a −14 LUFS → `node render.js`.
