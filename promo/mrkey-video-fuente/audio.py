# Genera música original, efectos de sonido y la pista de voz del video de Mr Key.
import json, subprocess
import numpy as np
import soundfile as sf

SR = 48000
DUR = 60.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
timing = json.load(open("timing.json"))
fx = json.load(open("sfx.json"))
T = {s["id"]: s for s in timing}
P2 = T["s7"]["start"]          # arranque de la parte 2
RISER = fx["riser"]


def tt(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.005, r=0.1, curve=4.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4) * (curve / 4))
    return e


def add(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def lowpass(x, cutoff):
    # filtro de un polo, suficiente para suavizar
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def onepole_fast(x, cutoff):
    # versión vectorizada aproximada por bloques (para señales largas)
    from numpy.lib.stride_tricks import sliding_window_view  # noqa
    a = np.exp(-2 * np.pi * cutoff / SR)
    k = int(5 / (1 - a)) if a < 1 else 1
    k = max(8, min(k, 4000))
    h = (1 - a) * a ** np.arange(k)
    return np.convolve(x, h)[: len(x)]


def highpass(x, cutoff):
    return x - onepole_fast(x, cutoff)


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------------- Música ----------------
BPM = 104
beat = 60 / BPM
bar = beat * 4
# Am - F - C - G (raíces MIDI)
prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [52, 55, 60]), (55, [55, 59, 62])]
music = np.zeros(N)
drums = np.zeros(N)

def pad(chord, d):
    t = tt(d)
    s = np.zeros_like(t)
    for m in chord:
        f = note(m + 12)
        for det in (-0.12, 0.12):
            ph = 2 * np.pi * f * (1 + det / 100) * t
            s += np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    a = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.5)
    return s * a / (len(chord) * 4)

def bass(m, d):
    t = tt(d)
    f = note(m - 12)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    s = np.tanh(1.6 * s) * env(len(t), 0.004, d * 0.6)
    return s

def pluck(m, d=0.35):
    t = tt(d)
    f = note(m + 24)
    s = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) * np.exp(-t * 18)) * np.exp(-t * 9)
    return s

def kick():
    t = tt(0.32)
    f = 48 + 110 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) * 1.2

def hat(open_=False):
    d = 0.18 if open_ else 0.05
    n = rng.standard_normal(int(SR * d))
    n = highpass(n, 7000)
    return n * env(len(n), 0.001, d / 3) * 0.6

def clap():
    n = rng.standard_normal(int(SR * 0.2))
    n = highpass(onepole_fast(n, 2500), 900)
    e = env(len(n), 0.002, 0.06)
    for o in (0.0, 0.012, 0.024):
        e[int(o * SR):] += 0.5 * env(len(n) - int(o * SR), 0.001, 0.01)
    return n * e * 0.9

K, H, HO, C = kick(), hat(), hat(True), clap()
drop_in = T["s3"]["start"] - 0.05          # entra el ritmo cuando aparece Mr Key
clap_in = T["s4"]["start"] - 0.05
end_music = DUR - 1.2

t0 = 0.0
b = 0
while t0 < DUR:
    root, chord = prog[b % 4]
    in_break = RISER - 0.1 <= t0 < P2 - 0.05     # quiebre antes de la parte 2
    add(music, pad(chord, bar + 0.4), t0, 1.1 if t0 < drop_in else 0.7)
    for i in range(8):
        tb = t0 + i * beat / 2
        if tb >= end_music:
            break
        # arpegio
        arp = chord[[0, 1, 2, 1, 0, 2, 1, 2][i]]
        if t0 >= 2.0:
            add(music, pluck(arp), tb, 0.3 if t0 < drop_in else 0.2)
        brk = RISER - 0.1 <= tb < P2 - 0.05
        if tb >= drop_in and not brk:
            if i % 2 == 0:
                add(drums, K, tb, 0.9)
            add(drums, H if i % 2 else H * 0.5, tb, 0.35)
            if i in (3, 7):
                add(drums, HO, tb, 0.12)
            if tb >= clap_in and i in (2, 6):
                add(drums, C, tb, 0.5)
            if i in (0, 3, 4, 6):
                add(music, bass(root, beat * 0.45), tb, 0.38)
    t0 += bar
    b += 1

# Riser + impacto al pasar a la parte 2
rd = P2 - RISER
n = rng.standard_normal(int(SR * rd))
tr = np.arange(len(n)) / SR
sweep = np.zeros_like(n)
for seg in range(16):  # filtro que sube por segmentos
    a, z = int(seg * len(n) / 16), int((seg + 1) * len(n) / 16)
    sweep[a:z] = highpass(onepole_fast(n[a:z], 600 + seg * 500), 300 + seg * 300)
