import json, subprocess
script = json.load(open("script.json"))
display = {  # texto en pantalla (subtítulos)
 "s3": "Te presentamos: Mr Key.",
 "s7": "Lo mejor: Mr Key detecta quién dejó de venir, y le manda una promo directo a su pantalla de bloqueo. Sin pagar SMS.",
 "s9": "Mr Key. Tus clientes regresan, en automático. Pruébalo gratis 14 días.",
 "s5": "Tu cliente escanea tu código QR, y en 20 segundos ya tiene su tarjeta.",
}
extra = {"s3": 1.1, "s9": 1.8}
t, scenes = 0.6, []
for k, text in script:
    d = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"vo/{k}.mp3"],capture_output=True,text=True).stdout)
    dur = d + 0.45 + extra.get(k, 0)
    scenes.append({"id": k, "start": round(t,3), "dur": round(dur,3), "vo": round(d,3), "voStart": round(t+0.12,3), "text": display.get(k, text)})
    t += dur
json.dump({"scenes": scenes, "total": round(t + 0.2, 3), "fps": 30}, open("timeline.json","w"), ensure_ascii=False, indent=1)
print(round(t+0.2,2)); [print(s["id"], s["start"], s["dur"]) for s in scenes]
