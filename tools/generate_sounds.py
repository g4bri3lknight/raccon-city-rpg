#!/usr/bin/env python3
"""Raccoon City RPG - Realistic Sound Generator using scipy/numpy DSP."""
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
import os, random

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio')
SR = 44100

def norm(a, peak=0.85):
    mx = np.max(np.abs(a))
    if mx < 1e-9: return a
    return np.clip(a / mx * peak, -1.0, 1.0)

def fade(a, ms=5):
    n = int(SR * ms / 1000)
    if len(a) < 2 * n: return a
    a = a.copy(); env = np.ones(len(a))
    env[:n] = np.linspace(0, 1, n); env[-n:] = np.linspace(1, 0, n)
    return a * env

def lp(sig, freq, order=4):
    b, a = butter(order, freq / (SR / 2), btype='low'); return lfilter(b, a, sig)

def hp(sig, freq, order=2):
    b, a = butter(order, freq / (SR / 2), btype='high'); return lfilter(b, a, sig)

def bp(sig, lo, hi, order=2):
    b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], btype='band'); return lfilter(b, a, sig)

def nz(dur): return np.random.randn(int(SR * dur))

def tone(freq, dur):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False); return np.sin(2 * np.pi * freq * t)

def env(dur, a=0.01, d=0.1, s=0.7, r=0.2):
    n = int(SR * dur); e = np.zeros(n)
    for i in range(n):
        t = i / SR
        if t < a: e[i] = t / a if a > 0 else 1
        elif t < a + d: e[i] = 1.0 - (1.0 - s) * ((t - a) / d) if d > 0 else s
        elif t < dur - r: e[i] = s
        else: e[i] = s * ((dur - t) / r) if r > 0 else 0
    return e

def reverb(sig, decay=0.3, n_taps=6):
    out = sig.copy()
    for i in range(n_taps):
        delay = int(SR * (0.02 + i * 0.03 * (1 + random.random() * 0.5)))
        gain = decay * (0.7 ** i)
        if delay < len(sig):
            shifted = np.zeros(len(sig) + delay); shifted[delay:delay+len(sig)] = sig * gain
            shifted = lp(shifted, 3000 - i * 200)
            out = out + shifted[:len(out)]
    return out

def distort(sig, amount=2.0): return np.tanh(sig * amount)

def arr(sig, target_len, offset=0):
    """Place sig into a zero array at offset."""
    out = np.zeros(target_len); n = min(len(sig), target_len - offset)
    if n > 0: out[offset:offset+n] = sig[:n]
    return out

# === SOUNDS ===

def zombie_moan():
    dur = 1.2; t = np.linspace(0, dur, int(SR*dur), False)
    bf = 120 + 20*np.sin(2*np.pi*0.8*t)
    sig = sum((1.0/(h**0.8))*np.sin(2*np.pi*bf*h*t + random.random()*0.5) for h in range(1,8))
    sig = bp(sig, 300, 800, 3)*0.7 + bp(sig, 1200, 2500, 3)*0.4
    sig += bp(nz(dur)*0.15, 2000, 5000)
    sig *= env(dur, 0.15, 0.3, 0.5, 0.5) * (1 + 0.3*np.sin(2*np.pi*3.5*t))
    f2 = 180+15*np.sin(2*np.pi*1.2*t)
    m2 = sum((1.0/h)*np.sin(2*np.pi*f2*h*t) for h in range(1,5))
    m2 = bp(m2, 400, 1200, 3)*0.25*env(dur, 0.3, 0.2, 0.3, 0.4)*(1+0.2*np.sin(2*np.pi*4*t))
    sig += m2; return fade(norm(sig))

def zombie_attack():
    dur = 0.6; sig = np.zeros(int(SR*dur))
    slap = nz(0.08)*env(0.08, 0.001, 0.04, 0.3, 0.05); slap = bp(slap, 800, 4000, 2); slap = lp(slap, 3500)
    thud = tone(80, 0.15)*env(0.15, 0.001, 0.05, 0.2, 0.08) + tone(150, 0.1)*env(0.1, 0.001, 0.03, 0.1, 0.05)*0.5; thud = lp(thud, 300)
    gd = 0.4; gt = np.linspace(0, gd, int(SR*gd), False)
    growl = sum((1.0/(h**0.7))*np.sin(2*np.pi*(100+h*10+10*np.sin(2*np.pi*8*gt))*h*gt) for h in range(1,6))
    growl = bp(growl, 150, 1500, 3)*env(gd, 0.01, 0.1, 0.3, 0.2) + nz(gd)*bp(nz(gd), 2000, 4000, 2)*0.2*env(gd, 0.01, 0.1, 0.15, 0.15)
    sig += arr(slap*0.8, len(sig)); sig += arr(thud*0.6, len(sig)); sig += arr(growl*0.5, len(sig), int(SR*0.05))
    return fade(norm(sig))

