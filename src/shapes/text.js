// 文字采样：任意字符串 → 粒子坐标（Canvas 渲染后按像素取点）
import { rng, gauss, lerp3 } from '../util.js';
import { C } from '../palette.js';

export const FONT = '"JetBrains Mono", "Sarasa Mono SC", "Noto Sans Mono CJK SC", monospace';

export default {
  text(N, pos, col, { str = 'hello, world.', width = 6, weight = 700, color = 'white', y = 0 } = {}) {
    const r = rng(41);
    const px = 220;
    const cv = document.createElement('canvas');
    const g = cv.getContext('2d');
    g.font = `${weight} ${px}px ${FONT}`;
    const w = Math.ceil(g.measureText(str).width) + 40;
    const h = Math.ceil(px * 1.35);
    cv.width = w; cv.height = h;
    g.font = `${weight} ${px}px ${FONT}`;
    g.fillStyle = '#fff';
    g.textBaseline = 'middle';
    g.fillText(str, 20, h / 2);
    const data = g.getImageData(0, 0, w, h).data;
    const hits = [];
    for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] > 128) hits.push(i);
    const scale = width / w;
    const base = C[color] ?? C.white;
    for (let i = 0; i < N; i++) {
      const k = hits.length ? hits[(r() * hits.length) | 0] : 0;
      const x = (k % w) + r(), yy = Math.floor(k / w) + r();
      pos[i * 3] = (x - w / 2) * scale;
      pos[i * 3 + 1] = -(yy - h / 2) * scale + y;
      pos[i * 3 + 2] = gauss(r) * 0.02;
      const c = lerp3(base, C.white, r() * 0.3);
      col[i * 3] = c[0] * 0.07; col[i * 3 + 1] = c[1] * 0.07; col[i * 3 + 2] = c[2] * 0.07;
    }
  },
};
