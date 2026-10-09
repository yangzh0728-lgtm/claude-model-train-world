"""生成配乐：120 BPM、4/4、105 小节（210 秒），按 9 章分段编曲，纯 numpy 合成。

    python3 scripts/make-score.py [输出路径]      # 默认 public/audio/score.wav

段落（小节号与 src/timeline.json 一致）：
    0 启动   1–5    终端光标的滴答声、低频嗡鸣、噪声上升 → 第 6 小节大爆炸重击
    1 原初   6–15   宽广的铺底和弦 + 十六分琶音，半速底鼓
    2 定律  16–25   四拍底鼓、反拍镲、拍手，主旋律从第 20 小节进来
    3 生命  26–34   先抽掉鼓只剩木琴似的拨弦，第 28 小节鼓回来
    4 机器  35–46   方波芯片琶音、十六分镲、门限贝斯，第 46 小节上升
    5 网络  47–55   摩尔斯电码滴答、滚动贝斯、军鼓滚奏推向高潮
    6 学习  56–67   第 59 小节副歌爆发：超级锯齿和弦 + 侧链 + 主旋律
    7 崩溃  68–76   卡顿、降采样、比特粉碎，第 75 小节磁带停转，第 76 小节静音一拍
    8 涌现  77–93   一个音重新开始，逐步叠回去，第 88 小节最大的副歌（主旋律高八度）
    9 相遇  94–105  只剩铺底和钟声，第 98 小节指尖相碰的重击，最后落在 A 大三和弦上
"""
import sys
import wave
import numpy as np

SR = 44100
BPM = 120
SPB = 60 / BPM
BARS = 105
DUR = 210.0
N = int(DUR * SR) + SR * 3
rng = np.random.default_rng(42)

# 总线：鼓、贝斯、和弦（受侧链压缩）、主奏、效果；另有混响发送
bus = {k: np.zeros((2, N), np.float32) for k in ('drums', 'bass', 'pad', 'lead', 'fx', 'verb')}


def T(bar, beat=0.0):
    return ((bar - 1) * 4 + beat) * SPB


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(name, t0, sig, pan=0.0, gain=1.0, verb=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N or len(sig) == 0:
        return
    sig = sig[: N - i0] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[name][0, i0:i0 + len(sig)] += sig * l * 1.414
    bus[name][1, i0:i0 + len(sig)] += sig * r * 1.414
    if verb:
        bus['verb'][0, i0:i0 + len(sig)] += sig * l * verb
        bus['verb'][1, i0:i0 + len(sig)] += sig * r * verb


def tt(dur):
    return np.arange(int(dur * SR)) / SR


# ---------------------------------------------------------------- 乐器
def kick(gain=1.0):
    t = tt(0.5)
    f = 44 + 120 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 6.5) + rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.25
    return np.tanh(s * 1.6) * gain


def hp_noise(n, order=1):
    x = rng.standard_normal(n)
    for _ in range(order):
        x = np.diff(x, prepend=0)
    return x / (2 ** order)


def clap():
    t = tt(0.35)
    n = hp_noise(len(t), 1)
    env = np.exp(-t * 20)
    for d in (0.0, 0.011, 0.022):
        env = env + (t >= d) * np.exp(-np.maximum(t - d, 0) * 120) * 0.6
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 35) * 0.5
    return (n * env + tone) * 0.55


def hat(open_=False):
    t = tt(0.4 if open_ else 0.07)
    return hp_noise(len(t), 2) * np.exp(-t * (11 if open_ else 70)) * 0.4


def crash(dur=3.0):
    t = tt(dur)
    return hp_noise(len(t), 2) * np.exp(-t * 1.6) * 0.5


def boom(dur=2.5):
    t = tt(dur)
    f = 30 + 70 * np.exp(-t * 6)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.8) * 2.2) * 0.9


def riser(dur, f0=180, f1=3000):
    t = tt(dur)
    x = t / dur
    f = f0 * (f1 / f0) ** x
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.12
    noise = hp_noise(len(t), 1 + int(1)) * 0.6
    return (tone + noise) * x ** 2


