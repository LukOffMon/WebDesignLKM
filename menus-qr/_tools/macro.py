#!/usr/bin/env python3
"""Datos de los prospectos para el macro de ventas (LKMLPR/mensajes).

Uso (desde la raíz del repo, después de build.py):
    python3 menus-qr/_tools/macro.py                              # escribe menus-qr/macro.json
    python3 menus-qr/_tools/macro.py --macro ../LKMLPR/mensajes/index.html   # y actualiza PRESETS del macro

Cada prospecto lleva `q` (medidas del estándar de excelencia, leídas del menú ya generado) y `alta`
(fecha en que se agregó). El macro avisa de los prospectos nuevos al entrar y, en línea, lee
menus-qr/macro.json para sumar los que se publiquen después sin tener que editar el macro.
"""
import json
import re
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
CFG = json.loads((TOOLS / "prospectos.json").read_text(encoding="utf-8"))
TIPO = {"desayunos": "restaurante de desayunos", "taqueria": "taquería", "mariscos": "marisquería"}
ORDEN = {"whatsapp_oficial": 0, "numero_propio": 1, "directorio": 2, "solo_telefono": 3}


def calidad(slug):
    """Medidas del menú publicado: platillos, % con foto, categorías, recomendados y horario."""
    h = (ROOT / slug / "index.html").read_text(encoding="utf-8")
    m = json.loads(re.search(r"window\.MENU=(\{.*?\});</script>", h).group(1))
    its = [it for c in m["cats"] for it in c["items"]]
    return {"n": len(its), "f": round(100 * sum(1 for i in its if i.get("img")) / max(len(its), 1)),
            "c": len(m["cats"]), "d": len(m.get("dest", [])), "h": bool(m.get("horario")),
            "ld": "application/ld+json" in h}


def preset(r):
    raw = json.loads((TOOLS / "raw" / f"{r['slug']}.json").read_text(encoding="utf-8"))
    p = {"lugar": r["nombre"], "ciudad": r["ciudad"].split(",")[0], "tel": r.get("whatsapp") or r["tel"],
         "tipo": TIPO.get(r.get("guion"), "restaurante"), "platillos": r.get("estrella", ""),
         "menu": CFG["base_url"] + r["slug"] + "/", "situacion": "apps", "gancho": r.get("gancho", ""),
         "mejora": r.get("mejora", ""), "contacto": r.get("contacto", "solo_telefono"), "fuente": r.get("confianza", ""),
         "region": r.get("region", "nacional"), "guion": r.get("guion", "restaurante"), "sucursal": r.get("sucursal", ""),
         "direccion": r.get("direccion", "")}
    loc = raw.get("location")
    try:
        lng, lat = json.loads(loc) if isinstance(loc, str) else loc
        p["lng"], p["lat"] = round(float(lng), 6), round(float(lat), 6)
    except (TypeError, ValueError):
        pass
    if r.get("alta"):
        p["alta"] = r["alta"]
    if r.get("sin_web"):
        p["sin_web"] = True
    p["q"] = calidad(r["slug"])
    return p


def negociados(html):
    """Nombres de la lista NEGOCIADOS del macro (lugares ya trabajados que no deben volver a la lista)."""
    m = re.search(r"const NEGOCIADOS = (\[.*?\]);", html, re.S)
    return {n.lower() for n in json.loads(m.group(1))} if m else set()


def main():
    html = path = None
    if "--macro" in sys.argv:
        path = Path(sys.argv[sys.argv.index("--macro") + 1])
        html = path.read_text(encoding="utf-8")
    # Fuera: los marcados "negociado" en prospectos.json y los que el macro ya tiene en NEGOCIADOS.
    # Sus menús siguen en línea; solo dejan de aparecer como prospectos.
    fuera = negociados(html) if html else set()
    rows = [preset(r) for r in CFG["restaurantes"] if not r.get("negociado") and r["nombre"].lower() not in fuera]
    (ROOT / "macro.json").write_text(json.dumps({"actualizado": max((p.get("alta", "") for p in rows), default=""),
                                                 "prospectos": rows}, ensure_ascii=False, separators=(",", ":")),
                                     encoding="utf-8")
    print(f"macro.json: {len(rows)} prospectos")
    if not html:
        return
    m = re.search(r"const PRESETS = \[\n(.*?)\n\];", html, re.S)
    viejos = [json.loads(l.rstrip(",")) for l in m.group(1).split("\n") if l.strip()]
    orden = [p["menu"] for p in viejos]
    por_menu = {p["menu"]: p for p in rows}
    # Los nuevos van primero (WhatsApp antes que teléfono); los demás conservan su orden en el macro.
    nuevos = sorted((p for p in rows if p["menu"] not in orden), key=lambda p: ORDEN.get(p["contacto"], 9))
    # De los que ya estaban se respetan sus datos (coordenadas y ajustes hechos a mano); solo se renueva `q`.
    lista = nuevos + [{**v, "q": por_menu[v["menu"]]["q"]} for v in viejos if v["menu"] in por_menu]
    body = ",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in lista)
    path.write_text(html[:m.start(1)] + body + html[m.end(1):], encoding="utf-8")
    print(f"PRESETS del macro: {len(lista)} ({len(nuevos)} nuevos)")


if __name__ == "__main__":
    main()