def zombie_death():
    dur = 1.5; t = np.linspace(0, dur, int(SR*dur), False)
    freq = 150 - 80*(t/dur)**0.5
    sig = sum((1.0/h)*np.sin(2*np.pi*freq*h*t) for h in range(1,6))
    sig = bp(sig, 100, 1000, 3)*env(dur, 0.05, 0.4, 0.2, 0.6)*(1-0.5*(t/dur)**2)
    gurgle = nz(dur)*0.3; gurgle = bp(gurgle, 300, 2000, 2)*(0.5+0.5*np.sin(2*np.pi*12*t))*env(dur, 0.1, 0.2, 0.15, 0.5)
    sig += gurgle
    thud = tone(60, 0.3)*env(0.3, 0.001, 0.1, 0.1, 0.15) + nz(0.15)*env(0.15, 0.001, 0.05, 0.05, 0.05)*0.5; thud = lp(thud, 400)
    sig += arr(thud*0.7, len(sig), int(SR*0.8)); return fade(norm(sig))

def pistol_shot():
    dur = 0.8; sig = np.zeros(int(SR*dur))
    crack = nz(0.04)*env(0.04, 0.0005, 0.01, 0.1, 0.015); crack = hp(crack, 800); crack = lp(crack, 8000)
    crack += tone(1200, 0.02)*env(0.02, 0.0005, 0.008, 0.1, 0.01)
    thump = tone(80, 0.12)*env(0.12, 0.001, 0.04, 0.2, 0.06) + tone(160, 0.08)*env(0.08, 0.001, 0.03, 0.1, 0.04)*0.5; thump = lp(thump, 500)
    click = tone(3000, 0.02)*env(0.02, 0.001, 0.005, 0.05, 0.01)*0.3; click = hp(click, 2000)
    sig += arr(crack, len(sig)); sig += arr(thump*0.8, len(sig)); sig += arr(click*0.4, len(sig))
    echo = crack*0.15; sig += arr(echo, len(sig), int(SR*0.15))
    sig = reverb(sig, 0.15, 4); return fade(norm(sig))

def shotgun_blast():
    dur = 1.0; sig = np.zeros(int(SR*dur))
    boom = lp(distort(nz(0.15)*env(0.15, 0.001, 0.08, 0.3, 0.1), 1.5), 4000)
    thump = tone(50, 0.2)*env(0.2, 0.001, 0.05, 0.3, 0.1) + tone(100, 0.15)*env(0.15, 0.001, 0.04, 0.15, 0.08)*0.6; thump = lp(thump, 300)
    pump = bp(nz(0.15)*env(0.15, 0.005, 0.03, 0.1, 0.05), 500, 3000, 2) + tone(200, 0.08)*env(0.08, 0.005, 0.02, 0.05, 0.03)*0.4
    sig += arr(boom, len(sig)); sig += arr(thump*0.7, len(sig)); sig += arr(pump*0.4, len(sig), int(SR*0.3))
    sig = reverb(sig, 0.2, 5); return fade(norm(sig))

def magnum_shot():
    dur = 1.2; sig = np.zeros(int(SR*dur))
    crack = nz(0.06)*env(0.06, 0.0003, 0.02, 0.15, 0.02); crack = hp(crack, 500); crack = lp(crack, 10000)
    crack += tone(800, 0.03)*env(0.03, 0.0003, 0.01, 0.1, 0.01)
    thump = tone(35, 0.25)*env(0.25, 0.001, 0.08, 0.3, 0.12) + tone(70, 0.2)*env(0.2, 0.001, 0.06, 0.15, 0.1)*0.7 + tone(140, 0.1)*env(0.1, 0.001, 0.03, 0.05, 0.05)*0.3
    thump = lp(thump, 200)
    sig += arr(crack, len(sig)); sig += arr(thump*0.9, len(sig))
    ring = lp(tone(60, 0.6)*env(0.6, 0.01, 0.1, 0.08, 0.4), 150)
    sig += arr(ring*0.3, len(sig), int(SR*0.12))
    sig = reverb(sig, 0.25, 6); return fade(norm(sig))