def saw(freq, dur, cutoff=4000.0, voices=1, detune=0.0, env=None, square=False):
    """加法合成的锯齿/方波；cutoff 可以是常数或随时间变化的数组。"""
    t = tt(dur)
    out = np.zeros(len(t))
    fc = cutoff if np.ndim(cutoff) else np.full(len(t), cutoff)
    for v in range(voices):
        d = 1 + detune * ((v - (voices - 1) / 2) / max(1, (voices - 1) / 2)) if voices > 1 else 1
        f = freq * d
        ph0 = rng.random() * 2 * np.pi
        kmax = int(min(16000, fc.max() * 3) / f)
        for k in range(1, max(2, kmax + 1)):
            if square and k % 2 == 0:
                continue
            w = 1.0 / k / (1 + (k * f / fc) ** 4)
            out += w * np.sin(2 * np.pi * k * f * t + ph0 * k)
    out /= max(1, voices) ** 0.5
    if env is not None:
        out *= env(t)
    return out


def adsr(a=0.01, d=0.2, s=0.7, r=0.2, dur=1.0):
    def f(t):
        e = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-3)))
        rel = np.clip((dur - t) / r, 0, 1)
        return e * rel
    return f


def pluck(freq, dur=0.6, bright=1.0):
    t = tt(dur)
    out = np.zeros(len(t))
    for k in range(1, 14):
        if k * freq > 15000:
            break
        out += (1 / k) * np.sin(2 * np.pi * k * freq * t) * np.exp(-t * (4 + k * 2.2 / bright))
    return out * np.minimum(1, t / 0.002)


def bell(freq, dur=3.0):
    t = tt(dur)
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * 2.2 * np.exp(-t * 2.5)
    return (np.sin(2 * np.pi * freq * t + mod) * np.exp(-t * 1.4) + 0.3 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 3)) * np.minimum(1, t / 0.003)


def sub(freq, dur, drive=1.0):
    t = tt(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)
    env = np.minimum(1, t / 0.005) * np.clip((dur - t) / 0.03, 0, 1)
    return np.tanh(s * drive) * env


def beep(freq, dur):
    t = tt(dur)
    return np.sign(np.sin(2 * np.pi * freq * t)) * 0.3 * np.clip((dur - t) / 0.004, 0, 1) * np.minimum(1, t / 0.002)


# ---------------------------------------------------------------- 和声
CH = {
    'Am': (45, [57, 60, 64]), 'F': (41, [57, 60, 65]), 'C': (48, [55, 60, 64]), 'G': (43, [55, 59, 62]),
    'Em': (40, [55, 59, 64]), 'Dm': (38, [57, 62, 65]), 'E': (40, [56, 59, 64]), 'A': (45, [57, 61, 64]),
}
MAIN = ['Am', 'F', 'C', 'G']
LIFE = ['F', 'G', 'Am', 'Em']
MACH = ['Am', 'G', 'F', 'E']


def chord_at(bar, prog, start):
    return CH[prog[(bar - start) % len(prog)]]


# 主旋律（两小节，拍, 时值, midi），配 Am F C G
HOOK_A = [(0, .5, 76), (.5, .5, 74), (1, 1, 72), (2, .5, 74), (2.5, .5, 76), (3, 1, 79),
          (4, .5, 77), (4.5, .5, 76), (5, 1, 72), (6, .75, 72), (6.75, .75, 74), (7.5, .5, 71)]
HOOK_B = [(0, .5, 76), (.5, .5, 79), (1, 1, 81), (2, .5, 79), (2.5, .5, 76), (3, 1, 74),
          (4, .5, 72), (4.5, .5, 74), (5, 1, 76), (6, 1.5, 74), (7.5, .5, 72)]


# ---------------------------------------------------------------- 乐句生成器
def drums(b0, b1, kick_beats=(0, 1, 2, 3), clap_beats=(1, 3), hats='off', kgain=1.0, hgain=1.0):
    for bar in range(b0, b1 + 1):
        for kb in kick_beats:
            add('drums', T(bar, kb), kick(kgain))
            KICKS.append(T(bar, kb))
        for cb in clap_beats:
            add('drums', T(bar, cb), clap(), gain=0.8, verb=0.25)
        if hats == 'off':
            for h in range(4):
                add('drums', T(bar, h + .5), hat(), pan=0.3, gain=0.7 * hgain)
        elif hats == '16':
            for h in range(16):
                v = (1.0 if h % 4 == 2 else 0.55 if h % 2 else 0.35) * hgain
                add('drums', T(bar, h / 4), hat(open_=h % 8 == 6), pan=-0.25 + 0.5 * (h % 2), gain=0.55 * v)


