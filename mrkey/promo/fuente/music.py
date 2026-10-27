# Arreglo de jazz (MIDI) sincronizado con la línea de tiempo; se toca con FluidSynth + FluidR3_GM.
import json, random, struct, subprocess

random.seed(11)
TL = json.load(open("timeline.json"))
S = {s["id"]: s for s in TL["scenes"]}
BEAT = 60 / TL["bpm"]
TPB = 480
SW = 2 / 3
ev = []  # (tick, orden, bytes)

def tick(t): return max(0, int(round(t / BEAT * TPB)))
def hum(t, ms=8): return t + random.uniform(-ms, ms) / 1000
def note(ch, t, m, dur, vel):
    vel = max(1, min(127, int(vel + random.uniform(-6, 6))))
    t = hum(t)
    ev.append((tick(t), 1, bytes([0x90 | ch, m, vel])))
    ev.append((tick(t + dur), 0, bytes([0x80 | ch, m, 0])))
def prog(ch, p, t=0, bank=None):
    if bank is not None: ev.append((tick(t), -2, bytes([0xB0 | ch, 0, bank])))
    ev.append((tick(t), -1, bytes([0xC0 | ch, p])))
def cc(ch, num, val, t=0): ev.append((tick(t), -1, bytes([0xB0 | ch, num, val])))

PIANO, BASS, SAX, VIB, DR = 0, 1, 2, 3, 9
prog(PIANO, 0); prog(BASS, 32); prog(SAX, 66); prog(VIB, 11); prog(DR, 40, bank=128)
for ch, vol, pan, rev in [(PIANO, 92, 50, 45), (BASS, 112, 64, 25), (SAX, 96, 78, 60), (VIB, 70, 84, 70), (DR, 100, 64, 35)]:
    cc(ch, 7, vol); cc(ch, 10, pan); cc(ch, 91, rev)

CH = {  # raíz del bajo, voicing del piano (sin raíz)
    "Dm7": (38, [53, 57, 60, 64]), "Bbmaj7": (46, [57, 62, 65, 69]), "Em7b5": (40, [55, 58, 62, 64]),
    "A7": (45, [55, 61, 64, 66]), "Fmaj7": (41, [57, 60, 64, 67]), "D7": (38, [54, 60, 64, 69]),
    "Gm7": (43, [58, 62, 65, 69]), "C7": (36, [52, 58, 62, 69]), "Am7": (45, [55, 60, 64, 67]),
}
problem = ["Dm7", "Bbmaj7", "Em7b5", "A7"]
main = ["Fmaj7", "D7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"]

start = S["s1"]["start"]
logo = S["s3"]["start"]
end_hit = S["s9"]["voStart"] + S["s9"]["vo"] + 0.2
bar_len = 4 * BEAT

# --- entrada: escobillas en tresillo que crecen ---
for k in range(6):
    note(DR, start - 1.0 + k * BEAT / 3, 38, .1, 30 + k * 10)
note(BASS, start - BEAT * SW, 37, BEAT * .3, 80)  # nota de aproximación