def attack():
    dur = 0.4; sig = np.zeros(int(SR*dur))
    swoosh = nz(dur); sweep = 2000 + 6000*(np.linspace(0, dur, int(SR*dur), False)/dur)
    for i in range(20):
        lo = max(200, int(sweep[i*len(swoosh)//20]-1000)); hi = min(15000, int(sweep[i*len(swoosh)//20]+500))
        s, e = i*len(swoosh)//20, (i+1)*len(swoosh)//20; swoosh[s:e] = bp(swoosh[s:e], lo, hi, 1)
    swoosh *= env(dur, 0.01, 0.1, 0.2, 0.15)
    ring = (tone(4000, 0.15)*env(0.15, 0.001, 0.02, 0.1, 0.1)*0.3 + tone(6000, 0.1)*env(0.1, 0.001, 0.015, 0.05, 0.05)*0.2); ring = hp(ring, 2000)
    sig += arr(swoosh, len(sig)); sig += arr(ring, len(sig), int(SR*0.05)); return fade(norm(sig))

def ranged_attack():
    dur = 0.6; sig = np.zeros(int(SR*dur))
    crack = nz(0.035)*env(0.035, 0.0005, 0.01, 0.1, 0.01); crack = hp(crack, 1000); crack = lp(crack, 7000)
    thump = lp(tone(90, 0.1)*env(0.1, 0.001, 0.03, 0.15, 0.05), 400)
    sig += arr(crack*0.9, len(sig)); sig += arr(thump*0.7, len(sig)); return fade(norm(sig))

def special_attack():
    dur = 1.0; sig = np.zeros(int(SR*dur))
    cd = 0.3; ct = np.linspace(0, cd, int(SR*cd), False)
    freq_sweep = 200 + 2000*(ct/cd)**2
    charge = np.sin(2*np.pi*np.cumsum(freq_sweep)/SR)*env(cd, 0.01, 0.1, 0.2, 0.05); charge = lp(charge, 4000)
    blast = lp(nz(0.3)*env(0.3, 0.001, 0.1, 0.3, 0.15), 5000) + tone(100, 0.3)*env(0.3, 0.001, 0.08, 0.2, 0.15)*0.5
    sig += arr(charge*0.7, len(sig)); sig += arr(blast*0.9, len(sig), int(SR*0.25))
    sig = reverb(sig, 0.2, 5); return fade(norm(sig))

def enemy_hit():
    dur = 0.25; sig = np.zeros(int(SR*dur))
    thwack = bp(nz(0.06)*env(0.06, 0.001, 0.02, 0.1, 0.02), 200, 3000, 2)
    impact = lp(tone(150, 0.1)*env(0.1, 0.001, 0.03, 0.1, 0.05) + tone(300, 0.05)*env(0.05, 0.001, 0.015, 0.05, 0.02)*0.4, 800)
    sig += arr(thwack*0.9, len(sig)); sig += arr(impact*0.7, len(sig)); return fade(norm(sig))

def player_hit():
    dur = 0.3; sig = np.zeros(int(SR*dur))
    thud = lp(tone(80, 0.15)*env(0.15, 0.001, 0.05, 0.1, 0.06) + nz(0.1)*env(0.1, 0.001, 0.03, 0.05, 0.04)*0.5, 600)
    gd = 0.15; gt = np.linspace(0, gd, int(SR*gd), False)
    freq = 200*(1-0.3*gt/gd); grunt = bp(sum((1.0/h)*np.sin(2*np.pi*freq*h*gt) for h in range(1,4)), 100, 800, 2)*env(gd, 0.005, 0.04, 0.2, 0.05)
    sig += arr(thud*0.8, len(sig)); sig += arr(grunt*0.5, len(sig)); return fade(norm(sig))

def heal():
    dur = 0.8; t = np.linspace(0, dur, int(SR*dur), False)
    mod = np.sin(2*np.pi*1200*t)*3.0; sig = np.sin(2*np.pi*800*t+mod)
    mod2 = np.sin(2*np.pi*1800*t)*2.5; sig += np.sin(2*np.pi*1200*t+mod2)*0.5
    sig *= env(dur, 0.005, 0.2, 0.3, 0.4)*(1+0.5*np.sin(2*np.pi*6*t)); sig = lp(sig, 4000)
    sig = reverb(sig, 0.3, 8); return fade(norm(sig))

def explosion():
    dur = 2.0; sig = np.zeros(int(SR*dur))
    blast = lp(distort(nz(0.5)*env(0.5, 0.001, 0.2, 0.4, 0.2), 2.0), 3000)
    rumble = tone(30, 1.5)*env(1.5, 0.01, 0.3, 0.3, 0.6) + tone(60, 1.2)*env(1.2, 0.01, 0.2, 0.2, 0.5)*0.6 + tone(120, 0.8)*env(0.8, 0.01, 0.15, 0.1, 0.4)*0.3
    rumble = lp(rumble, 200)
    debris = lp(hp(nz(0.6)*env(0.6, 0.05, 0.2, 0.1, 0.3), 2000), 8000)
    sig += arr(blast, len(sig)); sig += arr(rumble*0.8, len(sig)); sig += arr(debris*0.3, len(sig), int(SR*0.05))
    sig = reverb(sig, 0.4, 8); return fade(norm(sig, 0.9))

def cerberus_attack():
    dur = 0.5; sig = np.zeros(int(SR*dur))
    snap = bp(nz(0.03)*env(0.03, 0.001, 0.01, 0.1, 0.01), 1000, 6000, 2)
    gd = 0.35; gt = np.linspace(0, gd, int(SR*gd), False)
    growl = bp(sum((1.0/(h**0.6))*np.sin(2*np.pi*(80+h*15)*gt) for h in range(1,5)), 100, 800, 3)*env(gd, 0.005, 0.08, 0.3, 0.15)
    sig += arr(snap*0.9, len(sig)); sig += arr(growl*0.6, len(sig), int(SR*0.03)); return fade(norm(sig))

def hunter_attack():
    dur = 0.7; sig = np.zeros(int(SR*dur))
    swoosh = bp(nz(0.12)*env(0.12, 0.003, 0.04, 0.2, 0.05), 1500, 7000, 2)
    impact = lp(tone(100, 0.15)*env(0.15, 0.001, 0.04, 0.2, 0.06) + nz(0.08)*env(0.08, 0.001, 0.02, 0.05, 0.03)*0.4, 600)
    rd = 0.4; rt = np.linspace(0, rd, int(SR*rd), False)
    roar = bp(sum((1.0/(h**0.7))*np.sin(2*np.pi*(90+h*12)*rt) for h in range(1,7)), 80, 1200, 3)*env(rd, 0.01, 0.1, 0.3, 0.15)
    sig += arr(swoosh*0.9, len(sig)); sig += arr(impact*0.7, len(sig), int(SR*0.05)); sig += arr(roar*0.6, len(sig), int(SR*0.08))
    return fade(norm(sig))

def licker_attack():
    dur = 0.5; sig = np.zeros(int(SR*dur))
    lash = bp(nz(0.08)*env(0.08, 0.001, 0.02, 0.15, 0.03), 1500, 8000, 2)
    sd = 0.25; st = np.linspace(0, sd, int(SR*sd), False)
    screech = hp((tone(2000, sd)*env(sd, 0.01, 0.05, 0.2, 0.1) + tone(3500, sd)*env(sd, 0.01, 0.04, 0.1, 0.08)*0.5), 1000)
    screech *= (1+0.3*np.sin(2*np.pi*15*st))
    sig += arr(lash*0.8, len(sig)); sig += arr(screech*0.5, len(sig), int(SR*0.04)); return fade(norm(sig))

def tyrant_attack():
    dur = 1.2; sig = np.zeros(int(SR*dur))
    slam = lp(distort(nz(0.3)*env(0.3, 0.001, 0.1, 0.3, 0.15), 1.5), 2000)
    shock = lp(tone(30, 0.8)*env(0.8, 0.01, 0.2, 0.2, 0.4) + tone(60, 0.6)*env(0.6, 0.01, 0.15, 0.15, 0.3)*0.6, 150)
    crumble = bp(nz(0.5)*env(0.5, 0.05, 0.2, 0.1, 0.2), 500, 5000, 2)
    sig += arr(slam, len(sig)); sig += arr(shock*0.7, len(sig)); sig += arr(crumble*0.3, len(sig), int(SR*0.05))
    sig = reverb(sig, 0.3, 6); return fade(norm(sig, 0.9))

def nemesis_attack():
    dur = 1.5; sig = np.zeros(int(SR*dur))
    launch = lp(nz(0.3)*env(0.3, 0.01, 0.1, 0.3, 0.1), 3000) + tone(200, 0.3)*env(0.3, 0.01, 0.08, 0.2, 0.1)*0.5
    boom = lp(distort(nz(0.4)*env(0.4, 0.001, 0.15, 0.3, 0.15), 1.8), 2500) + tone(40, 0.6)*env(0.6, 0.01, 0.15, 0.2, 0.3)*0.6
    rd = 0.6; rt = np.linspace(0, rd, int(SR*rd), False)
    roar = bp(sum((1.0/(h**0.6))*np.sin(2*np.pi*(70+h*10)*rt) for h in range(1,8)), 60, 1000, 3)*env(rd, 0.02, 0.15, 0.3, 0.2)
    sig += arr(launch*0.7, len(sig)); sig += arr(boom*0.9, len(sig), int(SR*0.15)); sig += arr(roar*0.5, len(sig), int(SR*0.5))
    sig = reverb(sig, 0.3, 6); return fade(norm(sig, 0.9))

def miss():
    dur = 0.3; t = np.linspace(0, dur, int(SR*dur), False)
    sig = nz(dur); sweep = 5000-3000*(t/dur)
    for i in range(15):
        lo = max(300, int(sweep[i*len(sig)//15]-800)); hi = min(10000, int(sweep[i*len(sig)//15]+400))
        s, e = i*len(sig)//15, (i+1)*len(sig)//15; sig[s:e] = bp(sig[s:e], lo, hi, 1)
    sig *= env(dur, 0.005, 0.08, 0.1, 0.1)*0.6; return fade(norm(sig))

def critical_hit():
    dur = 0.4; sig = np.zeros(int(SR*dur))
    crunch = bp(distort(nz(0.1)*env(0.1, 0.001, 0.03, 0.1, 0.03), 2.0), 200, 4000, 2)
    impact = lp(tone(60, 0.2)*env(0.2, 0.001, 0.05, 0.2, 0.08) + tone(120, 0.12)*env(0.12, 0.001, 0.03, 0.1, 0.05)*0.5, 500)
    ring = tone(2000, 0.3)*env(0.3, 0.005, 0.05, 0.1, 0.2)*0.15
    sig += arr(crunch, len(sig)); sig += arr(impact*0.7, len(sig)); sig += arr(ring*0.3, len(sig), int(SR*0.03))
    return fade(norm(sig))

def defend():
    dur = 0.4; sig = np.zeros(int(SR*dur))
    mod = np.sin(2*np.pi*2500*1.414*np.linspace(0, dur, int(SR*dur), False))*4.0
    ring = (np.sin(2*np.pi*2500*np.linspace(0, dur, int(SR*dur), False)+mod)*env(dur, 0.001, 0.05, 0.15, 0.3) +
            np.sin(2*np.pi*3800*np.linspace(0, dur, int(SR*dur), False)+mod*0.5)*env(dur, 0.001, 0.03, 0.08, 0.25)*0.5)*0.8
    impact = bp(nz(0.04)*env(0.04, 0.001, 0.01, 0.1, 0.01)*0.4, 1000, 6000, 2)
    sig += arr(ring, len(sig)); sig += arr(impact*0.5, len(sig)); return fade(norm(sig))

def poison_tick():
    dur = 0.2; t = np.linspace(0, dur, int(SR*dur), False)
    sig = tone(400, dur)*np.sin(2*np.pi*8*t)*env(dur, 0.005, 0.03, 0.1, 0.1); return fade(norm(bp(sig, 200, 800, 2)))

def bleed_tick():
    dur = 0.15; sig = lp(tone(300, dur)*env(dur, 0.003, 0.02, 0.05, 0.05)*0.6, 500); return fade(norm(sig))

def victory():
    dur = 2.0; sig = np.zeros(int(SR*dur))
    for i, note in enumerate([261.63, 329.63, 392.0, 523.25]):
        start = i*0.08; nd = dur-start-0.3
        if nd <= 0: continue
        nt = np.linspace(0, nd, int(SR*nd), False)
        mod = np.sin(2*np.pi*note*2.0*nt)*2.5
        ts = np.sin(2*np.pi*note*nt+mod)*env(nd, 0.01, 0.1, 0.3, 0.3)*(0.6-i*0.08)
        sig += arr(ts, len(sig), int(SR*start))
    sig = reverb(lp(sig, 5000), 0.4, 10); return fade(norm(sig))

def gameover():
    dur = 3.0; t = np.linspace(0, dur, int(SR*dur), False)
    freq = 220*np.exp(-0.5*t/dur)
    sig = lp(sum(np.sin(2*np.pi*freq*h*t)*(0.5/h) for h in [1, 1.2, 1.5, 2]), 2000)*env(dur, 0.3, 1.0, 0.15, 1.0)
    sig += np.sin(2*np.pi*233*t)*0.15*env(dur, 0.5, 0.5, 0.1, 1.0)
    sig = reverb(sig, 0.5, 8); return fade(norm(sig))

def item_pickup():
    dur = 0.3; sig = np.zeros(int(SR*dur))
    mod = np.sin(2*np.pi*1600*np.linspace(0, dur, int(SR*dur), False))*3.0
    sig += np.sin(2*np.pi*800*np.linspace(0, dur, int(SR*dur), False)+mod)*env(dur, 0.003, 0.05, 0.15, 0.15)
    d2 = 0.22; t2 = np.linspace(0, d2, int(SR*d2), False)
    mod2 = np.sin(2*np.pi*2000*t2)*2.5
    sig += arr(np.sin(2*np.pi*1000*t2+mod2)*0.6, len(sig), int(SR*0.08))
    return fade(norm(sig))

def menu_open():
    dur = 0.08; return fade(norm(bp(nz(dur)*env(dur, 0.001, 0.02, 0.1, 0.02)*0.4, 2000, 6000, 2)))

def menu_close():
    dur = 0.06; return fade(norm(bp(nz(dur)*env(dur, 0.001, 0.01, 0.05, 0.02)*0.3, 3000, 7000, 2)))

def notification():
    dur = 0.2; sig = tone(1200, dur)*env(dur, 0.002, 0.03, 0.1, 0.1) + tone(1800, dur*0.6)*env(dur, 0.002, 0.02, 0.05, 0.08)*0.3
    return fade(norm(lp(sig, 4000)))

def level_up():
    dur = 0.8; sig = np.zeros(int(SR*dur))
    for i, note in enumerate([523.25, 659.25, 783.99, 1046.50]):
        nd = 0.15; nt = np.linspace(0, nd, int(SR*nd), False)
        mod = np.sin(2*np.pi*note*2*nt)*2.0; ts = np.sin(2*np.pi*note*nt+mod)*env(nd, 0.005, 0.03, 0.2, 0.05)
        sig += arr(ts, len(sig), int(SR*i*0.12))
    return fade(norm(reverb(sig, 0.2, 6)))

def travel():
    dur = 0.6; t = np.linspace(0, dur, int(SR*dur), False)
    sig = nz(dur)*0.5; sweep = 3000*(1-abs(2*t/dur-1))
    for i in range(20):
        lo = max(200, int(sweep[i*len(sig)//20]-500)); hi = min(10000, int(sweep[i*len(sig)//20]+500))
        s, e = i*len(sig)//20, (i+1)*len(sig)//20; sig[s:e] = bp(sig[s:e], lo, hi, 1)
    sig *= env(dur, 0.05, 0.15, 0.2, 0.15); return fade(norm(sig))

def search():
    dur = 0.5; t = np.linspace(0, dur, int(SR*dur), False)
    sig = bp(nz(dur)*0.3, 3000, 8000, 2)*(0.5+0.5*np.sin(2*np.pi*20*t))*env(dur, 0.02, 0.1, 0.15, 0.15)
    clink = tone(3000, 0.05)*env(0.05, 0.002, 0.01, 0.05, 0.02)*0.2
    sig += arr(clink, len(sig), int(SR*(0.2+random.random()*0.1))); return fade(norm(sig))

def encounter():
    dur = 0.5; sig = np.zeros(int(SR*dur))
    sig += arr(lp((tone(200, dur)*0.4 + tone(253, dur)*0.3 + tone(150, dur)*0.3)*env(dur, 0.005, 0.1, 0.2, 0.2), 1500), len(sig))
    burst = bp(nz(0.08)*env(0.08, 0.001, 0.02, 0.1, 0.02)*0.5, 500, 3000, 2)
    sig += arr(burst, len(sig)); return fade(norm(sig))

def taunt():
    dur = 0.3; sig = tone(600, dur)*env(dur, 0.005, 0.05, 0.1, 0.1) + tone(400, dur)*env(dur, 0.005, 0.05, 0.1, 0.1)*0.5
    return fade(norm(lp(sig, 2000)))

def puzzle_success():
    dur = 0.6; sig = np.zeros(int(SR*dur))
    for i, note in enumerate([784, 988, 1175]):
        nd = 0.2; nt = np.linspace(0, nd, int(SR*nd), False)
        mod = np.sin(2*np.pi*note*2*nt)*2.0; ts = np.sin(2*np.pi*note*nt+mod)*env(nd, 0.005, 0.03, 0.2, 0.08)
        sig += arr(ts, len(sig), int(SR*i*0.15))
    return fade(norm(reverb(sig, 0.15, 5)))

def puzzle_fail():
    dur = 0.5; sig = (tone(150, dur)*env(dur, 0.01, 0.1, 0.2, 0.15) + tone(155, dur)*env(dur, 0.01, 0.1, 0.2, 0.15)*0.8)
    return fade(norm(lp(sig, 500)))

def achievement():
    dur = 1.2; sig = np.zeros(int(SR*dur))
    for i, note in enumerate([523.25, 659.25, 783.99, 1046.50, 1318.51]):
        nd = 0.25; nt = np.linspace(0, nd, int(SR*nd), False)
        mod = np.sin(2*np.pi*note*1.5*nt)*2.5; ts = np.sin(2*np.pi*note*nt+mod)*env(nd, 0.005, 0.04, 0.25, 0.1)*(0.5-i*0.05)
        sig += arr(ts, len(sig), int(SR*i*0.1))
    return fade(norm(reverb(sig, 0.3, 8)))

def document_found():
    dur = 0.5; sig = np.zeros(int(SR*dur))
    paper = bp(nz(0.2)*env(0.2, 0.4, 0.02, 0.1, 0.05, 0.05), 3000, 8000, 2)*0.5
    dt = np.linspace(0, 0.2, int(SR*0.2), False); mod = np.sin(2*np.pi*1500*dt)*3.0
    ding = np.sin(2*np.pi*750*dt+mod)*env(0.2, 0.005, 0.03, 0.15, 0.1)*0.7
    sig += arr(paper, len(sig)); sig += arr(ding, len(sig), int(SR*0.15)); return fade(norm(sig))

def npc_encounter():
    dur = 0.4; sig = np.zeros(int(SR*dur))
    sig += arr(tone(600, 0.15)*env(0.15, 0.005, 0.03, 0.15, 0.05)*0.6, len(sig))
    sig += arr(tone(800, 0.15)*env(0.15, 0.005, 0.03, 0.15, 0.05)*0.6, len(sig), int(SR*0.12))
    return fade(norm(reverb(sig, 0.1, 4)))

def ambient_city():
    dur = 4.0; t = np.linspace(0, dur, int(SR*dur), False)
    wind = lp(nz(dur)*0.15, 800)*(0.5+0.5*np.sin(2*np.pi*0.3*t))
    sig = wind.copy()
    sd = 2.0; st = np.linspace(0, sd, int(SR*sd), False)
    sf = 600+200*np.sin(2*np.pi*1.5*st); siren = np.sin(np.cumsum(2*np.pi*sf/SR))*env(sd, 0.5, 0.3, 0.2, 0.5)*0.08
    sig += arr(lp(siren, 2000), len(sig), int(SR*0.5))
    for _ in range(3):
        p = int(random.random()*SR*(dur-0.1)); d = bp(nz(0.05)*env(0.05, 0.01, 0.01, 0.02, 0.02)*0.1, 1000, 5000, 2)
        sig += arr(d, len(sig), p)
    return fade(norm(sig), 0.7)

def ambient_rpd():
    dur = 4.0; t = np.linspace(0, dur, int(SR*dur), False)
    sig = lp(nz(dur)*0.1, 300)*(0.5+0.5*np.sin(2*np.pi*0.2*t))
    for _ in range(4):
        p = int(random.random()*SR*(dur-0.3)); cd = 0.2+random.random()*0.2
        c = bp(tone(300+random.random()*200, cd)*env(cd, 0.02, 0.05, 0.05, 0.1)*0.12, 200, 800, 2)
        sig += arr(c, len(sig), p)
    sig += arr(lp(nz(0.1)*env(0.1, 0.001, 0.03, 0.05, 0.04)*0.15, 2000), len(sig), int(SR*2.5))
    return fade(norm(sig), 0.6)

def ambient_hospital():
    dur = 4.0; t = np.linspace(0, dur, int(SR*dur), False)
    hf = 120+5*np.sin(2*np.pi*0.1*t)
    sig = lp(tone(hf, dur)*0.08 + tone(hf*2, dur)*0.04, 500)
    for i in range(8):
        p = int(SR*(0.5+i*0.45+random.random()*0.05)); sig += arr(tone(1000, 0.06)*env(0.06, 0.002, 0.01, 0.03, 0.02)*0.12, len(sig), p)
    for _ in range(2):
        p = int(random.random()*SR*(dur-0.2)); sig += arr(hp(nz(0.15)*env(0.15, 0.02, 0.03, 0.03, 0.05)*0.06, 4000), len(sig), p)
    return fade(norm(sig), 0.6)

def ambient_sewers():
    dur = 4.0; t = np.linspace(0, dur, int(SR*dur), False)
    sig = bp(nz(dur)*0.1, 200, 2000, 2)*(0.5+0.5*np.sin(2*np.pi*0.15*t))
    for _ in range(8):
        p = int(random.random()*SR*(dur-0.1)); sig += arr(tone(3000+random.random()*2000, 0.04)*env(0.04, 0.001, 0.005, 0.02, 0.02)*0.15, len(sig), p)
    return fade(norm(sig), 0.6)

def ambient_laboratory():
    dur = 4.0; t = np.linspace(0, dur, int(SR*dur), False)
    sig = lp(tone(60, dur)*0.08 + tone(120, dur)*0.05 + tone(180, dur)*0.03, 300)*(0.7+0.3*np.sin(2*np.pi*0.25*t))
    for _ in range(3):
        p = int(random.random()*SR*(dur-0.2)); bd = 0.15; bt = np.linspace(0, bd, int(SR*bd), False)
        sig += arr(lp(tone(120+random.random()*30, bd)*0.06*(0.5+0.5*np.sin(2*np.pi*60*bt)), 500), len(sig), p)
    return fade(norm(sig), 0.6)

def ambient_clocktower():
    dur = 4.0; t = np.linspace(0, dur, int(SR*dur), False)
    sig = lp(nz(dur)*0.06, 800)*(0.5+0.5*np.sin(2*np.pi*0.3*t))
    for i in range(int(dur*2)):
        p = int(SR*(i*0.5)); sig += arr(tone(4000, 0.01)*env(0.01, 0.001, 0.002, 0.02, 0.005)*0.1, len(sig), p)
    bt = np.linspace(0, 2.0, int(SR*2.0), False)
    bell = np.sin(2*np.pi*200*bt + np.sin(2*np.pi*200*1.5*bt)*3.0)*env(2.0, 0.01, 0.3, 0.1, 1.0)*0.2
    sig += arr(lp(bell, 1000), len(sig)); return fade(norm(sig), 0.6)

def enemy_death():
    dur = 0.8; sig = np.zeros(int(SR*dur))
    thud = lp(tone(60, 0.2)*env(0.2, 0.001, 0.05, 0.1, 0.1) + nz(0.1)*env(0.1, 0.005, 0.03, 0.02, 0.05)*0.3, 400)
    rd = 0.4; rt = np.linspace(0, rd, int(SR*rd), False)
    rattle = bp(nz(rd)*0.15, 200, 1500, 2)*(0.5+0.5*np.sin(2*np.pi*15*rt))*env(rd, 0.01, 0.1, 0.05, 0.2)
    sig += arr(thud*0.7, len(sig)); sig += arr(rattle*0.5, len(sig)); return fade(norm(sig))

def cerberus_death():
    dur = 1.0; t = np.linspace(0, dur, int(SR*dur), False); f = 300-200*(t/dur)
    whine = bp(sum((1.0/h)*np.sin(2*np.pi*f*h*t) for h in range(1,4)), 150, 1200, 3)*env(dur, 0.05, 0.3, 0.1, 0.4)
    sig = np.zeros(int(SR*dur)); sig += arr(whine*0.7, len(sig))
    sig += arr(tone(50, 0.2)*env(0.2, 0.01, 0.05, 0.08, 0.1)*0.5, len(sig), int(SR*0.5))
    return fade(norm(sig))

def licker_death():
    dur = 0.8; sig = np.zeros(int(SR*dur))
    sd = 0.3; st = np.linspace(0, sd, int(SR*sd), False)
    screech = hp(tone(2500, sd)*env(sd, 0.01, 0.05, 0.15, 0.1)*(1+0.5*np.sin(2*np.pi*20*st)), 800)
    sig += arr(screech*0.7, len(sig)); sig += arr(tone(50, 0.15)*env(0.15, 0.01, 0.03, 0.05, 0.08)*0.5, len(sig), int(SR*0.2))
    return fade(norm(sig))

def hunter_death():
    dur = 1.2; sig = np.zeros(int(SR*dur))
    rd = 0.5; rt = np.linspace(0, rd, int(SR*rd), False); f = 80-30*(rt/rd)
    roar = bp(sum((1.0/(h**0.6))*np.sin(2*np.pi*f*h*rt) for h in range(1,5)), 60, 1000, 3)*env(rd, 0.02, 0.15, 0.2, 0.2)*0.7
    thud = tone(35, 0.3)*env(0.3, 0.01, 0.08, 0.1, 0.15)*0.6 + nz(0.2)*env(0.2, 0.01, 0.05, 0.05, 0.1)*0.2
    sig += arr(roar, len(sig)); sig += arr(thud*0.8, len(sig), int(SR*0.4)); return fade(norm(sig))

def map_open():
    dur = 0.3; return fade(norm(bp(nz(dur)*env(dur, 0.4, 0.02, 0.08, 0.1, 0.1)*0.5, 2000, 6000, 2)))

def transfer():
    dur = 0.2; sig = tone(1000, dur)*env(dur, 0.4, 0.01, 0.05, 0.08, 0.05)
    sig += tone(1200, dur*0.6)*env(dur*0.6, 0.3, 0.01, 0.03, 0.05, 0.03)*0.3; return fade(norm(sig))

SOUNDS = {
    'attack': attack, 'ranged_attack': ranged_attack, 'pistol_shot': pistol_shot,
    'shotgun_blast': shotgun_blast, 'magnum_shot': magnum_shot, 'special_attack': special_attack,
    'defend': defend, 'enemy_hit': enemy_hit, 'player_hit': player_hit, 'miss': miss,
    'critical': critical_hit, 'heal': heal, 'poison_tick': poison_tick, 'bleed_tick': bleed_tick,
    'taunt': taunt, 'explosion': explosion,
    'zombie_moan': zombie_moan, 'zombie_attack': zombie_attack, 'zombie_death': zombie_death,
    'cerberus_attack': cerberus_attack, 'cerberus_death': cerberus_death,
    'licker_attack': licker_attack, 'licker_death': licker_death,
    'hunter_attack': hunter_attack, 'hunter_death': hunter_death,
    'tyrant_attack': tyrant_attack, 'nemesis_attack': nemesis_attack, 'enemy_death': enemy_death,
    'encounter': encounter, 'victory': victory, 'gameover': gameover,
    'item_pickup': item_pickup, 'menu_open': menu_open, 'menu_close': menu_close,
    'notification': notification, 'level_up': level_up, 'document_found': document_found,
    'npc_encounter': npc_encounter, 'puzzle_fail': puzzle_fail, 'puzzle_success': puzzle_success,
    'achievement': achievement, 'map_open': map_open, 'transfer': transfer, 'travel': travel, 'search': search,
    'ambient_city': ambient_city, 'ambient_rpd': ambient_rpd, 'ambient_hospital': ambient_hospital,
    'ambient_sewers': ambient_sewers, 'ambient_laboratory': ambient_laboratory, 'ambient_clocktower': ambient_clocktower,
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    print(f"Generating {len(SOUNDS)} sounds at {SR}Hz...")
    for name, fn in SOUNDS.items():
        try:
            sig = fn(); audio = (sig * 32767).astype(np.int16)
            path = os.path.join(OUT, f'{name}.wav')
            wavfile.write(path, SR, audio)
            print(f"  OK {name}.wav ({os.path.getsize(path)//1024}KB)")
        except Exception as e:
            print(f"  ERR {name}: {e}")
    print(f"Done! {len(os.listdir(OUT))} files in {OUT}")