def bassline(b0, b1, prog, start, style='8', gain=0.5, cutoff=900):
    for bar in range(b0, b1 + 1):
        root = chord_at(bar, prog, start)[0]
        f = mtof(root)
        if style == 'sub':
            add('bass', T(bar), sub(f, 4 * SPB * .98, 1.5), gain=gain)
        elif style == '8':
            for e in range(8):
                ff = f * (2 if e % 2 else 1)
                add('bass', T(bar, e / 2), saw(ff, SPB / 2 * .9, cutoff, env=adsr(.003, .08, .4, .03, SPB / 2 * .9)) + sub(f, SPB / 2 * .9) * .6, gain=gain)
        elif style == '16':
            for e in range(16):
                if e % 4 == 0:
                    continue  # 让开底鼓
                add('bass', T(bar, e / 4), saw(f, SPB / 4 * .85, cutoff, env=adsr(.002, .05, .3, .02, SPB / 4 * .85)) + sub(f, SPB / 4 * .85) * .6, gain=gain)


def pads(b0, b1, prog, start, gain=0.12, cutoff=2500, voices=3, detune=0.008, verb=0.4, swell=False):
    for bar in range(b0, b1 + 1):
        notes = chord_at(bar, prog, start)[1]
        dur = 4 * SPB
        c = cutoff
        if swell:
            x = np.linspace(0, 1, int(dur * SR))
            c = cutoff * (0.25 + 0.75 * x)
        for i, m in enumerate(notes):
            s = saw(mtof(m), dur, c, voices=voices, detune=detune, env=adsr(.25 if not swell else 1.0, .5, .85, .4, dur))
            add('pad', T(bar), s, pan=(-0.6, 0, 0.6)[i % 3], gain=gain, verb=verb)


def supersaw(b0, b1, prog, start, gain=0.09, cutoff=6000):
    for bar in range(b0, b1 + 1):
        notes = chord_at(bar, prog, start)[1]
        dur = 4 * SPB
        for i, m in enumerate(notes + [notes[0] + 12]):
            s = saw(mtof(m), dur, cutoff, voices=5, detune=0.012, env=adsr(.01, .4, .8, .1, dur))
            add('pad', T(bar), s, pan=(-0.7, -0.2, 0.2, 0.7)[i], gain=gain, verb=0.25)


def arp(b0, b1, prog, start, inst='pluck', gain=0.13, pattern=(0, 1, 2, 3, 2, 1, 0, 2), step=0.25, octave=12, verb=0.3):
    for bar in range(b0, b1 + 1):
        notes = chord_at(bar, prog, start)[1]
        tones = notes + [notes[0] + 12]
        n = int(4 / step)
        for k in range(n):
            m = tones[pattern[k % len(pattern)] % len(tones)] + octave
            if inst == 'pluck':
                s = pluck(mtof(m), 0.5)
            elif inst == 'square':
                s = saw(mtof(m), step * SPB * .8, 5000, square=True, env=adsr(.002, .06, .3, .02, step * SPB * .8))
            else:
                s = bell(mtof(m), 1.2)
            add('fx', T(bar, k * step), s, pan=0.5 * np.sin(k * 0.9), gain=gain, verb=verb)


def melody(bar0, phrase, inst='lead', gain=0.16, transpose=0, verb=0.35):
    for (b, d, m) in phrase:
        f = mtof(m + transpose)
        dur = d * SPB
        if inst == 'lead':
            s = saw(f, dur + 0.15, 3500, voices=3, detune=0.006, env=adsr(.01, .3, .7, .12, dur + 0.15))
            vib = 1 + 0.003 * np.sin(2 * np.pi * 5.5 * tt(dur + 0.15))
            s = s * vib
        elif inst == 'bell':
            s = bell(f, max(1.5, dur * 2))
        else:
            s = pluck(f, max(0.5, dur))
        t0 = T(bar0, b)
        add('lead', t0, s, gain=gain, verb=verb)
        # 附点八分音符的乒乓延迟
        for k, p in enumerate((-0.6, 0.6, -0.6)):
            add('lead', t0 + 0.375 * (k + 1), s, pan=p, gain=gain * 0.35 * 0.55 ** k)


