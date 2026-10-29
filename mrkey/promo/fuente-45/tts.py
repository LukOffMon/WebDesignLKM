# Genera la voz en off de cada escena con edge-tts (voz neural es-MX-JorgeNeural).
import asyncio, json, os
import certifi
if os.path.exists("/root/.ccr/ca-bundle.crt"):  # proxy de la sesión en la nube
    certifi.where = lambda: "/root/.ccr/ca-bundle.crt"
import edge_tts

async def main():
    for k, text in json.load(open("script.json")):
        c = edge_tts.Communicate(text, "es-MX-JorgeNeural", rate="+12%", proxy=os.environ.get("HTTPS_PROXY"))
        await c.save(f"vo/{k}.mp3")
asyncio.run(main())
