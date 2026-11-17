import json, math, subprocess
script = json.load(open("script.json"))
display = {
 "s3": "Por eso existe: Mr Key.",
 "s5": "Escanea tu código QR, y en 20 segundos ya es tu cliente frecuente.",
 "s7": "Y lo mejor: Mr Key detecta quién dejó de venir, y le manda una promo directo a su pantalla de bloqueo. Sin pagar SMS.",
 "s9": "Mr Key. Tus clientes regresan… en automático. Pruébalo gratis hoy.",
}
extra = {"s3": 0.9, "s9": 2.3}
BEAT = 0.5
t, scenes = 1.0, []   # 2 tiempos de entrada musical
for k, text in script:
    d = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"vo/{k}.mp3"],capture_output=True,text=True).stdout)
    dur = math.ceil((d + 0.35 + extra.get(k, 0)) / BEAT) * BEAT   # múltiplos de un tiempo
    scenes.append({"id": k, "start": t, "dur": dur, "vo": round(d, 3), "voStart": round(t + 0.15, 3), "text": display.get(k, text)})
    t += dur
json.dump({"scenes": scenes, "total": t + 0.5, "fps": 30, "bpm": 120}, open("timeline.json","w"), ensure_ascii=False, indent=1)
print(t + 0.5); [print(s["id"], s["start"], s["dur"]) for s in scenes]
