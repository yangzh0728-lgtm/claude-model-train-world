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
env = np.sqrt(np.convolve(np.mean(vox ** 2, 1), np.ones(4410) / 4410, 'same'))
duck = 1 - 0.3 * np.clip(env / (env.max() * 0.4), 0, 1)
mix = score * duck[:, None] + vox
mix = np.tanh(mix / np.abs(mix).max() * 1.3) / np.tanh(1.3) * 0.94
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', '-t', '210', '-b:a', '256k', sys.argv[3]],
               input=mix.astype(np.float32).tobytes(), check=True)
print('ok', sys.argv[3])
