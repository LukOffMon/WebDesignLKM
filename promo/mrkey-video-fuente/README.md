# Fuente del video de Mr Key

Todo el video se genera con código: cada cuadro es una función del tiempo (`seek(t)` en `anim.html`), así que la animación siempre queda sincronizada con la voz.

Requisitos: Node 18+, Python 3 con `numpy`, `soundfile` y `sherpa-onnx<1.13`, `ffmpeg`, y Playwright con Chromium.

```bash
npm i playwright qrcode-generator@1.4.4
# Voz (Piper es_MX vía sherpa-onnx)
curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-es_MX-claude-high.tar.bz2
tar xjf vits-piper-es_MX-claude-high.tar.bz2
```

1. Edita los textos en `script.json`.
2. Genera la voz y los tiempos (cada frase se coloca según su duración real):
   ```bash
   python3 - <<'PY'
   import json, subprocess
   sc = json.load(open("script.json")); t = 0.35; out = []
   for s in sc:
       if s["id"] == "s7": t = max(t, 30.4)
       d = float(subprocess.check_output(["python3", "tts.py", "vits-piper-es_MX-claude-high", s["text"], f"{s['id']}.wav", "1.06"]).decode().split()[-1])
       out.append({**s, "start": round(t, 2), "dur": round(d, 2)}); t += d + 0.38
   json.dump(out, open("timing.json", "w"), ensure_ascii=False, indent=1)
   PY
   ```
3. `python3 build.py` (crea `built.html` con los tiempos) y `node dump_sfx.js` (exporta los efectos).
4. `python3 audio.py` y mezcla:
   ```bash
   ffmpeg -y -i voice.wav -i music.wav -i sfx.wav -filter_complex "[0:a]highpass=f=85,equalizer=f=200:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=3,acompressor=threshold=-20dB:ratio=3.5:attack=5:release=120:makeup=4,aecho=0.8:0.5:28:0.12,asplit=2[v][vsc];[1:a]volume=0.45[m];[m][vsc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[md];[2:a]volume=0.55[fx];[v][md][fx]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=9[out]" -map "[out]" -ar 48000 -ac 2 -t 60 mix.wav
   ```
5. `node render.js` → `mrkey_video.mp4` (1,800 cuadros, unos 2 minutos).

Para ver una escena sin renderizar todo, abre `built.html` en el navegador y ejecuta `seek(16.8)` en la consola.