b = 0
while True:
    t0 = start + b * bar_len
    if t0 >= end_hit - .01: break
    full = t0 >= logo - .01
    name = (main[(b - int((logo - start) // bar_len)) % len(main)] if full else problem[b % len(problem)])
    nxt_t = t0 + bar_len
    nxt = main[(b + 1 - int((logo - start) // bar_len)) % len(main)] if nxt_t >= logo - .01 else problem[(b + 1) % len(problem)]
    root, voic = CH[name]
    nroot = CH[nxt][0]
    # contrabajo caminante
    fifth, third = root + 7, voic[0] - 12 if voic[0] - 12 > root else root + 3
    line = [root, third if b % 2 else fifth, root + 12 if b % 3 == 0 else fifth, nroot + (1 if b % 2 else -1)]
    for k, m in enumerate(line):
        tb = t0 + k * BEAT
        if tb >= end_hit - .01: break
        while m > 55: m -= 12
        while m < 33: m += 12
        note(BASS, tb, m, BEAT * .9, 92 if k == 0 else 82)
    # batería
    for k in range(4):
        tb = t0 + k * BEAT
        if tb >= end_hit - .01: break
        note(DR, tb, 51, .2, 72 if k in (0, 2) else 80)
        if k in (1, 3):
            note(DR, tb + BEAT * SW, 51, .15, 56)
            note(DR, tb, 44, .1, 62)
            note(DR, tb, 38, .1, 46 if full else 30)
        if full: note(DR, tb, 36, .1, 34)
    # piano
    hits = [(0, .5), (1 + SW, 1.2)] if b % 2 == 0 else [(SW, .6), (2 + SW, 1.0)]
    if not full: hits = hits[:1] if b % 2 == 0 else hits[1:]
    for pos, dur in hits:
        tb = t0 + pos * BEAT
        if tb >= end_hit - .01: continue
        for j, m in enumerate(voic):
            note(PIANO, tb + j * .006, m, dur * BEAT, 66 if full else 52)
    b += 1

# --- golpe del logo ---
note(DR, logo, 49, 1.5, 104); note(DR, logo, 36, .2, 100)
for m in [41, 53, 57, 60, 64, 67, 72]:
    note(PIANO if m > 45 else BASS, logo, m, 1.4, 96)
for k, m in enumerate([72, 76, 79, 84]):
    note(VIB, logo + .15 + k * .09, m, 1.2, 88)

# --- frases de saxofón en los silencios entre frases de la voz ---
LICKS = [
    [(0, 72, .5), (SW, 74, .33), (1, 77, .5), (1 + SW, 76, .33), (2, 72, 1.4)],
    [(0, 65, .33), (1 / 3, 67, .33), (2 / 3, 69, .33), (1, 72, .9), (2, 70, .5), (2 + SW, 69, 1.2)],
    [(0, 77, .5), (SW, 76, .33), (1, 74, .5), (1 + SW, 72, .33), (2, 69, .5), (2 + SW, 72, 1.2)],
]
scenes = TL["scenes"]
li = 0
for i, s in enumerate(scenes[:-1]):
    gap_start = s["voStart"] + s["vo"] + .05
    gap_end = scenes[i + 1]["voStart"] - .05
    if i < 1 or gap_end - gap_start < .55: continue  # el sax entra después del problema
    t = gap_start
    for off, m, d in LICKS[li % len(LICKS)]:
        tb = t + off * BEAT
        if tb > gap_end + .9: break
        note(SAX, tb, m - 12, d * BEAT, 84)
    li += 1

# --- final ---
note(DR, end_hit, 49, 3, 110); note(DR, end_hit, 36, .3, 104); note(DR, end_hit, 53, 2, 80)
for m in [41, 29]: note(BASS, end_hit, m, 3.0, 100)
for m in [57, 60, 64, 67, 69, 72]: note(PIANO, end_hit + random.uniform(0, .03), m, 3.0, 92)
for k, m in enumerate([72, 76, 79, 81, 84]): note(VIB, end_hit + k * .07, m, 2.5, 84)
for k, (off, m, d) in enumerate([(-1.0, 69, .45), (-.5, 72, .45), (0, 77, 3.0)]):
    note(SAX, end_hit + off, m - 12, d, 92)

# --- escribir MIDI tipo 0 ---
ev.sort(key=lambda e: (e[0], e[1]))
def vlq(n):
    out = [n & 0x7F]; n >>= 7
    while n: out.append((n & 0x7F) | 0x80); n >>= 7
    return bytes(reversed(out))
trk = bytearray(vlq(0) + b"\xFF\x51\x03" + int(BEAT * 1e6).to_bytes(3, "big"))
last = 0
for tk, _, data in ev:
    trk += vlq(tk - last) + data; last = tk
trk += vlq(TPB) + b"\xFF\x2F\x00"
open("song.mid", "wb").write(b"MThd" + struct.pack(">IHHH", 6, 0, 1, TPB) + b"MTrk" + struct.pack(">I", len(trk)) + trk)
subprocess.run(["fluidsynth", "-ni", "-g", "0.7", "-r", "44100", "-o", "synth.reverb.room-size=0.55", "-o", "synth.reverb.level=0.6",
                "-F", "music.wav", "/usr/share/sounds/sf2/FluidR3_GM.sf2", "song.mid"], check=True, capture_output=True)
print("eventos", len(ev))
