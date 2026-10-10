"""生成配乐：120 BPM、4/4、105 小节（210 秒），按 9 章分段编曲，纯 numpy 合成。

    python3 scripts/make-score.py [输出路径]      # 默认 public/audio/score.wav

段落（小节号与 src/timeline.json 一致）。人声几乎每小节都在唱，伴奏给它让位：钢琴用带踏板的伴奏型、贝斯像真人弹、
鼓手每四小节一个过门，每个音的时间和力度都有一点不齐（HUMAN）。急停 stop() 只有 6 处，都在大段落交界、人声换气的那一拍；
重音和急停导出到 src/accents.json，画面跟着猛推 / 定格。
    0 启动   1–5    终端嘀嗒、一个钢琴音在试探 → 第 5 小节齐奏、最后一拍全停 → 第 6 小节大爆炸
    1 原初   6–15   铺底和弦 + 钢琴查尔斯顿节奏，半速底鼓
    2 定律  16–25   切分底鼓、二四拍军鼓、钢琴反拍断奏，第 19/21/23/25 小节急停
    3 生命  26–34   钢琴分解和弦，第 28 小节鼓回来，钢琴弹主旋律
    4 机器  35–46   3+3+2 机械律动，钢琴和底鼓一起咬，第 46 小节八下齐奏推上去
    5 网络  47–55   开头两小节整支乐队按摩尔斯电码 ... --- ... 一开一关，然后滚动贝斯、军鼓滚奏
    6 学习  56–67   蓄力，第 58 小节最后一拍全停，第 59 小节副歌砸下来
    7 崩溃  68–76   走调钢琴、卡顿、降采样、比特粉碎，第 75 小节磁带停转，第 76 小节静音
    8 涌现  77–93   一个音重新开始，逐步叠回去，第 88 小节最大的副歌（主旋律高八度）
    9 相遇  94–105  钢琴 + 钟声，第 98 小节指尖相碰的重击，最后落在 A 大三和弦上
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
bus = {k: np.zeros((2, N), np.float32) for k in ('drums', 'bass', 'pad', 'keys', 'lead', 'fx', 'verb')}


def T(bar, beat=0.0):
    return ((bar - 1) * 4 + beat) * SPB


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# 人味：鼓、钢琴、贝斯每一下都不完全卡在格子上，力度也有起伏（单独的随机数，不影响别的声部）
HUMAN = {'drums': (0.005, 0.12), 'keys': (0.009, 0.14), 'bass': (0.004, 0.08)}
hr = np.random.default_rng(11)


def add(name, t0, sig, pan=0.0, gain=1.0, verb=0.0, exact=False):
    if name in HUMAN and not exact:
        dt, dv = HUMAN[name]
        t0 = max(0.0, t0 + hr.normal(0, dt))
        gain *= float(np.clip(1 + hr.normal(0, dv), 0.6, 1.3))
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


# ---------------------------------------------------------------- 钢琴和真一点的军鼓（顿挫感主要靠它们）
_PIANO = {}


def piano(m, dur=0.25):
    """两根略微失谐的弦 + 轻微非谐泛音 + 琴槌噪声；dur 之后制音器很快压住，短 dur 就是断奏。"""
    key = (m, round(dur, 3))
    if key not in _PIANO:
        f = mtof(m)
        t = tt(dur + 0.3)
        out = np.zeros(len(t))
        for k in range(1, 18):
            fk = k * f * np.sqrt(1 + 0.00035 * k * k)
            if fk > 15000:
                break
            a = 1 / k ** 1.15 * (1.4 if k == 2 else 1)
            dec = 1.0 + 0.6 * k + f / 800
            for det in (-0.0008, 0.0008):
                out += a * 0.5 * np.sin(2 * np.pi * fk * (1 + det) * t + k * 1.3) * np.exp(-t * dec)
        out += hp_noise(len(t), 1) * np.exp(-t * 350) * 0.35
        out *= np.where(t < dur, 1.0, np.exp(-(t - dur) * 45)) * np.minimum(1, t / 0.0015)
        _PIANO[key] = out * 0.5
    return _PIANO[key]


def snare(gain=1.0):
    t = tt(0.3)
    tone = (np.sin(2 * np.pi * 185 * t) * 0.8 + np.sin(2 * np.pi * 330 * t) * 0.35) * np.exp(-t * 30)
    body = hp_noise(len(t), 1) * np.exp(-t * 17) * 0.9
    crack = hp_noise(len(t), 2) * np.exp(-t * 500) * 0.8
    return np.tanh((tone + body + crack) * 1.5) * 0.6 * gain


def punch(gain=1.0):
    """短促的底鼓，给齐奏重音用。"""
    t = tt(0.3)
    f = 48 + 160 * np.exp(-t * 45)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) + hp_noise(len(t), 1) * np.exp(-t * 700) * 0.5
    return np.tanh(s * 2.2) * gain


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
def tom(freq, gain=1.0):
    t = tt(0.45)
    f = freq * (1 + 0.6 * np.exp(-t * 25))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + hp_noise(len(t), 1) * np.exp(-t * 60) * 0.25) * 0.7 * gain


def fill(bar, kind=0, gain=1.0):
    """一小节最后一拍（或两拍）的过门，像鼓手在换句前往前推。"""
    if kind == 0:  # 军鼓 + 两个嗵鼓
        for k, (b, w) in enumerate([(3, 'sn'), (3.25, 'sn'), (3.5, 'hi'), (3.75, 'lo')]):
            add('drums', T(bar, b), snare(0.5 + 0.12 * k) if w == 'sn' else tom(160 if w == 'hi' else 110), gain=gain, verb=0.2)
    elif kind == 1:  # 两拍的嗵鼓下行
        for k, b in enumerate((2, 2.5, 2.75, 3, 3.25, 3.5, 3.75)):
            add('drums', T(bar, b), tom((200, 180, 160, 140, 120, 105, 95)[k]), gain=gain * (0.6 + 0.06 * k), verb=0.2)
    else:  # 只有军鼓的三连音
        for k in range(3):
            add('drums', T(bar, 3 + k / 3), snare(0.45 + 0.15 * k), gain=gain, verb=0.2)


def drums(b0, b1, kick_beats=(0, 1, 2, 3), clap_beats=(1, 3), hats='off', kgain=1.0, hgain=1.0, snr=False, fills=False):
    for bar in range(b0, b1 + 1):
        end4 = fills and (bar - b0) % 4 == 3 and bar != b1
        for kb in kick_beats:
            add('drums', T(bar, kb), kick(kgain))
            KICKS.append(T(bar, kb))
        for cb in clap_beats:
            add('drums', T(bar, cb), clap(), gain=0.5 if snr else 0.8, verb=0.25)
            if snr:
                add('drums', T(bar, cb), snare(), gain=0.9, verb=0.15)
        if snr and hr.random() < 0.6:  # 鬼音，不是每小节都有
            add('drums', T(bar, hr.choice([0.75, 1.75, 2.25, 2.75])), snare(0.18))
        if end4:
            fill(bar, int(hr.integers(0, 3)), 0.9)
        if hats == '8':
            for h in range(8):
                if end4 and h >= 6:
                    continue
                v = (0.9 if h % 2 else 0.6) * hgain
                add('drums', T(bar, h / 2), hat(open_=(h == 7 and bar % 2 == 1)), pan=0.3, gain=0.55 * v)
        elif hats == 'off':
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
        elif style == 'play':
            nxt = mtof(chord_at(bar + 1, prog, start)[0])
            figure = [(0, 1.3, f), (1.5, 0.45, f), (2, 0.9, f), (3, 0.45, f * 1.5), (3.5, 0.45, nxt * 2 ** (-1 / 12) if nxt > f else nxt * 2 ** (1 / 12))]
            for b, d, ff in figure:
                dur = d * SPB
                add('bass', T(bar, b), saw(ff, dur, cutoff, env=adsr(.004, .15, .5, .04, dur)) + sub(ff, dur) * .6, gain=gain)
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
        elif inst == 'piano':
            s = piano(m + transpose, dur * 0.92)
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

# 重音和急停：配乐和画面共用（导出到 src/accents.json）
ACC_HITS = []   # (拍号, 力度)
ACC_STOPS = []  # (起拍, 拍数)


def B(bar, beat=0.0):
    return (bar - 1) * 4 + beat


def voicing(name, octave=0):
    root, notes = CH[name]
    return [m + octave for m in notes + [notes[0] + 12]]


def stab(t0, name, vel=0.5, dur=0.14, octave=0, low=False, verb=0.12):
    for i, m in enumerate(voicing(name, octave)):
        add('keys', t0, piano(m, dur), pan=(-0.35, -0.1, 0.15, 0.4)[i % 4], gain=vel, verb=verb)
    if low:
        root = CH[name][0]
        add('keys', t0, piano(root + 12, dur) + piano(root, dur) * 0.8, gain=vel * 0.9)


def keys(b0, b1, prog, start, pattern, vel=0.45, dur=0.13, octave=0, low=False):
    for bar in range(b0, b1 + 1):
        name = prog[(bar - start) % len(prog)]
        for beat in pattern:
            stab(T(bar, beat), name, vel, dur, octave, low)


def piano_arp(b0, b1, prog, start, pattern=(0, 1, 2, 3, 2, 1, 0, 2), step=0.5, vel=0.4, octave=0, verb=0.35):
    for bar in range(b0, b1 + 1):
        tones = voicing(prog[(bar - start) % len(prog)], octave)
        for k in range(int(4 / step)):
            m = tones[pattern[k % len(pattern)] % len(tones)]
            add('keys', T(bar, k * step), piano(m, step * SPB * 1.6), pan=0.4 * np.sin(k * 1.1), gain=vel, verb=verb)


def near_voicing(name, center=64):
    """挑离 center 最近的转位，换和弦时手不用大跳。"""
    root, notes = CH[name]
    pcs = sorted({n % 12 for n in notes})
    best = None
    for lo in range(52, 64):
        v = []
        for pc in pcs:
            m = lo + (pc - lo) % 12
            v.append(m)
        v = sorted(v)
        v.append(v[0] + 12)
        d = abs(np.mean(v) - center)
        if best is None or d < best[0]:
            best = (d, v)
    return best[1]


# 伴奏型：(拍, 时值拍数, 力度)。两小节一组轮换，时值有长有短
COMP = {
    'ballad': ([(0, 2.0, .42), (2, 1.5, .33), (3.5, 0.5, .26)], [(0, 1.5, .4), (1.5, 1.0, .3), (2.5, 1.5, .34)]),
    'drive': ([(0, 1.0, .5), (1.5, 0.45, .36), (2.5, 0.9, .44), (3.5, 0.4, .3)],
              [(0, 0.45, .46), (0.75, 0.7, .36), (2, 1.0, .46), (3, 0.4, .3), (3.5, 0.45, .36)]),
    'machine': ([(0, .3, .48), (.75, .25, .3), (1.5, .35, .4), (2, .3, .44), (2.75, .25, .3), (3.5, .3, .36)],
                [(0, .3, .46), (.75, .25, .28), (1.5, .6, .4), (2.75, .25, .3), (3.25, .3, .34)]),
    'chorus': ([(0, 1.5, .55), (1.5, 0.5, .4), (2.5, 1.0, .48), (3.5, 0.5, .36)],
               [(0, 0.5, .5), (0.5, 1.0, .4), (2, 1.0, .5), (3, 0.5, .36), (3.5, 0.5, .42)]),
}


def comp(b0, b1, prog, start, style='drive', gain=1.0, octave=0, bassnote=True):
    pats = COMP[style]
    for bar in range(b0, b1 + 1):
        name = prog[(bar - start) % len(prog)]
        v = near_voicing(name)
        for k, (b, d, vel) in enumerate(pats[(bar - b0) % 2]):
            t0 = T(bar, b)
            for i, m in enumerate(v):
                add('keys', t0, piano(m + octave, d * SPB), pan=(-0.3, -0.1, 0.1, 0.3)[i % 4], gain=vel * gain * (1.2 if i == len(v) - 1 else 1), verb=0.22)
            if bassnote and k == 0:
                root = CH[name][0]
                add('keys', t0, piano(root + 12, 2 * SPB), gain=0.35 * gain, verb=0.2)


def hit(bar, beat, name=None, vel=1.0, crash_=False):
    """全乐队齐奏的一下：钢琴和弦（带低八度）+ 短底鼓 + 军鼓 + 贝斯，画面跟着猛推一下。"""
    name = name or 'Am'
    t0 = T(bar, beat)
    stab(t0, name, 0.6 * vel, 0.5, 0, low=True, verb=0.3)
    stab(t0, name, 0.25 * vel, 0.5, 12)
    add('drums', t0, punch(vel * 0.9))
    add('bass', t0, sub(mtof(CH[name][0]), 0.22, 1.8), gain=0.5 * vel)
    if crash_:
        add('drums', t0, crash(1.2), gain=0.45 * vel, verb=0.3)
    KICKS.append(t0)
    ACC_HITS.append((B(bar, beat), vel))


def hits(bar, beats, name=None, vel=1.0):
    for k, b in enumerate(beats):
        hit(bar, b, name, vel * (0.85 + 0.15 * (k == len(beats) - 1)))


def stop(bar, beat, beats):
    """急停：这段时间所有声部都掐掉（混响尾巴留着），画面定格。"""
    ACC_STOPS.append((B(bar, beat), beats))


def name_at(bar, prog, start):
    return prog[(bar - start) % len(prog)]


# ================================================================= 编曲
# 人声从第 6 小节起几乎每小节都在唱，句尾通常空出最后一拍；伴奏给人声让位，不再叠主奏旋律。
# 急停只放在几个大段落交界、而且正好是人声换气的那一拍。
TRES = (0, 0.75, 1.5, 2, 2.75, 3.5)  # 3+3+2

# ---- 0 启动 1–5
add('fx', T(1), sub(55, 10 * SPB * 2, 0.8) * np.minimum(1, tt(20 * SPB)[: int(10 * SPB * 2 * SR)] / 4) * 0.25)
for b in range(1, 6):
    for k in range(4):
        add('fx', T(b, k), beep(2000 if k == 0 else 1500, 0.025), pan=-0.4, gain=0.25 if b < 3 else 0.12)
for b in (3, 4):
    for k in range(8):  # “打字”的嘀嗒
        add('fx', T(b, k / 2 + 0.25 * (k % 3 == 0)), beep(2600 + 400 * (k % 3), 0.012), pan=0.4, gain=0.12)
for b, beat, m, d in [(2, 0, 69, 1.5), (2, 2, 72, 1.0), (3, 0, 69, 1.0), (3, 1.5, 76, 0.5), (3, 2, 72, 1.5),
                      (4, 0, 69, 0.5), (4, 0.5, 72, 0.5), (4, 1, 76, 1.0), (4, 2.5, 79, 1.5)]:  # 一个人在琴上试音
    add('keys', T(b, beat), piano(m, d * SPB * 1.5), gain=0.32, verb=0.45)
comp(5, 5, ['Am'], 5, 'ballad', gain=0.8)
pads(3, 5, ['Am'], 3, gain=0.08, cutoff=1200, swell=True)
add('fx', T(4), riser(4 * SPB * 2), gain=0.5, verb=0.3)
stop(5, 3, 1)

# ---- 1 原初 6–15
add('fx', T(6), boom(3.0), gain=1.0)
add('fx', T(6), crash(4.0), gain=0.6, verb=0.6)
hit(6, 0, 'Am', 1.0)
pads(6, 15, MAIN, 6, gain=0.09, cutoff=2000, verb=0.5)
bassline(6, 15, MAIN, 6, style='sub', gain=0.42)
drums(6, 15, kick_beats=(0, 2.5), clap_beats=(), hats='off', hgain=0.5)
for b in range(8, 15):
    add('drums', T(b, 3), snare(0.5), verb=0.25)
comp(6, 15, MAIN, 6, 'ballad')
arp(10, 15, MAIN, 6, 'pluck', gain=0.05)
fill(15, 1, 0.8)

# ---- 2 定律 16–25：像一支小乐队在弹，鼓手每四小节一个过门
add('fx', T(16), crash(), gain=0.5, verb=0.5)
hit(16, 0, 'Am', 0.9)
drums(16, 25, kick_beats=(0, 1.75, 2.5), clap_beats=(1, 3), hats='8', snr=True, fills=True)
bassline(16, 25, MAIN, 16, style='play', gain=0.38, cutoff=800)
pads(16, 25, MAIN, 16, gain=0.05, cutoff=2500)
comp(16, 25, MAIN, 16, 'drive')
arp(20, 25, MAIN, 16, 'pluck', gain=0.045, pattern=(0, 2, 1, 3, 2, 0, 3, 1))
hit(25, 2, name_at(25, MAIN, 16), 0.8); hit(25, 2.5, name_at(25, MAIN, 16), 0.95)
stop(25, 3, 1)

# ---- 3 生命 26–34：钢琴分解和弦，鼓从第 28 小节轻轻回来
add('fx', T(26), crash(), gain=0.3, verb=0.6)
pads(26, 34, LIFE, 26, gain=0.08, cutoff=1800, verb=0.6)
arp(26, 34, LIFE, 26, 'bell', gain=0.045, pattern=(0, 2, 1, 3), step=0.5, octave=12, verb=0.5)
piano_arp(26, 34, LIFE, 26, pattern=(0, 1, 2, 3, 2, 1, 3, 2), step=0.5, vel=0.26)
bassline(26, 34, LIFE, 26, style='sub', gain=0.38)
drums(28, 34, kick_beats=(0, 1.5, 2.75), clap_beats=(1, 3), hats='8', kgain=0.8, hgain=0.7, snr=True, fills=True)
fill(34, 1, 0.9)

# ---- 4 机器 35–46：机械感留给这一章，但钢琴力度有轻重
add('fx', T(35), boom(1.5), gain=0.6)
hit(35, 0, 'Am', 1.0, crash_=True)
drums(35, 46, kick_beats=(0, 0.75, 1.5, 2.75), clap_beats=(1, 3), hats='16', hgain=0.7, snr=True, fills=True)
bassline(35, 46, MACH, 35, style='16', gain=0.3, cutoff=1000)
comp(35, 45, MACH, 35, 'machine')
arp(35, 46, MACH, 35, 'square', gain=0.035, pattern=(0, 1, 2, 3, 2, 1), step=0.25, octave=12, verb=0.15)
pads(39, 46, MACH, 35, gain=0.05, cutoff=2000)
add('fx', T(46), riser(4 * SPB, 200, 5000), gain=0.4)
for k in range(4):  # 四下一拍一下往上推
    hit(46, k, 'E', 0.55 + 0.12 * k)

# ---- 5 网络 47–55：摩尔斯电码 ... --- ... 由钢琴高音和嘀声一起敲，乐队第 49 小节进来
add('fx', T(47), crash(), gain=0.45, verb=0.5)
hit(47, 0, 'Am', 0.8)
SOS = [(0, 1), (2, 1), (4, 1), (8, 3), (12, 3), (16, 3), (22, 1), (24, 1), (26, 1)]  # 十六分音符：起点, 长度
for s, l in SOS:
    t0 = T(47) + s * SPB / 4
    add('fx', t0, beep(880, l * SPB / 4 * 0.9), gain=0.2, verb=0.25)
    add('keys', t0, piano(81, l * SPB / 4 * 1.2), gain=0.35, verb=0.35)
pads(47, 48, ['Am', 'F'], 47, gain=0.08, cutoff=1600, swell=True)
bassline(47, 48, ['Am', 'F'], 47, style='sub', gain=0.38)
drums(49, 53, kick_beats=(0, 1.75, 2.5), clap_beats=(1, 3), hats='8', snr=True, fills=True)
bassline(49, 55, MAIN, 49, style='play', gain=0.36, cutoff=1200)
supersaw(51, 55, MAIN, 49, gain=0.03, cutoff=3000)
comp(49, 55, MAIN, 49, 'drive')
arp(49, 55, MAIN, 49, 'pluck', gain=0.045, pattern=(0, 3, 2, 1, 0, 3, 1, 2))
snare_roll(54, 2)
add('fx', T(54), riser(8 * SPB, 150, 6000), gain=0.45)

# ---- 6 学习 56–67：蓄力，第 58 小节最后半拍停一下（人声刚好换气），59 副歌
add('fx', T(56), boom(2.0), gain=0.7)
drums(56, 58, kick_beats=(0, 2), clap_beats=(), hats='off', hgain=0.45)
pads(56, 58, ['Am', 'F', 'G'], 56, gain=0.08, cutoff=1500, swell=True)
bassline(56, 58, ['Am', 'F', 'G'], 56, style='sub', gain=0.38)
comp(56, 58, ['Am', 'F', 'G'], 56, 'ballad', gain=0.9)
snare_roll(58, 1)
add('fx', T(58), riser(3.5 * SPB, 300, 8000), gain=0.45)
stop(58, 3.5, 0.5)
add('fx', T(59), boom(2.5), gain=0.9)
add('fx', T(59), crash(4), gain=0.65, verb=0.5)
hit(59, 0, 'Am', 1.1)
drums(59, 67, kick_beats=(0, 1.5, 2, 2.75), clap_beats=(1, 3), hats='16', hgain=0.75, snr=True, fills=True)
bassline(59, 67, MAIN, 59, style='play', gain=0.42, cutoff=1100)
supersaw(59, 67, MAIN, 59, gain=0.05, cutoff=5000)
comp(59, 67, MAIN, 59, 'chorus')
arp(59, 67, MAIN, 59, 'pluck', gain=0.04, octave=24)

# ---- 7 崩溃 68–76：先正常生成一段，再切碎；钢琴整体高了半音，听着就不对
seg0, seg1 = T(68), T(75)
hit(68, 0, 'E', 1.0, crash_=True)
drums(68, 74, kick_beats=(0, 0.75, 1.5, 2, 2.75), clap_beats=(1, 3), hats='16', snr=True)
bassline(68, 74, MACH, 68, style='16', gain=0.38, cutoff=1500)
supersaw(68, 74, MACH, 68, gain=0.05, cutoff=5000)
comp(68, 74, MACH, 68, 'machine', octave=1)
for b in (70, 72):
    melody(b, HOOK_A, 'lead', gain=0.09, transpose=1)
drums(75, 75, hats='16')
bassline(75, 75, MACH, 68, style='16', gain=0.4)
supersaw(75, 75, MACH, 68, gain=0.06)

# ---- 8 涌现 77–93
melody(77, [(0, 2, 69)], 'bell', gain=0.22)
add('keys', T(77), piano(57, 1.6), gain=0.5, verb=0.6)
pads(78, 80, ['F', 'G', 'Am'], 78, gain=0.08, cutoff=1500, swell=True)
piano_arp(78, 80, ['F', 'G', 'Am'], 78, pattern=(0, 1, 2, 3), step=0.5, vel=0.26, verb=0.5)
add('fx', T(80), riser(4 * SPB), gain=0.28)
fill(80, 0, 0.7)
hit(81, 0, 'Am', 0.85)
drums(81, 87, kick_beats=(0, 1.75, 2.5), clap_beats=(1, 3), hats='8', snr=True, fills=True)
bassline(81, 87, MAIN, 81, style='play', gain=0.38, cutoff=800)
pads(81, 87, MAIN, 81, gain=0.05, cutoff=2500)
comp(81, 87, MAIN, 81, 'drive')
arp(83, 87, MAIN, 81, 'pluck', gain=0.045)
snare_roll(87, 1)
add('fx', T(87), riser(3 * SPB, 300, 8000), gain=0.45)
stop(87, 3, 1)
add('fx', T(88), boom(2.5), gain=0.95)
add('fx', T(88), crash(4), gain=0.65, verb=0.5)
hit(88, 0, 'Am', 1.15)
drums(88, 93, kick_beats=(0, 1.5, 2, 2.75), clap_beats=(1, 3), hats='16', hgain=0.8, snr=True, fills=True)
bassline(88, 93, MAIN, 88, style='play', gain=0.42, cutoff=1200)
supersaw(88, 93, MAIN, 88, gain=0.06, cutoff=6000)
comp(88, 93, MAIN, 88, 'chorus')
comp(88, 93, MAIN, 88, 'chorus', gain=0.35, octave=12, bassnote=False)
arp(88, 93, MAIN, 88, 'pluck', gain=0.04, octave=24)
fill(93, 1, 1.0)

# ---- 9 相遇 94–105
add('fx', T(94), crash(5), gain=0.35, verb=0.7)
pads(94, 97, ['F', 'C', 'G', 'Am'], 94, gain=0.08, cutoff=1600, verb=0.7)
bassline(94, 97, ['F', 'C', 'G', 'Am'], 94, style='sub', gain=0.33)
comp(94, 97, ['F', 'C', 'G', 'Am'], 94, 'ballad', gain=0.85)
for k in range(8):  # 靠近时的心跳
    add('drums', T(96, k), kick(0.3 + 0.07 * k))
stop(97, 3.5, 0.5)
rev = crash(2.0)[::-1]
add('fx', T(98) - len(rev) / SR, rev, gain=0.45, verb=0.3)
add('fx', T(98), boom(3.0), gain=1.05)
add('fx', T(98), crash(5), gain=0.75, verb=0.8)
hit(98, 0, 'F', 1.2)
add('keys', T(98), sum(piano(m, 3.0) for m in (41, 53, 57, 60, 65, 69)), gain=0.4, verb=0.6)
melody(98, [(0, 4, 81)], 'bell', gain=0.18)
pads(99, 101, ['F', 'C', 'G'], 99, gain=0.08, cutoff=2200, verb=0.6)
bassline(99, 101, ['F', 'C', 'G'], 99, style='sub', gain=0.33)
piano_arp(99, 101, ['F', 'C', 'G'], 99, pattern=(0, 1, 2, 3), step=0.5, vel=0.28, verb=0.5)
drums(102, 102, kick_beats=(0, 1.75, 2.5), clap_beats=(1,), hats='8', snr=True)
comp(102, 102, ['Am'], 102, 'drive')
bassline(102, 102, ['Am'], 102, style='play', gain=0.38)
hit(102, 2, 'Am', 0.8); hit(102, 2.5, 'Am', 0.95)
stop(102, 3, 1)
add('fx', T(103), riser(4 * SPB, 6000, 100) * np.linspace(1, 0, int(4 * SPB * SR)), gain=0.25)
pads(103, 103, ['E'], 103, gain=0.07, cutoff=900, verb=0.6)
add('keys', T(103), sum(piano(m, 3.5) for m in (40, 52, 56, 59, 64)), gain=0.32, verb=0.6)
melody(104, [(0, 0.5, 69), (0.5, 0.5, 72), (1, 0.5, 76), (1.5, 0.5, 81), (2, 6, 85)], 'bell', gain=0.13)
for k, m in enumerate((57, 61, 64, 69, 73)):
    add('keys', T(104, k * 0.5), piano(m, 5.0 - k * 0.25), gain=0.32, verb=0.6)
pads(104, 105, ['A'], 104, gain=0.09, cutoff=2000, verb=0.8)
add('bass', T(104), sub(mtof(33), 6, 1.0), gain=0.33)

# ---------------------------------------------------------------- 急停：所有声部和混响发送一起掐掉（已经在响的混响尾巴留着）
gate = np.ones(N, np.float32)
for b, l in ACC_STOPS:
    gate[int(b * SPB * SR):int((b + l) * SPB * SR)] = 0
ramp = int(0.004 * SR)
gate = np.convolve(gate, np.ones(ramp) / ramp, mode='same').astype(np.float32)
for k in bus:
    bus[k] *= gate


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
# ---------------------------------------------------------------- 均衡：每条总线让出别人的频段，人声要用的 200–500 Hz 和 2–4 kHz 尽量空出来
def eq(x, points):
    """零相位静态均衡：points 是 (频率, dB) 列表，在对数频率上线性插值。"""
    n = x.shape[-1]
    nfft = 1 << int(np.ceil(np.log2(n)))
    f = np.fft.rfftfreq(nfft, 1 / SR)
    fp, gp = zip(*points)
    g = 10 ** (np.interp(np.log10(np.maximum(f, 1)), np.log10(fp), gp) / 20)
    return np.fft.irfft(np.fft.rfft(x, nfft) * g, nfft)[..., :n].astype(np.float32)


EQ = {
    'drums': [(20, 0), (60, 1), (200, -1), (350, -4), (700, -1), (2500, 1), (5000, 2), (12000, 0)],
    'bass': [(20, -12), (35, 0), (100, 0), (250, -3), (600, -6), (2000, -6), (20000, -6)],
    'pad': [(60, -30), (180, -10), (300, -6), (600, -3), (1500, -2), (3000, -3), (8000, 0), (20000, 0)],
    'keys': [(60, -24), (120, -6), (250, -3), (400, -4), (1000, 0), (2500, 2), (4500, 3), (9000, 1), (20000, 0)],
    'lead': [(100, -24), (250, -6), (1000, 0), (3000, -2), (20000, 0)],
    'fx': [(20, 0), (120, 0), (300, -4), (800, -2), (3000, 0), (20000, 0)],
}
for k, pts in EQ.items():
    bus[k] = eq(bus[k], pts)
wet = eq(reverb(bus['verb']), [(100, -30), (350, -8), (700, 0), (5000, 0), (9000, -8), (20000, -20)])
mix = (bus['drums'] * 0.9 + bus['bass'] * 0.7 + bus['pad'] * 1.3 + bus['keys'] * 1.6 + bus['lead'] * 2.0 + bus['fx'] * 1.2) * gain + wet * 1.0

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
    beat0 = B(68) + (s / SR) / SPB
    if x < 0.25 + 0.3 * p:  # 卡顿：重复一小片
        ACC_HITS.append((beat0, 0.6))
        n = int(step / r7.choice([2, 4, 8]))
        rep = np.tile(blk[:, :n], (1, step // n + 1))[:, :blk.shape[1]]
        seg[:, s:s + step] = rep
    elif x < 0.47 + 0.3 * p:  # 降采样 + 比特粉碎
        h = int(r7.choice([6, 12, 24]))
        held = np.repeat(blk[:, ::h], h, axis=1)[:, :blk.shape[1]]
        bits = 2 ** int(r7.choice([3, 4, 5]))
        seg[:, s:s + step] = np.round(held * bits) / bits
    elif x < 0.5 + 0.1 * p:  # 静音一下
        seg[:, s:s + step] *= 0.05
        ACC_STOPS.append((beat0, 0.5))
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
# 只压真正的峰：0.7 以下原样通过，以上软过渡（以前整体走 tanh，所有音都带一点失真，听着发糊）
def soft_limit(x, knee=0.7):
    a = np.abs(x)
    over = knee + (1 - knee) * np.tanh((a - knee) / (1 - knee))
    return np.where(a < knee, x, np.sign(x) * over)


# 整体再往亮里倾斜一点：2–8 kHz 是听清楚的关键，10 kHz 以上的噪声嘶嘶声压下去
mix = eq(mix, [(30, -3), (80, -1), (300, -1), (1500, 0), (3500, 3), (7000, 3), (11000, 0), (16000, -5), (20000, -8)])
mix = soft_limit(mix / np.percentile(np.abs(mix), 99.99) * 0.85) * 0.95

# 重音和急停导出给画面（director.js 读）
import json
acc = {'hits': [[round(b, 4), round(v, 3)] for b, v in sorted(ACC_HITS)],
       'stops': [[round(b, 4), round(l, 4)] for b, l in sorted(ACC_STOPS)]}
with open('src/accents.json', 'w') as f:
    json.dump(acc, f)
print(f"accents: {len(acc['hits'])} hits, {len(acc['stops'])} stops")

out = sys.argv[1] if len(sys.argv) > 1 else 'public/audio/score.wav'
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', out, f'{mix.shape[1] / SR:.1f}s')