def snare_roll(b0, bars):
    tot = bars * 16
    for k in range(tot):
        div = 4 if k < tot / 2 else 8
        if div == 8:
            for j in range(2):
                add('drums', T(b0, k / 4 + j / 8), clap(), gain=0.15 + 0.6 * k / tot, verb=0.2)
        else:
            add('drums', T(b0, k / 4), clap(), gain=0.15 + 0.6 * k / tot, verb=0.2)


KICKS = []

# ================================================================= 编曲
# ---- 0 启动 1–5
add('fx', T(1), sub(55, 10 * SPB * 2, 0.8) * np.minimum(1, tt(20 * SPB)[: int(10 * SPB * 2 * SR)] / 4) * 0.25)
for b in range(1, 6):
    for k in range(4):
        add('fx', T(b, k), beep(2000 if k == 0 else 1500, 0.025), pan=-0.4, gain=0.25 if b < 3 else 0.12)
for b in (3, 4):
    for k in range(8):  # “打字”的嘀嗒
        add('fx', T(b, k / 2 + 0.25 * (k % 3 == 0)), beep(2600 + 400 * (k % 3), 0.012), pan=0.4, gain=0.12)
pads(3, 5, ['Am'], 3, gain=0.08, cutoff=1200, swell=True)
add('fx', T(4), riser(4 * SPB * 2), gain=0.5, verb=0.3)

# ---- 1 原初 6–15
add('fx', T(6), boom(3.0), gain=1.0)
add('fx', T(6), crash(4.0), gain=0.6, verb=0.6)
pads(6, 15, MAIN, 6, gain=0.11, cutoff=2200, verb=0.5)
bassline(6, 15, MAIN, 6, style='sub', gain=0.45)
drums(6, 15, kick_beats=(0, 2.5), clap_beats=(), hats='off', hgain=0.6)
arp(8, 15, MAIN, 6, 'pluck', gain=0.11)
add('fx', T(15), riser(4 * SPB), gain=0.35)

# ---- 2 定律 16–25
add('fx', T(16), crash(), gain=0.5, verb=0.5)
drums(16, 25, hats='off')
bassline(16, 25, MAIN, 16, style='8', gain=0.42, cutoff=700)
pads(16, 25, MAIN, 16, gain=0.09, cutoff=3000)
arp(16, 25, MAIN, 16, 'pluck', gain=0.1, pattern=(0, 2, 1, 3, 2, 0, 3, 1))
for b in (20, 22, 24):
    melody(b, HOOK_A, 'lead', gain=0.14)
add('fx', T(25, 2), riser(2 * SPB), gain=0.3)

# ---- 3 生命 26–34
add('fx', T(26), crash(), gain=0.35, verb=0.6)
pads(26, 34, LIFE, 26, gain=0.1, cutoff=1800, verb=0.6)
arp(26, 34, LIFE, 26, 'bell', gain=0.07, pattern=(0, 2, 1, 3), step=0.5, octave=12, verb=0.5)
arp(26, 34, LIFE, 26, 'pluck', gain=0.09, pattern=(0, 1, 2, 1, 3, 2, 1, 2), octave=0)
bassline(26, 34, LIFE, 26, style='sub', gain=0.4)
drums(28, 34, kick_beats=(0, 1.5, 2, 3), clap_beats=(1, 3), hats='off', kgain=0.85, hgain=0.8)
melody(30, HOOK_B, 'pluck', gain=0.14, transpose=-12)
melody(32, HOOK_B, 'pluck', gain=0.14, transpose=0)
add('fx', T(34), riser(4 * SPB, 300, 4000), gain=0.35)

