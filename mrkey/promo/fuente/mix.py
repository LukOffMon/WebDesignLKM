# Música jazz, efectos de sonido y mezcla con la voz, todo sintetizado con numpy.
import json, subprocess
import numpy as np

SR = 44100
TL = json.load(open("timeline.json"))
SFX = json.load(open("sfx.json"))
TOTAL = TL["total"]
N = int(TOTAL * SR) + SR
rng = np.random.default_rng(7)
S = {s["id"]: s for s in TL["scenes"]}

music = np.zeros((N, 2))
fx = np.zeros((N, 2))
voice = np.zeros(N)

def tt(dur): return np.arange(int(dur * SR)) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

def add(buf, start, sig, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i < 0: sig, i = sig[-i:], 0
    sig = sig[: max(0, len(buf) - i)] * gain
    if buf.ndim == 1:
        buf[i:i + len(sig)] += sig
    else:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        buf[i:i + len(sig), 0] += sig * l * 1.41
        buf[i:i + len(sig), 1] += sig * r * 1.41

def band_noise(n, lo, hi):
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    out = np.fft.irfft(spec, n)
    return out / (np.abs(out).max() + 1e-9)

def env(t, a=0.005, d=0.3):
    return np.minimum(1, t / a) * np.exp(-t / d)

# ---------------- música (FluidSynth) ----------------
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "music.wav", "-ar", str(SR), "-ac", "2", "-f", "f32le", "-"], capture_output=True, check=True).stdout
mus = np.frombuffer(raw, dtype=np.float32).astype(np.float64).reshape(-1, 2)
mus = mus / (np.abs(mus).max() + 1e-9) * .9
music[: min(N, len(mus))] += mus[:N]

def mtof(m): return 440 * 2 ** ((m - 69) / 12)
# ---------------- efectos ----------------
def whoosh(d=.6):
    t = tt(d); n = len(t)
    x = np.linspace(0, 1, n)
    sig = band_noise(n, 300, 1500) * (1 - x) + band_noise(n, 1500, 5000) * np.sin(np.pi * x) + band_noise(n, 4000, 10000) * x * .6
    return sig * np.sin(np.pi * x) ** 2
def boom():
    t = tt(1.4); f = 32 + 60 * np.exp(-t / .08)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, .004, .55) + band_noise(len(t), 30, 300) * env(t, .002, .08) * .5
def buzz():
    t = tt(.32)
    sig = sum(np.sign(np.sin(2 * np.pi * f * t)) * .5 for f in (110, 117))
    sig = np.convolve(sig, np.ones(12) / 12, "same")
    return sig * env(t, .005, .5) * np.minimum(1, (.32 - t) / .03)
def riser():
    d = 1.0; t = tt(d); x = t / d
    f = 200 + 1400 * x ** 2
    s1 = np.sin(2 * np.pi * np.cumsum(f) / SR) * .3
    return (s1 + band_noise(len(t), 2000, 9000) * x * .6) * x ** 2
def bell(f, d=1.2, partials=((1, 1), (2.76, .5), (5.4, .25), (8.93, .12))):
    t = tt(d)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (d * .35 / r ** .3)) for r, a in partials) * np.minimum(1, t / .002)
def shimmer():
    out = np.zeros(int(1.4 * SR))
    for k, m in enumerate([84, 88, 91, 96]):
        b = bell(mtof(m), 1.0) * .5; i = int(k * .06 * SR)
        out[i:i + len(b)] += b[: len(out) - i]
    return out
def pop():
    t = tt(.12); f = 350 + 900 * np.exp(-t / .02)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, .001, .04)
def scan():
    t = tt(1.1); f = 600 + 800 * t
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * .25 * np.sin(np.pi * t / 1.1)
def beep():
    t = tt(.11)
    return (np.sin(2 * np.pi * 1760 * t) + .3 * np.sin(2 * np.pi * 3520 * t)) * np.minimum(1, (.11 - t) / .01) * np.minimum(1, t / .003)
def tick():
    t = tt(.03)
    return band_noise(len(t), 2500, 7000) * env(t, .0005, .006)
def stamp():
    t = tt(.25); f = 70 + 90 * np.exp(-t / .02)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, .001, .07) + band_noise(len(t), 800, 3000) * env(t, .001, .02) * .5 + bell(1568, .25)[: len(t)] * .25
def ding():
    out = np.zeros(int(1.8 * SR))
    for k, f in enumerate([1318.5, 1760, 2637]):
        b = bell(f, 1.6) * .45; i = int(k * .11 * SR)
        out[i:i + len(b)] += b[: len(out) - i]
    return out
