# Mide cada locución y arma una línea de tiempo de exactamente 45 s (timeline.json).
import json, subprocess
TOTAL, INTRO, OUTRO = 45.0, 0.6, 0.4
EXTRA = {"s3": 0.7, "s9": 1.3}  # respiro para el logo y el cierre
display = {
    "s3": "Conoce Mr Key.",
    "s9": "Mr Key. La tarjeta que nadie pierde. Pruébala gratis hoy.",
}
script = json.load(open("script.json"))
vo = {k: float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"vo/{k}.mp3"],
                              capture_output=True, text=True).stdout) for k, _ in script}
slack = TOTAL - INTRO - OUTRO - sum(vo.values()) - sum(EXTRA.values())
pad = slack / len(script)
assert pad > 0.15, f"el guion no cabe en {TOTAL} s (relleno {pad:.2f})"
t, scenes = INTRO, []
for k, text in script:
    dur = round(vo[k] + pad + EXTRA.get(k, 0), 3)
    scenes.append({"id": k, "start": round(t, 3), "dur": dur, "vo": round(vo[k], 3), "voStart": round(t + 0.08, 3), "text": display.get(k, text)})
    t += dur
scenes[-1]["dur"] = round(TOTAL - scenes[-1]["start"], 3)  # el cierre se queda hasta el final
json.dump({"scenes": scenes, "total": TOTAL, "fps": 30, "bpm": 124}, open("timeline.json", "w"), ensure_ascii=False, indent=1)
print(f"relleno por escena {pad:.2f}s, fin {t:.2f}s")
for s in scenes: print(s["id"], s["start"], s["dur"])
