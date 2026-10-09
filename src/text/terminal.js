// 终端文字叠层：画在一张和输出同分辨率的 2D 画布上，再由后期合成进最终画面，
// 这样逐帧导出时文字和粒子在同一张图里，不依赖 DOM 截图。
// 显示内容完全由当前拍号决定：第几个字已经打出来、光标是否亮，都是时间的函数。
import { FONT } from '../shapes/text.js';
import { chapterInk } from '../palette.js';

const rgb = (c, a = 1) => `rgba(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0},${a})`;

export class Terminal {
  constructor(clock, tl, entries) {
    this.clock = clock;
    this.tl = tl;
    // entries: [{ beat, text, ch, cps }]，按拍排序
    this.entries = entries.sort((a, b) => a.beat - b.beat);
    this.canvas = document.createElement('canvas');
    this.g = this.canvas.getContext('2d');
  }

  resize(w, h) { this.canvas.width = w; this.canvas.height = h; }

  lossAt(bar) {
    const k = this.tl.loss;
    if (bar <= k[0][0]) return k[0][1];
    for (let i = 0; i < k.length - 1; i++) {
      const [b0, v0] = k[i], [b1, v1] = k[i + 1];
      if (bar < b1) {
        if (v0 === 'NaN') return 'NaN';
        if (v1 === 'NaN') return v0;
        const f = (bar - b0) / (b1 - b0);
        return Math.exp(Math.log(Math.max(v0, 1e-3)) * (1 - f) + Math.log(Math.max(v1, 1e-3)) * f);
      }
    }
    return k[k.length - 1][1];
  }

  draw(info, opt = {}) {
    const { g, canvas } = this;
    const W = canvas.width, H = canvas.height, u = H / 1080;
    g.clearRect(0, 0, W, H);
    const ink = chapterInk[info.shot.ch] ?? [1, 1, 1];
    const alpha = opt.alpha ?? 1;
    if (alpha <= 0) return;
    const cursorOn = info.beat - Math.floor(info.beat) < 0.5;
    g.textBaseline = 'alphabetic';

    // 顶部 HUD：训练进度
    if (opt.hud !== false && info.bar >= 6) {
      const loss = this.lossAt(info.beat / this.clock.bpb + 1);
      const epoch = String(Math.max(1, Math.floor((info.beat - 20) / 2) + 1)).padStart(3, '0');
      g.font = `500 ${22 * u}px ${FONT}`;
      g.fillStyle = rgb(ink, 0.45 * alpha);
      g.fillText('model.train(world)', 64 * u, 70 * u);
      g.fillStyle = rgb(ink, 0.85 * alpha);
      const ls = typeof loss === 'number' ? loss.toFixed(3) : loss;
      g.fillText(`epoch ${epoch}  │  loss ${ls}`, 64 * u, 104 * u);
      const ch = info.chapter;
      const label = `[${String(info.chapterNo).padStart(2, '0')}] ${ch.name}`;
      g.textAlign = 'right';
      g.fillStyle = rgb(ink, 0.85 * alpha);
      g.fillText(label, W - 64 * u, 70 * u);
      g.fillStyle = rgb(ink, 0.45 * alpha);
      g.fillText(ch.zh, W - 64 * u, 104 * u);
      g.textAlign = 'left';
    }

    // 日志：已到达的条目逐字打出，只保留最后几行
    const visible = [];
    for (const e of this.entries) {
      if (e.beat > info.beat) break;
      if (e.until != null && info.beat >= e.until) continue;
      const elapsed = info.beat - e.beat;
      const text = typeof e.text === 'function' ? e.text(elapsed, info) : e.text;
      const n = Math.min(text.length, Math.floor(elapsed * (e.cps ?? 24)));
      visible.push({ text: text.slice(0, n), done: n >= text.length, e });
    }
    const center = opt.layout === 'center';
    const maxLines = center ? 3 : 6;
    const lines = visible.slice(-maxLines);
    const size = (center ? 40 : 30) * u;
    const lh = size * 1.45;
    g.font = `500 ${size}px ${FONT}`;
    const x0 = center ? W / 2 - 520 * u : 64 * u;
    const yLast = center ? H * 0.78 : H - 72 * u;
    if (!lines.length && opt.cursor !== false) {
      if (cursorOn) { g.fillStyle = rgb(ink, alpha); g.fillRect(x0, yLast - size * 0.8, size * 0.6, size); }
      return;
    }
    lines.forEach((l, i) => {
      const y = yLast - (lines.length - 1 - i) * lh;
      const age = lines.length - 1 - i;
      g.fillStyle = rgb(ink, alpha * Math.max(0.25, 1 - age * 0.18));
      g.fillText(l.text, x0, y);
      if (i === lines.length - 1 && opt.cursor !== false && (!l.done || cursorOn)) {
        const w = g.measureText(l.text).width;
        g.fillStyle = rgb(ink, alpha);
        g.fillRect(x0 + w + size * 0.15, y - size * 0.8, size * 0.6, size);
      }
    });
  }
}
