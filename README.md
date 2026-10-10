# model.train(world);

科学 · 计算机 · AI 粒子动画。成片规格 **3840×2160、60 fps**，逐帧离线渲染。

## 快速开始

```bash
npm install
npm run dev          # 浏览器实时预览（带调试面板）
```

调试面板快捷键：空格 播放/暂停 · ←→ 前后一小节 · ↑↓ 上/下一个镜头 · 0–9 跳到第几章 · H 隐藏面板。
URL 参数 `?n=256` 可以把粒子降到 6.5 万，方便在轻薄本上预览（成片固定用 `n=512`，26 万粒子）。

## 导出视频

需要本机装有 ffmpeg 和 Google Chrome（或用 `--browser` 指定 Chromium 路径）。

```bash
npm run render -- --from 0 --to 50                     # 渲染 0–50 秒，默认 4K60、H.264 CRF 16
npm run render -- --from 0 --to 50 --w 1920 --h 1080   # 1080p 快速预览
npm run render -- --full                               # 全片：按章节分段渲染，中断后重跑会跳过已完成的段，最后拼接配音
npm run render -- --full --codec prores                # 输出 ProRes 422 HQ 母版（.mov），留给后期调色
```

原理：网页以 `?export` 模式打开，按固定帧率把时钟推进到每一帧，`readPixels` 读回原始 RGBA，
POST 给本地渲染服务，服务直接写进 ffmpeg 的标准输入，中间不落地图片。
画面是时间的纯函数（没有逐帧累积的模拟状态），所以任意分段、任意帧率、多台机器分工渲染都能无缝拼接。

## 目录

```
src/
  main.js            入口：实时预览 / 离线导出两种模式
  clock.js           主时钟：秒 → 拍 / 小节 / 镜头（支持 librosa 导出的真实节拍表）
  timeline.json      BPM、偏移、30 个镜头的小节范围、loss 曲线关键帧
  director.js        导演：给定时间算出整帧状态
  particles/         粒子着色器（形态 A → B 变形 + 噪声）
  shapes/            形态库：大爆炸、星云、原子、苹果、轨道、电场线、双缝干涉、文字……
  ch/                每章一个文件；未完成的章节自动用占位镜头
  text/terminal.js   终端日志 + 顶部训练 HUD（画进同一帧，导出时不依赖 DOM）
  fx/post.js         辉光、色差、闪白、暗角、颗粒
  export/            导出模式（页面一侧）
scripts/
  render.mjs         离线渲染 + ffmpeg 编码
  make-metronome.mjs 生成占位节拍器音轨
  make-score.py      生成配乐（numpy 合成，按 9 章分段编曲），npm run score 输出 public/audio/score.mp3
```

## 换成真歌

1. 把音频放进 `public/audio/`，改 `timeline.json` 的 `audio`。
2. 用 librosa 算出每一拍的时间（秒），填进 `beats` 数组；或者只填 `bpm` 和 `offset`。
3. 按歌曲段落调整各镜头的 `bars`，镜头内容不用改，动画会跟着拍子伸缩。

## 换歌版本：Kevin MacLeod《Brain Dance》

原创歌曲版用 `src/timeline.json`；另一版配现成的授权歌曲，用单独的时间轴 `src/timelines/brain-dance.json`，
两版共用同一套镜头代码，互不影响。

```bash
TIMELINE=src/timelines/brain-dance.json npm run dev                       # 实时预览
TIMELINE=src/timelines/brain-dance.json npm run render -- --full --build  # 全片导出（构建到 dist-brain-dance）
python3 scripts/make-beatmap.py public/audio/brain-dance.mp3 src/timelines/brain-dance.json --bpm 123 --pickup 1  # 重算节拍表
```

- 歌曲 124 BPM、3:35。节拍表是 librosa 跟拍后线性回归出的笔直网格（偏差 < 30 ms），第 1 小节是一小节弱起（0.55 s）。
- 镜头按歌曲段落重排，一共 106 小节：大爆炸落在 16 s 的第一次变化，第 7 章崩溃的第二个镜头落在 126 s 的骤停，
  第 8 章 "the" 落在 142 s 鼓回来的那一拍，指尖相触（9c）落在 190 s 的最后一段高潮，片尾停在 204 s 的最后一击。
- 这一版终端不打原创歌词（时间轴里 `"lyrics": null`），改用各镜头自己的日志。

**署名（CC BY 4.0，公开发布时放在视频简介或片尾）：**

> "Brain Dance" Kevin MacLeod (incompetech.com)
> Licensed under Creative Commons: By Attribution 4.0 License
> http://creativecommons.org/licenses/by/4.0/

## 进度

- [x] 项目骨架、粒子引擎、主时钟、终端文字层、后期、逐帧导出
- [x] 第 0–2 章：启动、原初、定律（镜头 0-1 到 2-4）
- [ ] 第 3–9 章（目前是占位镜头）
- [ ] 选歌，换成真实节拍
