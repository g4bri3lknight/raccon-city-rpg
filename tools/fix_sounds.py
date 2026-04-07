#!/usr/bin/env python3
"""Fix missing sounds - generate with robust helper."""
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
import os, random

OUT = 'public/audio'; SR = 44100

def norm(a, pk=0.85):
    mx = np.max(np.abs(a))
    return np.clip(a/mx*pk, -1, 1) if mx > 1e-9 else a

def fade(a, ms=5):
    n = int(SR * ms / 1000)
    if len(a) < 2*n: return a
    a = a.copy(); e = np.ones(len(a))
    e[:n] = np.linspace(0, 1, n); e[-n:] = np.linspace(1, 0, n)
    return a * e

def lp(s, f, o=4):
    b, a = butter(o, f/(SR/2), 'low'); return lfilter(b, a, s)

def hp(s, f, o=2):
    b, a = butter(o, f/(SR/2), 'high'); return lfilter(b, a, s)

def bp(s, lo, hi, o=2):
    b, a = butter(o, [lo/(SR/2), hi/(SR/2)], 'band'); return lfilter(b, a, s)

def nz(d): return np.random.randn(int(SR * d))

def tn(f, d):
    return np.sin(2*np.pi*f*np.linspace(0, d, int(SR*d), False))

def ev(d, a=0.01, dd=0.1, s=0.7, r=0.2):
    n = int(SR*d); e = np.zeros(n)
    for i in range(n):
        t = i/SR
        if t < a: e[i] = t/a if a > 0 else 1
        elif t < a+dd: e[i] = 1-(1-s)*((t-a)/dd) if dd > 0 else s
        elif t < d-r: e[i] = s
        else: e[i] = s*((d-t)/r) if r > 0 else 0
    return e

def mk(dur, *parts):
    buf = np.zeros(int(SR * dur))
    for p in parts:
        if isinstance(p, (int, float)): continue
        sig = p[0]; off = p[1] if len(p) > 1 else 0; gain = p[2] if len(p) > 2 else 1.0
        n = min(len(sig), len(buf) - int(off * SR))
        if n > 0: buf[int(off*SR):int(off*SR)+n] += sig[:n] * gain
    return buf

def reverb(sig, decay=0.3, nt=6):
    out = sig.copy()
    for i in range(nt):
        d = int(SR * (0.02 + i*0.03*(1+random.random()*0.5)))
        g = decay * (0.7 ** i)
        if d < len(sig):
            s = np.zeros(len(sig)+d); s[d:d+len(sig)] = sig*g; s = lp(s, 3000-i*200)
            out += s[:len(out)]
    return out

def distort(s, a=2.0): return np.tanh(s*a)

def save(name, sig):
    audio = (sig * 32767).astype(np.int16)
    path = os.path.join(OUT, f'{name}.wav')
    wavfile.write(path, SR, audio)
    print(f'  OK {name} ({os.path.getsize(path)//1024}KB)')

os.makedirs(OUT, exist_ok=True)

# attack (knife slash)
sig = mk(0.4,
    (bp(nz(0.12)*ev(0.12, 0.01, 0.1, 0.2, 0.15), 1500, 8000, 2), 0, 0.4),
    (bp(nz(0.06)*ev(0.06, 0.001, 0.02, 0.1, 0.02), 2000, 6000, 2), 0, 0.8),
)
save('attack', fade(norm(sig)))

# pistol_shot
sig = reverb(mk(0.8,
    (hp(lp(nz(0.04)*ev(0.04, 0.0005, 0.01, 0.1, 0.015), 800), 8000), 0, 1.0),
    (lp(tn(80, 0.12)*ev(0.12, 0.001, 0.04, 0.2, 0.06), 500), 0, 0.8),
), 0.15, 4)
save('pistol_shot', fade(norm(sig)))

# shotgun_blast
sig = reverb(mk(1.0,
    (lp(distort(nz(0.15)*ev(0.15, 0.001, 0.08, 0.3, 0.1), 1.5), 4000), 0, 1.0),
    (lp(tn(50, 0.2)*ev(0.2, 0.001, 0.05, 0.3, 0.1), 300), 0, 0.7),
    (bp(nz(0.15)*ev(0.15, 0.005, 0.03, 0.1, 0.05), 500, 3000, 2), 0.3, 0.4),
), 0.2, 5)
save('shotgun_blast', fade(norm(sig)))

# magnum_shot
sig = reverb(mk(1.2,
    (hp(lp(nz(0.06)*ev(0.06, 0.0003, 0.02, 0.15, 0.02), 500), 10000), 0, 1.0),
    (lp(tn(35, 0.25)*ev(0.25, 0.001, 0.08, 0.3, 0.12), 200), 0, 0.9),
    (lp(tn(60, 0.6)*ev(0.6, 0.01, 0.1, 0.08, 0.4), 150), 0.12, 0.3),
), 0.25, 6)
save('magnum_shot', fade(norm(sig)))