def confetti():
    out = np.zeros(int(1.0 * SR))
    for k in range(26):
        c = tick() * (.3 + .7 * rng.random()); i = int(rng.random() * .9 * SR)
        out[i:i + len(c)] += c
    return out
def click():
    t = tt(.04)
    return band_noise(len(t), 1500, 6000) * env(t, .0005, .008) + np.sin(2 * np.pi * 3000 * t) * env(t, .001, .01) * .3
def notif():
    out = np.zeros(int(.8 * SR))
    for k, f in enumerate([1318.5, 1975.5]):
        t = tt(.55); b = (np.sin(2 * np.pi * f * t) + .15 * np.sin(2 * np.pi * 3 * f * t)) * env(t, .003, .18) * .6
        i = int(k * .13 * SR); out[i:i + len(b)] += b[: len(out) - i]
    return out
def ticks():
    out = np.zeros(int(2.4 * SR)); tpos = 0.0; gap = .14
    while tpos < 2.15:
        c = band_noise(int(.02 * SR), 2000 + tpos * 2000, 6000 + tpos * 2000) * env(tt(.02), .0005, .005)
        i = int(tpos * SR); out[i:i + len(c)] += c * .6
        tpos += gap; gap = max(.05, gap * .93)
    return out
def kaching():
    t = tt(1.2)
    clang = sum(np.sin(2 * np.pi * f * t) for f in (2100, 3300, 4700, 5900)) / 4 * env(t, .001, .12)
    out = clang * .7 + bell(2093, 1.2) * .45
    for k in range(10):
        c = tick() * .5; i = int((.08 + rng.random() * .35) * SR)
        out[i:i + len(c)] += c
    return out
def thud():
    t = tt(.4); f = 45 + 60 * np.exp(-t / .03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, .001, .12) + band_noise(len(t), 60, 900) * env(t, .001, .03) * .6

GEN = dict(whoosh=whoosh, boom=boom, buzz=buzz, riser=riser, shimmer=shimmer, pop=pop, scan=scan, beep=beep, tick=tick,
           stamp=stamp, ding=ding, confetti=confetti, click=click, notif=notif, ticks=ticks, kaching=kaching, thud=thud)
LEVEL = dict(whoosh=.32, boom=.55, buzz=.22, riser=.3, shimmer=.22, pop=.3, scan=.18, beep=.16, tick=.35, stamp=.4,
             ding=.3, confetti=.25, click=.3, notif=.32, ticks=.3, kaching=.32, thud=.5)
for e in SFX:
    pan = {"whoosh": -.2, "notif": .15}.get(e["type"], 0)
    add(fx, e["t"], GEN[e["type"]](), pan, LEVEL[e["type"]] * e.get("vol", 1))

# ---------------- reverb (convolución) ----------------
def reverb(x, secs=1.1, wet=.18):
    n = int(secs * SR); t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t / (secs / 5))[:, None]
    ir /= np.sqrt((ir ** 2).sum(0))
    L = 1 << int(np.ceil(np.log2(len(x) + n)))
    out = np.stack([np.fft.irfft(np.fft.rfft(x[:, c], L) * np.fft.rfft(ir[:, c], L), L)[: len(x)] for c in range(2)], 1)
    return x + out * wet
fx = reverb(fx, .8, .12)

# ---------------- voz ----------------
for s in TL["scenes"]:
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", f"vo/{s['id']}.mp3", "-af",
                          "highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,equalizer=f=3200:t=q:w=1:g=2.5,equalizer=f=180:t=q:w=1:g=1.5",
                          "-ar", str(SR), "-ac", "1", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    add(voice, s["voStart"], v / (np.abs(v).max() + 1e-9) * .8)

# ducking: la música baja mientras habla la voz
act = np.abs(voice)
win = int(.03 * SR)
act = np.convolve(act, np.ones(win) / win, "same")
gate = (act > .015).astype(float)
k = int(.35 * SR)
gate = np.convolve(gate, np.ones(k) / k, "same")
duck = 1 - .68 * np.clip(gate * 1.6, 0, 1)
music *= duck[:, None]

speech = gate > .5
print('voz/musica dB', 20*np.log10(np.sqrt((voice[speech]**2).mean())/np.sqrt(((music[speech]*1.55)**2).mean())))
mix = music * 1.55 + fx * .85 + voice[:, None] * 1.0
mix[: int(TOTAL * SR)]
fade = int(.8 * SR); end = int(TOTAL * SR)
mix = mix[:end]
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix.astype(np.float32).tofile("mix.f32")
print("ok", mix.shape, float(np.abs(mix).max()))
