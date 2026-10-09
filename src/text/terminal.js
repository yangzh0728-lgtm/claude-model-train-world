// 终端文字叠层：画在一张和输出同分辨率的 2D 画布上，再由后期合成进最终画面，
// 这样逐帧导出时文字和粒子在同一张图里，不依赖 DOM 截图。
// 显示内容完全由当前拍号决定：第几个字已经打出来、光标是否亮，都是时间的函数。
import { FONT } from '../shapes/text.js';

const SERIF = '"EB Garamond", "Noto Serif CJK SC", serif';
const WIDE = '"Space Grotesk", sans-serif';
const INK = [0.13, 0.13, 0.14];
const GOLD = '#E2A72E';
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

  // 纸面插图 / 工程图纸的版面元素，以及暗场景右下角的小字注解
  drawPage(page, info, W, H, u, ink, alpha) {
    const g = this.g;
    const lp = Math.min(1, info.lb / 0.5);           // 进场：半拍内淡入
    const a = alpha * lp;
    if (a <= 0) return;
    g.save();
    if (page.style === 'dark') {
      if (page.caption) {
        g.font = `400 ${18 * u}px ${FONT}`;
        g.textAlign = 'right';
        g.fillStyle = rgb(ink, 0.5 * a);
        g.fillText(page.caption, W - 64 * u, H - 72 * u);
      }
      g.restore();
      return;
    }
    const inkS = (k = 1) => rgb(INK, k * a);
    if (page.style === 'sheet') {
      // 上下两条通栏细线、页眉、NOTES、标题栏
      g.strokeStyle = inkS(0.85); g.lineWidth = 1.5 * u;
      g.beginPath(); g.moveTo(0, 95 * u); g.lineTo(W, 95 * u); g.moveTo(0, 790 * u); g.lineTo(W, 790 * u); g.stroke();
      g.font = `400 ${15 * u}px ${FONT}`; g.fillStyle = inkS(0.6);
      g.fillText(page.header ?? `model.train(world)   ${info.shot.id}   ${info.chapter.name.toLowerCase()}`, 28 * u, 56 * u);
      if (page.notes?.length) {
        g.font = `600 ${17 * u}px ${SERIF}`; g.fillStyle = inkS(0.9);
        g.fillText('NOTES', 36 * u, 140 * u);
        g.font = `italic 400 ${19 * u}px ${SERIF}`; g.fillStyle = inkS(0.8);
        page.notes.forEach((n, i) => g.fillText(`${i + 1}.  ${n}`, 36 * u, (172 + i * 28) * u));
      }
      const b = page.block ?? {};
      const bx = W - 760 * u, by = 820 * u, bw = 720 * u, bh = 96 * u;
      g.strokeStyle = inkS(0.85); g.lineWidth = 1.5 * u;
      g.strokeRect(bx, by, bw, bh);
      g.beginPath(); g.moveTo(bx, by + bh / 2); g.lineTo(bx + bw, by + bh / 2);
      g.moveTo(bx + bw * 0.55, by + bh / 2); g.lineTo(bx + bw * 0.55, by + bh);
      g.moveTo(bx + bw * 0.78, by + bh / 2); g.lineTo(bx + bw * 0.78, by + bh); g.stroke();
      g.font = `600 ${19 * u}px ${SERIF}`; g.fillStyle = inkS(0.9);
      g.fillText(b.name ?? page.title ?? '', bx + 16 * u, by + 31 * u);
      g.font = `italic 400 ${17 * u}px ${SERIF}`; g.textAlign = 'right';
      g.fillText(b.sub ?? '', bx + bw - 16 * u, by + 31 * u);
      g.textAlign = 'left'; g.font = `600 ${16 * u}px ${SERIF}`;
      g.fillText(`SCALE  ${b.scale ?? '1 : 1'}`, bx + 16 * u, by + 79 * u);
      g.fillText('DRAWN  model', bx + bw * 0.55 + 14 * u, by + 79 * u);
      g.fillText(`SHEET  ${info.shot.id}`, bx + bw * 0.78 + 14 * u, by + 79 * u);
      if (page.title) {
        g.font = `700 ${92 * u}px ${WIDE}`;
        g.letterSpacing = `${26 * u}px`;
        g.textAlign = 'center';
        const tw = g.measureText(page.title).width;
        g.fillStyle = 'rgba(0,0,0,0)';
        g.fillStyle = inkS(0.92);
        const ty = (page.titleY ?? 480) * u;
        g.fillText(page.title, W / 2 + 13 * u, ty);
        g.letterSpacing = '0px';
        g.strokeStyle = inkS(0.85); g.lineWidth = 1.5 * u;
        g.beginPath(); g.moveTo(0, ty - 32 * u); g.lineTo(W / 2 - tw / 2 - 30 * u, ty - 32 * u);
        g.moveTo(W / 2 + tw / 2 + 50 * u, ty - 32 * u); g.lineTo(W, ty - 32 * u); g.stroke();
      }
    } else {
      // 纸面插图：金色衬线大标题 + 右下角斜体图注
      if (page.title) {
        g.font = `700 ${150 * u}px ${SERIF}`;
        g.letterSpacing = `${6 * u}px`;
        g.textAlign = 'center';
        const ty = (page.titleY ?? 700) * u;
        g.fillStyle = GOLD; g.globalAlpha = a;
        g.fillText(page.title, W / 2, ty);
        g.lineWidth = 2 * u; g.strokeStyle = inkS(0.85);
        g.strokeText(page.title, W / 2, ty);
        g.globalAlpha = 1; g.letterSpacing = '0px';
      }
      if (page.caption) {
        const [fig, ...rest] = page.caption.split(/(?<=\d\.)\s+/);
        g.textAlign = 'right';
        g.font = `italic 400 ${24 * u}px ${SERIF}`; g.fillStyle = inkS(0.85);
        const body = rest.join(' ');
        g.fillText(body, W - 48 * u, H - 44 * u);
        const bw = g.measureText(body).width;
        g.font = `600 ${21 * u}px ${SERIF}`;
        g.fillText(fig, W - 60 * u - bw, H - 44 * u);
      }
    }
    g.restore();
  }

  draw(info, opt = {}) {
    const { g, canvas } = this;
    const W = canvas.width, H = canvas.height, u = H / 1080;
    g.clearRect(0, 0, W, H);
    const page = opt.page ?? { style: 'dark' };
    const paper = page.style !== 'dark';
    const ink = paper ? INK : chapterInk[info.shot.ch] ?? [1, 1, 1];
    this.drawPage(page, info, W, H, u, ink, opt.alpha ?? 1);
    const alpha = opt.alpha ?? 1;
    if (alpha <= 0) return;
    const cursorOn = info.beat - Math.floor(info.beat) < 0.5;
    g.textBaseline = 'alphabetic';

    // 顶部 HUD：训练进度
    if (opt.hud !== false && info.bar >= 6 && page.style !== 'sheet') {
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
    const maxLines = center ? 3 : paper ? 4 : 6;
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