# ---- 4 机器 35–46
add('fx', T(35), boom(1.5), gain=0.6)
drums(35, 46, hats='16')
bassline(35, 46, MACH, 35, style='16', gain=0.36, cutoff=1100)
arp(35, 46, MACH, 35, 'square', gain=0.07, pattern=(0, 1, 2, 3, 2, 1), step=0.25, octave=12, verb=0.15)
pads(39, 46, MACH, 35, gain=0.07, cutoff=2000)
for b in (40, 42, 44):
    melody(b, HOOK_A, 'lead', gain=0.11, transpose=-12)
add('fx', T(46), riser(4 * SPB, 200, 5000), gain=0.45)

# ---- 5 网络 47–55
add('fx', T(47), crash(), gain=0.5, verb=0.5)
MORSE = [1, 1, 1, 0, 3, 3, 3, 0, 1, 1, 1, 0, 0, 0, 0, 0]  # ... --- ...
for b in (47, 48):
    t = T(b)
    for k, m in enumerate(MORSE):
        if m:
            add('fx', t + k * SPB / 4, beep(880, (0.06 if m == 1 else 0.18)), gain=0.25, verb=0.2)
drums(47, 53, hats='16')
bassline(47, 55, MAIN, 47, style='16', gain=0.38, cutoff=1400)
supersaw(49, 55, MAIN, 47, gain=0.05, cutoff=3500)
arp(47, 55, MAIN, 47, 'pluck', gain=0.09, pattern=(0, 3, 2, 1, 0, 3, 1, 2))
snare_roll(54, 2)
add('fx', T(54), riser(8 * SPB, 150, 6000), gain=0.5)

# ---- 6 学习 56–67：56–58 蓄力，59 副歌爆发
add('fx', T(56), boom(2.0), gain=0.8)
drums(56, 58, kick_beats=(0, 2), clap_beats=(), hats='off', hgain=0.5)
pads(56, 58, ['Am', 'F', 'G'], 56, gain=0.09, cutoff=1500, swell=True)
bassline(56, 58, ['Am', 'F', 'G'], 56, style='sub', gain=0.4)
melody(56, HOOK_A[:6], 'bell', gain=0.12)
snare_roll(58, 1)
add('fx', T(58), riser(4 * SPB, 300, 8000), gain=0.5)
add('fx', T(59), boom(2.5), gain=1.0)
add('fx', T(59), crash(4), gain=0.7, verb=0.5)
drums(59, 67, hats='16')
bassline(59, 67, MAIN, 59, style='8', gain=0.45, cutoff=1000)
supersaw(59, 67, MAIN, 59, gain=0.085)
for b in (59, 61, 63, 65):
    melody(b, HOOK_A if b % 4 == 3 else HOOK_B, 'lead', gain=0.17)
arp(59, 67, MAIN, 59, 'pluck', gain=0.07, octave=24)

# ---- 7 崩溃 68–76：先正常生成一段，再切碎
seg0, seg1 = T(68), T(75)
drums(68, 74, hats='16')
bassline(68, 74, MACH, 68, style='16', gain=0.4, cutoff=1500)
supersaw(68, 74, MACH, 68, gain=0.07, cutoff=5000)
for b in (68, 70, 72):
    melody(b, HOOK_A, 'lead', gain=0.15, transpose=1)  # 升半音：走调
# 第 75 小节：所有声部继续一小节，用来做磁带停转
drums(75, 75, hats='16')
bassline(75, 75, MACH, 68, style='16', gain=0.4)
supersaw(75, 75, MACH, 68, gain=0.07)

# ---- 8 涌现 77–93
melody(77, [(0, 2, 69)], 'bell', gain=0.25)
pads(78, 80, ['F', 'G', 'Am'], 78, gain=0.09, cutoff=1500, swell=True)
arp(78, 80, ['F', 'G', 'Am'], 78, 'bell', gain=0.05, pattern=(0, 1, 2, 3), step=0.5, verb=0.6)
add('fx', T(80), riser(4 * SPB), gain=0.3)
drums(81, 87, kick_beats=(0, 1, 2, 3), clap_beats=(1, 3), hats='off')
bassline(81, 87, MAIN, 81, style='8', gain=0.42, cutoff=800)
pads(81, 87, MAIN, 81, gain=0.09, cutoff=2800)
arp(81, 87, MAIN, 81, 'pluck', gain=0.09)
for b in (84, 86):
    melody(b, HOOK_B, 'lead', gain=0.14)