add(drums, sweep * (tr / rd) ** 2 * 0.7, RISER)
add(drums, K * 1.3, P2 - 0.02)
crash = highpass(rng.standard_normal(int(SR * 1.6)), 4000) * env(int(SR * 1.6), 0.002, 0.5) * 0.35
add(drums, crash, P2 - 0.02)
# acorde final
add(music, pad([57, 60, 64, 69], 2.0), DUR - 2.2, 0.6)
add(drums, K * 1.2, DUR - 2.2)
add(drums, crash, DUR - 2.2)

music = music + drums
fade = np.ones(N)
fade[-int(SR * 0.8):] = np.linspace(1, 0, int(SR * 0.8))
fade[: int(SR * 0.3)] = np.linspace(0, 1, int(SR * 0.3))
music *= fade
music /= np.max(np.abs(music)) + 1e-9
sf.write("music.wav", music * 0.9, SR)

# ---------------- Efectos ----------------
def tone(f, d, decay=10.0, harm=0.3):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + harm * np.sin(4 * np.pi * f * t)) * np.exp(-t * decay) * np.minimum(1, t / 0.003)

def bell(f, d=0.9):
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * (4 + r * 2)) for r, a in ((1, 1), (2.76, .4), (5.4, .2), (8.9, .1)))
    return s * np.minimum(1, t / 0.002)

def S_pop():
    t = tt(0.09); f = 500 + 900 * (t / 0.09)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * 0.8

def S_stamp():
    t = tt(0.14); f = 60 + 160 * np.exp(-t * 40)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28)
    click = highpass(rng.standard_normal(len(t)), 2500) * np.exp(-t * 120) * 0.5
    return (body + click + tone(1400, 0.14, 30) * 0.25) * 0.9

def S_reward():
    out = np.zeros(int(SR * 1.4))
    for i, m in enumerate((84, 88, 91, 96)):
        s = bell(note(m), 1.0) * 0.35
        add(out, s, i * 0.09)
    return out

def S_success():
    out = np.zeros(int(SR * 0.9))
    add(out, bell(note(88), .8) * .4, 0); add(out, bell(note(95), .8) * .4, .11)
    return out

def S_click():
    t = tt(0.03)
    return highpass(rng.standard_normal(len(t)), 3000) * np.exp(-t * 250) * 0.6 + tone(2200, .03, 120) * .3

def S_whoosh():
    d = 0.45; n = rng.standard_normal(int(SR * d)); t = tt(d)
    s = highpass(onepole_fast(n, 3000), 400) * np.sin(np.pi * t / d) ** 2
    return s * 0.45

def S_crumple():
    d = 0.55; n = rng.standard_normal(int(SR * d)); t = tt(d)
    am = (rng.random(len(t)) > 0.985).astype(float)
    am = onepole_fast(am, 300) * 40
    return highpass(n, 1500) * np.clip(am, 0, 1) * np.sin(np.pi * t / d) * 0.7

def S_thud():
    t = tt(0.3); f = 50 + 70 * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 1.0

def S_boing():
    t = tt(0.45); f = 280 + 120 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 6) + 200 * t
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.45

def S_error():
    out = np.zeros(int(SR * 0.5))
    for i, f in enumerate((392, 311)):
        t = tt(0.2); s = np.sign(np.sin(2 * np.pi * f * t)) * 0.25 * np.exp(-t * 8)
        add(out, onepole_fast(s, 2500), i * 0.18)
    return out

def S_notif():
    out = np.zeros(int(SR * 0.9))
    for i, m in enumerate((88, 84, 91)):
        add(out, bell(note(m), .6) * .35, i * 0.12)
    return out

def S_cash():
    out = np.zeros(int(SR * 1.0))
    n = rng.standard_normal(int(SR * 0.12))
    add(out, highpass(n, 3000) * env(len(n), .001, .03) * .6, 0)
    add(out, bell(note(96), .9) * .35, 0.08); add(out, bell(note(100), .9) * .3, 0.16)
    return out

def S_beep():
    return tone(1850, 0.13, 6, 0.1) * 0.35

SFXF = {"pop": S_pop, "stamp": S_stamp, "reward": S_reward, "success": S_success, "click": S_click, "whoosh": S_whoosh,
        "crumple": S_crumple, "thud": S_thud, "boing": S_boing, "error": S_error, "notif": S_notif, "cash": S_cash, "beep": S_beep}
sfx = np.zeros(N)
for e in fx["sfx"]:
    add(sfx, SFXF[e["type"]](), e["t"], 0.8)
sfx /= max(1.0, np.max(np.abs(sfx)))
sf.write("sfx.wav", sfx * 0.9, SR)

# ---------------- Voz ----------------
voice = np.zeros(N)
for s in timing:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{s['id']}.wav", "-ar", str(SR), "-ac", "1", f"{s['id']}_48.wav"], check=True)
    v, _ = sf.read(f"{s['id']}_48.wav")
    add(voice, v, s["start"])
voice /= np.max(np.abs(voice)) + 1e-9
sf.write("voice.wav", voice * 0.95, SR)
print("ok")
