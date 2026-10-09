# 从音频算节拍表，写进时间轴 JSON 的 beats 字段（镜头的小节范围在 JSON 里手工排）。
#
#   python3 scripts/make-beatmap.py public/audio/brain-dance.mp3 src/timelines/brain-dance.json --pickup 1
#
# 电子乐速度恒定，所以先用 librosa 跟拍，再对拍点做线性回归，得到一条笔直的节拍网格
# （比逐拍跟踪更稳，误差在几毫秒内）。--pickup N 表示在第一拍前补 N 个小节的弱起，
# 让第 1 小节落在歌曲开头附近。
import argparse, json
import numpy as np
import librosa

ap = argparse.ArgumentParser()
ap.add_argument('audio')
ap.add_argument('timeline')
ap.add_argument('--bpm', type=float, default=120, help='跟拍时的初始速度猜测')
ap.add_argument('--pickup', type=int, default=0)
a = ap.parse_args()

y, sr = librosa.load(a.audio, sr=22050, mono=True)
dur = len(y) / sr
oenv = librosa.onset.onset_strength(y=y, sr=sr)
_, bt = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, units='time', start_bpm=a.bpm, tightness=400)
i = np.arange(len(bt))
period, b0 = np.polyfit(i, bt, 1)
resid = np.abs(bt - (period * i + b0)).max()

tl = json.load(open(a.timeline))
bpb = tl['beatsPerBar']
# 网格从找到的第一拍往前推到最近的小节线（librosa 第一拍就是强拍时 k = 0），再加弱起小节
start = b0 - a.pickup * bpb * period
n = int(np.ceil((dur - start) / period)) + 1
beats = [round(start + k * period, 4) for k in range(n)]

tl['bpm'] = round(60 / period, 3)
tl['offset'] = beats[0]
tl['beats'] = beats
json.dump(tl, open(a.timeline, 'w'), ensure_ascii=False, indent=2)
print(f'{60 / period:.3f} BPM，第 1 拍 {beats[0]:.3f}s，{len(beats)} 拍，网格最大偏差 {resid * 1000:.0f} ms，音频 {dur:.1f}s')