snare_roll(87, 1)
add('fx', T(87), riser(4 * SPB, 300, 8000), gain=0.5)
add('fx', T(88), boom(2.5), gain=1.0)
add('fx', T(88), crash(4), gain=0.7, verb=0.5)
drums(88, 93, hats='16')
bassline(88, 93, MAIN, 88, style='16', gain=0.42, cutoff=1300)
supersaw(88, 93, MAIN, 88, gain=0.095, cutoff=7000)
for b in (88, 90):
    melody(b, HOOK_A, 'lead', gain=0.16, transpose=12)
melody(92, HOOK_B, 'lead', gain=0.16, transpose=12)
arp(88, 93, MAIN, 88, 'pluck', gain=0.07, octave=24)
add('fx', T(93), riser(4 * SPB, 400, 9000), gain=0.4)

# ---- 9 相遇 94–105
add('fx', T(94), crash(5), gain=0.4, verb=0.7)
pads(94, 97, ['F', 'C', 'G', 'Am'], 94, gain=0.1, cutoff=1600, verb=0.7)
bassline(94, 97, ['F', 'C', 'G', 'Am'], 94, style='sub', gain=0.35)
melody(94, [(0, 2, 72), (2, 2, 76), (4, 2, 79), (6, 2, 76)], 'bell', gain=0.13)
melody(96, [(0, 2, 77), (2, 2, 76), (4, 1, 74), (5, 1, 72), (6, 2, 71)], 'bell', gain=0.13)
for k in range(8):  # 靠近时的心跳
    add('drums', T(96, k), kick(0.35 + 0.08 * k))
rev = crash(2.0)[::-1]
add('fx', T(98) - len(rev) / SR, rev, gain=0.5)
add('fx', T(98), boom(3.0), gain=1.1)
add('fx', T(98), crash(5), gain=0.8, verb=0.8)
melody(98, [(0, 4, 81)], 'bell', gain=0.2)
pads(99, 101, ['F', 'C', 'G'], 99, gain=0.1, cutoff=2400, verb=0.6)
bassline(99, 101, ['F', 'C', 'G'], 99, style='sub', gain=0.35)
arp(99, 101, ['F', 'C', 'G'], 99, 'bell', gain=0.05, pattern=(0, 1, 2, 3), step=0.5, verb=0.6)
drums(102, 102, hats='16')
supersaw(102, 102, ['Am'], 102, gain=0.08)
bassline(102, 102, ['Am'], 102, style='16', gain=0.4)
add('fx', T(103), riser(4 * SPB, 6000, 100) * np.linspace(1, 0, int(4 * SPB * SR)), gain=0.3)
pads(103, 103, ['E'], 103, gain=0.08, cutoff=900, verb=0.6)
melody(104, [(0, 0.5, 69), (0.5, 0.5, 72), (1, 0.5, 76), (1.5, 0.5, 81), (2, 6, 85)], 'bell', gain=0.18)
pads(104, 105, ['A'], 104, gain=0.1, cutoff=2000, verb=0.8)
add('bass', T(104), sub(mtof(33), 6, 1.0), gain=0.35)

# ---------------------------------------------------------------- 侧链
duck = np.ones(N, np.float32)
for k in KICKS:
    i0 = int(k * SR)
    L = int(0.35 * SR)
    if i0 >= N:
        continue
    t = np.arange(min(L, N - i0)) / SR
    duck[i0:i0 + len(t)] = np.minimum(duck[i0:i0 + len(t)], 1 - 0.65 * np.exp(-t * 10))
bus['pad'] *= duck
bus['bass'] *= 0.5 + 0.5 * duck

