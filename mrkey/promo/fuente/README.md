# Video promocional de Mr Key (1 min, 9:16)

Todo se genera desde código, sin material con derechos de autor:

- `script.json`: guion de la voz en off (voz neural es-MX-JorgeNeural vía `edge-tts`).
- `timeline.py`: mide cada locución y arma la línea de tiempo alineada a 120 BPM (`timeline.json`).
- `promo.html`: la animación (titulares, cámara, teléfonos en 3D, barridos, grano); `renderAt(t)` dibuja cualquier instante y define los efectos de sonido (`window.SFX`).
- `music.py`: arreglo de jazz en MIDI (contrabajo, piano, batería de escobillas, sax tenor, vibráfono) tocado con FluidSynth y el banco FluidR3_GM (`apt install fluidsynth fluid-soundfont-gm`).
- `mix.py`: efectos de sonido sintetizados, baja la música cuando habla la voz y mezcla.
- `render.js`: captura los cuadros con Playwright y codifica el MP4 con ffmpeg.

Orden: `edge-tts` por escena → `python timeline.py` → `node preview.js` (genera `sfx.json`) → `python music.py` → `python mix.py` + loudnorm a −14 LUFS → `node render.js`.
