"""把人声干净地混到配乐上：python3 scripts/mix-vocals.py 配乐.mp3 vocal_stem.wav 输出.mp3"""
# 跟 vocals/mix.py 最后一段一样的混法，但直接读已经做好的 vocal_stem.wav（sing.py 的中间文件在容器重启后没了）
import subprocess, sys
import numpy as np
SR = 44100
I = lambda bar, b=0: int(((bar - 1) * 4 + b) * 0.5 * SR)
def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
score, vox = load(sys.argv[1]), load(sys.argv[2])
m = max(len(score), len(vox))
score = np.pad(score, ((0, m - len(score)), (0, 0))); vox = np.pad(vox, ((0, m - len(vox)), (0, 0)))
a, b = I(59), I(68)
rs = np.sqrt(np.mean(score[a:b] ** 2))
act = np.abs(vox[a:b, 0]) > 0.02
rv = np.sqrt(np.mean(vox[a:b][act] ** 2))
vox *= rs / rv * 0.95
def eq(x, points):
    n = x.shape[0]
    nfft = 1 << int(np.ceil(np.log2(n)))
    f = np.fft.rfftfreq(nfft, 1 / SR)
    fp, gp = zip(*points)
    g = 10 ** (np.interp(np.log10(np.maximum(f, 1)), np.log10(fp), gp) / 20)
    return np.fft.irfft(np.fft.rfft(x, nfft, axis=0) * g[:, None], nfft, axis=0)[:n]


# 人声：去掉低频嗡声和 300 Hz 的闷，提一点 3 kHz 的咬字和 8 kHz 的空气感
vox = eq(vox, [(60, -30), (110, -6), (180, 0), (300, -3), (700, 0), (1500, 0), (3000, 3), (5000, 1), (7500, -1), (14000, -2)])
vox *= 10 ** (1.5 / 20)
# 人声在唱的时候，伴奏只把中频（人声那一段）让出来，低音和高音不动，所以伴奏不会整体变小
env = np.sqrt(np.convolve(np.mean(vox ** 2, 1), np.ones(4410) / 4410, 'same'))
duck = np.clip(env / (env.max() * 0.3), 0, 1)
mid = eq(score, [(20, -60), (180, -60), (250, 0), (3500, 0), (5000, -60), (20000, -60)])
score = score - mid * (1 - 10 ** (-5 / 20)) * duck[:, None]
mix = score * (1 - 0.1 * duck[:, None]) + vox
# 只压峰值，不再整体过 tanh
a = np.abs(mix) / np.percentile(np.abs(mix), 99.99) * 0.85
mix = np.sign(mix) * np.where(a < 0.7, a, 0.7 + 0.3 * np.tanh((a - 0.7) / 0.3)) * 0.95
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', '-t', '210', '-b:a', '256k', sys.argv[3]],
               input=mix.astype(np.float32).tobytes(), check=True)
print('ok', sys.argv[3])
