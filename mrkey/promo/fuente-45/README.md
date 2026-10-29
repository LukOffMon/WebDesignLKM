# Video de Mr Key (45 s, 9:16)

Video vertical de 1080×1920 con el diseño actual (cartulina, tinta violeta, Archivo). Todo se genera con código, sin material con derechos de autor, y usa las mismas tarjetas que la web (`../../assets/app.js` y `styles.css`).

- `script.json`: guion de la voz en off.
- `tts.py`: genera la voz con `edge-tts` (voz neural es-MX-JorgeNeural, +12 %).
- `timeline.py`: mide cada locución y arma una línea de tiempo de exactamente 45 s (`timeline.json`).
- `promo.html`: la animación; `renderAt(t)` dibuja cualquier instante y define los efectos de sonido (`window.SFX`).
- `music.py`: pop-funk a 124 BPM en MIDI (contenido en el problema, completo desde el logo), tocado con FluidSynth y FluidR3_GM (`apt install fluidsynth fluid-soundfont-gm`).
- `mix.py`: efectos sintetizados, baja la música cuando habla la voz y mezcla.
- `render.js`: captura los cuadros con Playwright y codifica el MP4 con ffmpeg.

Orden:

```bash
python3 tts.py
python3 timeline.py
node preview.js 1           # escribe sfx.json; agrega segundos para ver cuadros en prev/
python3 music.py
python3 mix.py
ffmpeg -y -f f32le -ar 44100 -ac 2 -i mix.f32 -af loudnorm=I=-14:TP=-1.5:LRA=11 mix.wav
node render.js              # → mrkey-promo-45s.mp4
```

El video no muestra enlaces; el cierre lleva el WhatsApp 449 209 4034.
