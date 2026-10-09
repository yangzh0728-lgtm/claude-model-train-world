// 第 7 章 崩溃 + 第 9 章用的手：浮点比特、手、拼错的字
import { rng, gauss, clamp, lerp, easeOut } from '../util.js';
import { C } from '../palette.js';
import { compose, seg, poly, curve, circle, rect, rectFill, disc, ball, text, orb, rod, ellipsoid, lit } from './kit.js';

const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const scaleCol = (comp, col, i, k) => { const o = i * 3; col[o] = comp.baseCol[o] * k; col[o + 1] = comp.baseCol[o + 1] * k; col[o + 2] = comp.baseCol[o + 2] * k; };

// 立体的手：椭球手掌 + 一节节圆柱手指（关节是小球）+ 拇指 + 前臂，手心朝镜头，用 lit() 打光
function handPrims(fingers, color, b) {
  const prims = [];
  const o = { c: color, b };
  prims.push(ellipsoid([0, -0.55, 0], [0.98, 1.12, 0.3], { ...o, w: 1.2 }));
  prims.push(rod([0, -1.45, -0.02], [0, -3.4, -0.08], 0.55, { ...o, b: b * 0.8 }));
  prims.push(ellipsoid([0, -1.5, 0], [0.62, 0.3, 0.32], o));
  const n = fingers - 1;
  const LEN = n > 4 ? [0.9, 1.0, 1.05, 1.0, 0.92, 0.8] : [0.9, 1.0, 0.95, 0.75];
  for (let k = 0; k < n; k++) {
    const t = n === 1 ? 0.5 : k / (n - 1);
    const x = lerp(-0.8, 0.72, t), fan = lerp(0.16, -0.08, t);
    const L = LEN[k % LEN.length], r0 = 0.17 - 0.02 * (k === n - 1 && n === 4 ? 1 : 0);
    let p = [x, 0.42 - Math.abs(t - 0.45) * 0.25, 0.02];
    let dir = [Math.sin(fan), Math.cos(fan), 0];
    const segs = [0.62, 0.42, 0.34];
    segs.forEach((sl, j) => {
      const len = sl * L, r = r0 * (1 - j * 0.1);
      // 每节往手心方向微微弯
      dir = [dir[0], dir[1] * Math.cos(0.12) , dir[1] * Math.sin(0.12) + dir[2]];
      const q = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
      prims.push(orb(p, r * 0.97, o), rod(p, q, r, o));
      p = q;
    });
    prims.push(orb(p, r0 * 0.82, o));
  }
  // 拇指：从手掌右下侧斜着伸出，往前（朝镜头）一点
  let p = [0.78, -0.85, 0.12], dir = [0.72, 0.6, 0.35];
  const dl = Math.hypot(...dir); dir = dir.map((v) => v / dl);
  [0.62, 0.45, 0.36].forEach((len, j) => {
    const r = 0.21 - j * 0.02;
    const q = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
    prims.push(orb(p, r, o), rod(p, q, r, o));
    p = q; dir = [dir[0] * 0.8, dir[1] + 0.25, dir[2]];
    const l2 = Math.hypot(...dir); dir = dir.map((v) => v / l2);
  });
  prims.push(orb(p, 0.17, o));
  return prims;
}

// 把一组图元整体变换：旋转 rot(v) + 缩放 k + 平移 t，法线跟着旋转
const xform = (prims, rot, k, t) => prims.map((p) => ({
  ...p,
  at: (r, u) => { const q = p.at(r, u), v = rot(q); const out = [v[0] * k + t[0], v[1] * k + t[1], v[2] * k + t[2]]; out.orig = q; return out; },
  normal: p.normal ? (q) => rot(p.normal(q.orig)) : undefined,
}));

export default {
  // 手：fingers 根手指；7e 是六根，第 9 章是正常的五根。整只手在空间里慢慢转
  hand(N, pos, col, { fingers = 5, color = 'white', b = 0.24 } = {}) {
    const comp = compose(N, pos, col, handPrims(fingers, C[color], b), 701 + fingers);
    return function update(ctx) {
      lit(comp, pos, col, N, { ry: Math.sin(ctx.t * 0.7) * 0.6, rx: 0.15 + Math.sin(ctx.t * 0.5) * 0.15, center: [0, -0.5, 0] });
    };
  },

  // 9a–9c 两只手：左右各一只横过来，指尖朝中间；gap = 0 时指尖相碰
  hands(N, pos, col, { gap = 1 } = {}) {
    const dx = lerp(4.22, 6.0, gap), k = 0.75;
    const L = xform(handPrims(5, C.warmWhite, 0.2), (v) => [v[1], -v[0], v[2]], k, [-dx + 3.3 * k, -0.25, 0]);
    const R = xform(handPrims(5, C.gold, 0.2), (v) => [-v[1], -v[0], v[2]], k, [dx - 3.3 * k, 0.25, 0]);
    const comp = compose(N, pos, col, [...L, ...R], 790);
    return function update(ctx) {
      lit(comp, pos, col, N, { ry: Math.sin(ctx.t * 0.4) * 0.25, rx: 0.2 });
    };
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