# enemy_hit
sig = mk(0.25,
    (bp(nz(0.06)*ev(0.06, 0.001, 0.02, 0.1, 0.02), 200, 3000, 2), 0, 0.9),
    (lp(tn(150, 0.1)*ev(0.1, 0.001, 0.03, 0.1, 0.05), 800), 0, 0.7),
)
save('enemy_hit', fade(norm(sig)))

# player_hit
grt = np.linspace(0, 0.15, int(SR*0.15), False)
gf = 200 * (1 - 0.3 * grt / 0.15)
grunt = bp(sum((1/h)*np.sin(2*np.pi*gf*h*grt) for h in range(1, 4)), 100, 800, 2) * ev(0.15, 0.005, 0.04, 0.2, 0.05)
sig = mk(0.3,
    (lp(tn(80, 0.15)*ev(0.15, 0.001, 0.05, 0.1, 0.06), 600), 0, 0.8),
    (grunt, 0, 0.5),
)
save('player_hit', fade(norm(sig)))

# critical
sig = mk(0.4,
    (bp(distort(nz(0.1)*ev(0.1, 0.001, 0.03, 0.1, 0.03), 2.0), 200, 4000, 2), 0, 1.0),
    (lp(tn(60, 0.2)*ev(0.2, 0.001, 0.05, 0.2, 0.08), 500), 0, 0.7),
    (tn(2000, 0.3)*ev(0.3, 0.005, 0.05, 0.1, 0.2)*0.15, 0.03, 1.0),
)
save('critical', fade(norm(sig)))

# zombie_attack
gat = np.linspace(0, 0.4, int(SR*0.4), False)
growl = bp(sum((1/(h**0.7))*np.sin(2*np.pi*(100+h*10+10*np.sin(2*np.pi*8*gat))*h*gat) for h in range(1, 6)), 150, 1500, 3) * ev(0.4, 0.01, 0.1, 0.3, 0.2)
sig = mk(0.6,
    (bp(nz(0.08)*ev(0.08, 0.001, 0.04, 0.3, 0.05), 800, 4000, 2), 0, 0.8),
    (lp(tn(80, 0.15)*ev(0.15, 0.001, 0.05, 0.2, 0.08), 300), 0, 0.6),
    (growl, 0.05, 0.5),
)
save('zombie_attack', fade(norm(sig)))

# zombie_death
dur = 1.5; t = np.linspace(0, dur, int(SR*dur), False)
f = 150 - 80 * (t/dur)**0.5
sig = bp(sum((1/h)*np.sin(2*np.pi*f*h*t) for h in range(1, 6)), 100, 1000, 3) * ev(dur, 0.05, 0.4, 0.2, 0.6) * (1 - 0.5*(t/dur)**2)
sig += bp(nz(dur)*0.3, 300, 2000, 2) * (0.5 + 0.5*np.sin(2*np.pi*12*t)) * ev(dur, 0.1, 0.2, 0.15, 0.5)
thud = lp(tn(60, 0.3)*ev(0.3, 0.001, 0.1, 0.1, 0.15) + nz(0.15)*ev(0.15, 0.001, 0.05, 0.05, 0.05)*0.5, 400)
buf = np.zeros(int(SR*dur))
n = min(len(thud), len(buf) - int(SR*0.8))
buf[int(SR*0.8):int(SR*0.8)+n] += thud[:n] * 0.7
buf[:len(sig)] += sig[:len(buf)]
save('zombie_death', fade(norm(buf)))

# explosion
sig = reverb(mk(2.0,
    (lp(distort(nz(0.5)*ev(0.5, 0.001, 0.2, 0.4, 0.2), 2.0), 3000), 0, 1.0),
    (lp(tn(30, 1.5)*ev(1.5, 0.01, 0.3, 0.3, 0.6), 200), 0, 0.8),
    (hp(lp(nz(0.6)*ev(0.6, 0.05, 0.2, 0.1, 0.3), 2000), 8000), 0.05, 0.3),
), 0.4, 8)
save('explosion', fade(norm(sig, 0.9)))

# hunter_attack
hat = np.linspace(0, 0.4, int(SR*0.4), False)
roar = bp(sum((1/(h**0.7))*np.sin(2*np.pi*(90+h*12)*hat) for h in range(1, 7)), 80, 1200, 3) * ev(0.4, 0.01, 0.1, 0.3, 0.15)
sig = mk(0.7,
    (bp(nz(0.12)*ev(0.12, 0.003, 0.04, 0.2, 0.05), 1500, 7000, 2), 0, 0.9),
    (lp(tn(100, 0.15)*ev(0.15, 0.001, 0.04, 0.2, 0.06) + nz(0.08)*ev(0.08, 0.001, 0.02, 0.05, 0.03)*0.4, 600), 0.05, 0.7),
    (roar, 0.08, 0.6),
)
save('hunter_attack', fade(norm(sig)))

