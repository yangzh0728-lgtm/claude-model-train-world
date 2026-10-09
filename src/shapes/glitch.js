// 第 7 章 崩溃 + 第 9 章用的手：浮点比特、手、拼错的字
import { rng, gauss, clamp, lerp, easeOut } from '../util.js';
import { C } from '../palette.js';
import { compose, seg, poly, curve, circle, rect, rectFill, disc, ball, text } from './kit.js';

const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const scaleCol = (comp, col, i, k) => { const o = i * 3; col[o] = comp.baseCol[o] * k; col[o + 1] = comp.baseCol[o + 1] * k; col[o + 2] = comp.baseCol[o + 2] * k; };

// 手的轮廓：手掌 + 若干手指（胶囊形），线稿加一层淡淡的填充
function handPrims(fingers, color, b) {
  const prims = [];
  const palm = curve((t) => {
    const a = t * Math.PI * 2;
    const x = Math.cos(a) * 1.05, y = Math.sin(a) * 1.2;
    return [x * (y < 0 ? 0.88 + 0.12 * (1 + y / 1.2) : 1), y - 0.6, 0];
  }, { n: 160, c: color, b, th: 0.012 });
  prims.push(palm, { ...rectFill(-0.85, -1.5, 0.85, 0.4), c: color, b: b * 0.12, w: 0.5 });
  // 手腕
  prims.push(seg([-0.75, -1.7], [-0.72, -3.3], { c: color, b, th: 0.012 }), seg([0.75, -1.7], [0.72, -3.3], { c: color, b, th: 0.012 }));
  const capsule = (base, ang, len, w) => {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    const p = (s, o) => [base[0] + dx * s + nx * o, base[1] + dy * s + ny * o, 0];
    const tip = Array.from({ length: 17 }, (_, i) => { const a = Math.PI * (i / 16); return p(len + Math.sin(a) * w, Math.cos(a) * w); });
    return [poly([p(0, w), p(len, w), ...tip, p(len, -w), p(0, -w)], { c: color, b, th: 0.01 }),
      ...[0.36, 0.68].map((k) => seg(p(len * k, -w * 0.8), p(len * k, w * 0.8), { c: color, b: b * 0.4 }))];
  };
  // 四（或更多）根手指沿掌心上沿均匀铺开，最外侧是拇指
  const n = fingers - 1;
  for (let k = 0; k < n; k++) {
    const t = n === 1 ? 0.5 : k / (n - 1);
    const a = lerp(2.2, 1.0, t);
    const base = [Math.cos(a) * 0.98, Math.sin(a) * 1.12 - 0.6];
    const len = [1.75, 2.05, 2.15, 1.95, 1.65, 1.45][k % 6] * (n > 4 ? 0.95 : 1);
    prims.push(...capsule(base, lerp(2.05, 1.12, t), len, 0.23));
  }
  prims.push(...capsule([0.85, -0.85], 0.75, 1.45, 0.27));
  return prims;
}

export default {
  // 手：fingers 根手指；7e 是六根，第 9 章是正常的五根
  hand(N, pos, col, { fingers = 5, color = 'white' } = {}) {
    compose(N, pos, col, handPrims(fingers, C[color], 0.12), 701 + fingers);
  },

  // 9a–9c 两只手：左边一只（镜像），右边一只，伸向中间
  hands(N, pos, col, { gap = 1 } = {}) {
    const L = handPrims(5, C.warmWhite, 0.11), R = handPrims(5, C.gold, 0.11);
    // 每只手旋转 90° 横过来，指尖朝中间；gap = 0 时指尖相碰
    const dx = lerp(3.95, 5.7, gap);
    const place = (prims, sx, dy) => prims.map((p) => ({ ...p, at: (r, u) => { const q = p.at(r, u); return [sx * (q[1] + 3.3) * 0.62 - sx * dx, -sx * q[0] * 0.62 + dy, q[2]]; } }));
    compose(N, pos, col, [...place(L, 1, -0.25), ...place(R, -1, 0.25)], 790);
  },

  // 7d IEEE-754 单精度：32 个比特格，乱翻，最后定格在 NaN
  floatbits(N, pos, col) {
    const W = 0.27, x0 = -16 * W - 0.12;
    const nan = '01111111110000000000000000000000';
    const prims = [];
    for (let k = 0; k < 32; k++) {
      const x = x0 + k * W + (k >= 1 ? 0.12 : 0) + (k >= 9 ? 0.12 : 0);
      const cc = k === 0 ? C.red : k < 9 ? C.amber : C.magenta;
      prims.push(rect(x + 0.02, -0.3, x + W - 0.02, 0.3, { c: cc, b: 0.1 }));
      prims.push(text('0', { x: x + W / 2, y: -0.13, height: 0.3, align: 'center', c: C.white, b: 0.14, weight: 500, bit: k, v: 0 }));
      prims.push(text('1', { x: x + W / 2, y: -0.13, height: 0.3, align: 'center', c: C.white, b: 0.14, weight: 500, bit: k, v: 1 }));
    }
    const lab = (s, x, c) => prims.push(text(s, { x, y: 0.55, height: 0.22, align: 'center', c, b: 0.12, weight: 500 }));
    lab('sign', x0 + W / 2, C.red); lab('exponent', x0 + 0.12 + 5 * W, C.amber); lab('mantissa', x0 + 0.24 + 20.5 * W, C.magenta);
    prims.push(text('0x7FC00000 = NaN', { x: 0, y: -1.3, height: 0.5, align: 'center', c: C.magenta, b: 0.14, weight: 700, nan: true }));
    const comp = compose(N, pos, col, prims, 704);
    const L = comp.list;
    return function update(ctx) {
      const settle = ctx.p > 0.72, n = Math.floor(ctx.beat * 6);
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]];
        if (q.nan) { scaleCol(comp, col, i, settle ? 1.3 : 0); continue; }
        if (q.bit === undefined) continue;
        const v = settle ? +nan[q.bit] : hash(q.bit, n) < 0.5 ? 1 : 0;
        scaleCol(comp, col, i, q.v === v ? 1 : 0);
      }
    };
  },

  // 7f 拼错的字，错的地方下面画红色波浪线
  typo(N, pos, col) {
    const prims = [text('hello, wrold', { x: 0, y: -0.4, height: 1.1, align: 'center', c: C.white, b: 0.28, weight: 700 })];
    const w = prims[0].width, x1 = w / 2 - 0.12, x0 = x1 - w * (5 / 12);
    prims.push(curve((t) => [lerp(x0, x1, t), -0.75 + Math.sin(t * 40) * 0.07, 0], { c: C.red, b: 0.2, n: 200 }));
    compose(N, pos, col, prims, 706);
  },
};
