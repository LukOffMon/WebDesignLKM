# Música pop-funk de 45 s (MIDI) sincronizada con la línea de tiempo; se toca con FluidSynth + FluidR3_GM.
# El problema (s1–s2) va contenido en Si menor; al aparecer el logo (s3) entra el ritmo completo en Re mayor.
import json, random, struct, subprocess

random.seed(5)
TL = json.load(open("timeline.json"))
S = {s["id"]: s for s in TL["scenes"]}
BEAT = 60 / TL["bpm"]
TPB = 480
ev = []

def tick(t): return max(0, int(round(t / BEAT * TPB)))
def note(ch, t, m, dur, vel, hum=6):
    vel = max(1, min(127, int(vel + random.uniform(-5, 5))))
    t = t + random.uniform(-hum, hum) / 1000
    ev.append((tick(t), 1, bytes([0x90 | ch, m, vel])))
    ev.append((tick(t + dur), 0, bytes([0x80 | ch, m, 0])))
def prog(ch, p, t=0): ev.append((tick(t), -1, bytes([0xC0 | ch, p])))
def cc(ch, num, val, t=0): ev.append((tick(t), -1, bytes([0xB0 | ch, num, val])))

PIANO, BASS, GTR, BRASS, BELL, PAD, DR = 0, 1, 2, 3, 4, 5, 9
prog(PIANO, 4)    # piano eléctrico
prog(BASS, 38)    # bajo sintetizado
prog(GTR, 28)     # guitarra eléctrica apagada (funk)
prog(BRASS, 61)   # sección de metales
prog(BELL, 9)     # glockenspiel
prog(PAD, 89)     # pad cálido
for ch, vol, pan, rev in [(PIANO, 84, 44, 40), (BASS, 112, 64, 10), (GTR, 78, 88, 30), (BRASS, 92, 58, 55),
                          (BELL, 70, 78, 70), (PAD, 64, 64, 80), (DR, 108, 64, 20)]:
    cc(ch, 7, vol); cc(ch, 10, pan); cc(ch, 91, rev)

# acordes: raíz del bajo y voicing
CH = {
    "Bm": (35, [62, 66, 69, 73]), "G": (31, [62, 66, 67, 71]), "D": (38, [62, 66, 69, 73]), "A": (33, [61, 64, 69, 71]),
    "Dmaj": (38, [62, 66, 69, 73]), "Amaj": (33, [61, 64, 69, 73]), "Bm7": (35, [62, 66, 69, 74]), "Gmaj7": (31, [62, 66, 71, 74]),
}
problem = ["Bm", "G", "D", "A"]
main = ["Dmaj", "Amaj", "Bm7", "Gmaj7"]

start = 0.0
logo = S["s3"]["start"] + .55          # golpe del sello del logo
end_hit = S["s9"]["start"] + .35       # golpe del cierre
final = TL["total"] - 1.6              # acorde final que se sostiene
bar = 4 * BEAT

# ---------- problema: pulso contenido ----------
t = start
i = 0
while t < logo - BEAT * .5:
    name = problem[(i // 4) % 4]
    root, voic = CH[name]
    b = t
    # bajo pulsante en corcheas, apagado
    if b >= 0.3:
        note(BASS, b, root + 12, BEAT * .4, 70)
        note(BASS, b + BEAT / 2, root + 12, BEAT * .3, 56)
    # bombo tenue y aguja de reloj (tensión)
    note(DR, b, 36, .1, 60 if i % 2 == 0 else 48)
    note(DR, b + BEAT / 2, 42, .05, 36)
    if i % 4 == 0:
        for j, m in enumerate(voic):
            note(PAD, b, m, bar * .98, 50)
    if i % 8 == 6:
        note(PIANO, b, voic[-1] + 12, BEAT * 1.5, 52)
    t += BEAT
    i += 1
# redoble que crece hacia el logo
for k in range(8):
    note(DR, logo - 1.0 + k * .125, 38, .08, 40 + k * 9)

# ---------- golpe del logo ----------
note(DR, logo, 49, 1.6, 112); note(DR, logo, 36, .2, 112); note(DR, logo, 57, 1.2, 90)
for m in [50, 62, 66, 69, 74]: note(BRASS, logo, m, .9, 108)
note(BASS, logo, 26, 1.2, 110)
for k, m in enumerate([86, 90, 93, 98]): note(BELL, logo + .12 + k * .08, m, .8, 90)

# ---------- ritmo completo ----------
t = logo + BEAT * 2   # dos tiempos de aire después del golpe
i = 0
while t < final - .01:
    name = main[(i // 4) % 4]
    root, voic = CH[name]
    pos = i % 4
    near_end = t >= end_hit - .01
    # batería: bombo a negras, palmas en 2 y 4, hi-hat en semicorcheas con acentos
    note(DR, t, 36, .1, 100)
    if pos in (1, 3): note(DR, t, 39, .1, 96); note(DR, t, 38, .1, 70)
    for s in range(4):
        note(DR, t + s * BEAT / 4, 42, .04, 64 if s == 2 else 40 + (s % 2) * 6)
    if pos == 3 and (i // 4) % 2 == 1: note(DR, t + BEAT * .75, 46, .1, 70)
    # bajo funk sincopado
    pat = [(0, 0, .35, 104), (.75, 12, .2, 84), (1.5, 7, .3, 92)] if pos % 2 == 0 else [(0, 0, .3, 96), (.5, 10, .2, 78), (.75, 12, .2, 86)]
    for off, iv, d, v in pat:
        if off < 1: note(BASS, t + off * BEAT, root + iv, d * BEAT * 2, v)
    # guitarra apagada en semicorcheas "chucka"
    for s in (1, 3):
        note(GTR, t + s * BEAT / 4, voic[1] - 12, .06, 70)
    # piano eléctrico: acordes en el contratiempo
    if pos in (0, 2):
        for j, m in enumerate(voic):
            note(PIANO, t + BEAT * .5 + j * .005, m, BEAT * .4, 70)
    # metales: golpes al inicio de cada 2 compases
    if pos == 0 and (i // 4) % 2 == 0:
        for m in voic[:3]: note(BRASS, t, m, BEAT * .45, 88)
    # campanitas sobre la última parte (temas)
    if S["s6"]["start"] <= t < S["s7"]["start"] and pos in (0, 2):
        for k, m in enumerate([voic[0] + 24, voic[2] + 24]):
            note(BELL, t + k * BEAT / 4, m, .3, 62)
    t += BEAT
    i += 1

# ---------- cierre ----------
note(DR, end_hit, 49, 2, 110); note(DR, end_hit, 36, .2, 110)
for m in [50, 62, 66, 69, 74]: note(BRASS, end_hit, m, .7, 104)
note(DR, final, 49, 3, 112); note(DR, final, 36, .3, 112); note(DR, final, 52, 2.5, 80)
note(BASS, final, 26, 1.6, 110)
for m in [62, 66, 69, 73, 76]: note(PIANO, final + random.uniform(0, .02), m, 1.6, 90)
for m in [50, 62, 66, 69, 74]: note(BRASS, final, m, 1.4, 108)
for k, m in enumerate([86, 90, 93, 98, 102]): note(BELL, final + k * .07, m, 1.2, 84)

# ---------- escribir MIDI tipo 0 ----------
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
subprocess.run(["fluidsynth", "-ni", "-g", "0.7", "-r", "44100", "-o", "synth.reverb.room-size=0.4", "-o", "synth.reverb.level=0.45",
                "-F", "music.wav", "/usr/share/sounds/sf2/FluidR3_GM.sf2", "song.mid"], check=True, capture_output=True)
print("eventos", len(ev))