# ---------------------------------------------------------------- 混响（分块 FFT 卷积）
def reverb(x, secs=2.8):
    L = int(secs * SR)
    t = np.arange(L) / SR
    out = np.zeros_like(x)
    for ch in range(2):
        ir = rng.standard_normal(L) * np.exp(-t * 2.4)
        ir = np.convolve(ir, np.ones(6) / 6, mode='same')  # 稍微压暗
        ir /= np.sqrt((ir ** 2).sum())
        B = 1 << 20
        nfft = 1 << int(np.ceil(np.log2(B + L)))
        IR = np.fft.rfft(ir, nfft)
        y = np.zeros(N + nfft)
        for s in range(0, N, B):
            seg = x[ch, s:s + B]
            y[s:s + nfft] += np.fft.irfft(np.fft.rfft(seg, nfft) * IR, nfft)
        out[ch] = y[:N]
    return out * 0.35


# 段落能量曲线：主歌收着，副歌放开，让高潮真的更响
ENERGY = [(1, 1.0), (6, 0.72), (16, 0.8), (26, 0.62), (28, 0.68), (35, 0.8), (47, 0.85), (56, 0.72), (59, 1.0),
          (68, 0.95), (77, 0.55), (81, 0.75), (88, 1.05), (94, 0.6), (98, 0.85), (99, 0.65), (102, 0.9), (103, 0.7)]
gain = np.ones(N, np.float32)
for (b, g), nxt in zip(ENERGY, ENERGY[1:] + [(BARS + 3, ENERGY[-1][1])]):
    gain[int(T(b) * SR):int(T(nxt[0]) * SR)] = g
gain = np.convolve(gain, np.ones(2205) / 2205, mode='same').astype(np.float32)  # 50 ms 过渡
mix = (bus['drums'] * 0.85 + bus['bass'] * 0.7 + bus['pad'] * 1.5 + bus['lead'] * 2.0 + bus['fx'] * 1.3) * gain + reverb(bus['verb']) * 1.4

# ---------------------------------------------------------------- 第 7 章：切碎、降采样、磁带停转
r7 = np.random.default_rng(7)
i0, i1 = int(seg0 * SR), int(seg1 * SR)
seg = mix[:, i0:i1].copy()
step = int(SPB / 2 * SR)  # 八分音符一格
for s in range(0, seg.shape[1], step):
    blk = seg[:, s:s + step]
    bar = 68 + (s / SR) / (4 * SPB)
    p = (bar - 68) / 7  # 越往后越乱
    x = r7.random()
    if x < 0.25 + 0.3 * p:  # 卡顿：重复一小片
        n = int(step / r7.choice([2, 4, 8]))
        rep = np.tile(blk[:, :n], (1, step // n + 1))[:, :blk.shape[1]]
        seg[:, s:s + step] = rep
    elif x < 0.45 + 0.3 * p:  # 降采样 + 比特粉碎
        h = int(r7.choice([6, 12, 24]))
        held = np.repeat(blk[:, ::h], h, axis=1)[:, :blk.shape[1]]
        bits = 2 ** int(r7.choice([3, 4, 5]))
        seg[:, s:s + step] = np.round(held * bits) / bits
    elif x < 0.5 + 0.2 * p:  # 静音一下
        seg[:, s:s + step] *= 0.05
mix[:, i0:i1] = seg
# 磁带停转：第 75 小节
j0, j1 = int(T(75) * SR), int(T(76) * SR)
src = mix[:, j0:j1].copy()
L = j1 - j0
speed = np.linspace(1, 0, L) ** 1.3
pos = np.cumsum(speed)
idx = np.clip(pos.astype(int), 0, L - 1)
mix[:, j0:j1] = src[:, idx] * np.linspace(1, 0.2, L)
# 第 76 小节：静音（与画面黑屏一致）
k0, k1 = int(T(76) * SR), int(T(77) * SR)
mix[:, k0:k1] *= np.linspace(0.02, 0, k1 - k0)

# ---------------------------------------------------------------- 母带：电平、软限幅、结尾淡出
mix = mix[:, : int(DUR * SR)]
fade = np.ones(mix.shape[1])
fl = int(3 * SR)
fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
mix *= fade
peak = np.percentile(np.abs(mix), 99.95)
mix = np.tanh(mix / peak * 0.9) * 0.95

out = sys.argv[1] if len(sys.argv) > 1 else 'public/audio/score.wav'
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', out, f'{mix.shape[1] / SR:.1f}s')