# hunter_death
hdt = np.linspace(0, 0.5, int(SR*0.5), False)
hf = 80 - 30 * (hdt / 0.5)
hroar = bp(sum((1/(h**0.6))*np.sin(2*np.pi*hf*h*hdt) for h in range(1, 5)), 60, 1000, 3) * ev(0.5, 0.02, 0.15, 0.2, 0.2)
sig = mk(1.2,
    (hroar, 0, 0.7),
    (tn(35, 0.3)*ev(0.3, 0.01, 0.08, 0.1, 0.15)*0.6 + nz(0.2)*ev(0.2, 0.01, 0.05, 0.05, 0.1)*0.2, 0.4, 0.8),
)
save('hunter_death', fade(norm(sig)))

# tyrant_attack
sig = reverb(mk(1.2,
    (lp(distort(nz(0.3)*ev(0.3, 0.001, 0.1, 0.3, 0.15), 1.5), 2000), 0, 1.0),
    (lp(tn(30, 0.8)*ev(0.8, 0.01, 0.2, 0.2, 0.4) + tn(60, 0.6)*ev(0.6, 0.01, 0.15, 0.15, 0.3)*0.6, 150), 0, 0.7),
    (bp(nz(0.5)*ev(0.5, 0.05, 0.2, 0.1, 0.2), 500, 5000, 2), 0.05, 0.3),
), 0.3, 6)
save('tyrant_attack', fade(norm(sig, 0.9)))

# nemesis_attack
nat = np.linspace(0, 0.6, int(SR*0.6), False)
nroar = bp(sum((1/(h**0.6))*np.sin(2*np.pi*(70+h*10)*nat) for h in range(1, 8)), 60, 1000, 3) * ev(0.6, 0.02, 0.15, 0.3, 0.2)
sig = reverb(mk(1.5,
    (lp(nz(0.3)*ev(0.3, 0.01, 0.1, 0.3, 0.1), 3000) + tn(200, 0.3)*ev(0.3, 0.01, 0.08, 0.2, 0.1)*0.5, 0, 0.7),
    (lp(distort(nz(0.4)*ev(0.4, 0.001, 0.15, 0.3, 0.15), 1.8), 2500) + tn(40, 0.6)*ev(0.6, 0.01, 0.15, 0.2, 0.3)*0.6, 0.15, 0.9),
    (nroar, 0.5, 0.5),
), 0.3, 6)
save('nemesis_attack', fade(norm(sig, 0.9)))

# enemy_death
ert = np.linspace(0, 0.4, int(SR*0.4), False)
rattle = bp(nz(0.4)*0.15, 200, 1500, 2) * (0.5 + 0.5*np.sin(2*np.pi*15*ert)) * ev(0.4, 0.01, 0.1, 0.05, 0.2)
sig = mk(0.8,
    (lp(tn(60, 0.2)*ev(0.2, 0.001, 0.05, 0.1, 0.1) + nz(0.1)*ev(0.1, 0.005, 0.03, 0.02, 0.05)*0.3, 400), 0, 0.7),
    (rattle, 0, 0.5),
)
save('enemy_death', fade(norm(sig)))

# notification
sig = lp(tn(1200, 0.2)*ev(0.2, 0.002, 0.03, 0.1, 0.1) + tn(1800, 0.12)*ev(0.12, 0.002, 0.02, 0.05, 0.08)*0.3, 4000)
save('notification', fade(norm(sig)))

# document_found
sig = mk(0.5,
    (bp(nz(0.2)*ev(0.2, 0.4, 0.02, 0.1, 0.05)*0.5, 3000, 8000, 2), 0, 0.5),
    (np.sin(2*np.pi*750*np.linspace(0, 0.2, int(SR*0.2), False) + np.sin(2*np.pi*1500*np.linspace(0, 0.2, int(SR*0.2), False))*3.0) * ev(0.2, 0.005, 0.03, 0.15, 0.1) * 0.7, 0.15, 1.0),
)
save('document_found', fade(norm(sig)))

# map_open
sig = bp(nz(0.3)*ev(0.3, 0.4, 0.02, 0.08, 0.1)*0.5, 2000, 6000, 2)
save('map_open', fade(norm(sig)))

# transfer
sig = tn(1000, 0.2)*ev(0.2, 0.4, 0.01, 0.05, 0.08) + tn(1200, 0.12)*ev(0.12, 0.3, 0.01, 0.03, 0.05)*0.3
save('transfer', fade(norm(sig)))

print('All missing sounds generated!')
