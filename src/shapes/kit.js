// 形态拼装工具：把线段、折线、圆、圆盘、球、文字等“图元”按权重拼成一个形态。
// 亮度按图元的粒子密度自动归一：同样的 b，在长线和短线上看起来一样亮，
// 在大面积和小面积上看起来也一样亮，不用为每个形态单独调粒子分配。
import { rng, gauss } from '../util.js';
import { FONT } from './text.js';

const D_LINE = 2600;   // 每单位长度的参考粒子数
const D_AREA = 9000;   // 每单位面积的参考粒子数

// ---------- 图元 ----------
const th3 = (r, t) => [gauss(r) * t, gauss(r) * t, gauss(r) * t];

export const seg = (a, b, o = {}) => ({
  kind: 'line', m: Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] ?? 0) - (a[2] ?? 0)),
  at(r, u = r()) { const j = th3(r, o.th ?? 0.008); return [a[0] + (b[0] - a[0]) * u + j[0], a[1] + (b[1] - a[1]) * u + j[1], (a[2] ?? 0) + ((b[2] ?? 0) - (a[2] ?? 0)) * u + j[2]]; },
  ...o,
});

// 折线：按弧长均匀取点
export function poly(pts, o = {}) {
  const P = (o.closed ? [...pts, pts[0]] : pts).map((p) => [p[0], p[1], p[2] ?? 0]);
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]));
  const total = L[L.length - 1] || 1e-6;
  const pointAt = (u) => {
    const d = u * total;
    let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L[mid] <= d) lo = mid; else hi = mid; }
    const f = (d - L[lo]) / (L[hi] - L[lo] || 1);
    return [P[lo][0] + (P[hi][0] - P[lo][0]) * f, P[lo][1] + (P[hi][1] - P[lo][1]) * f, P[lo][2] + (P[hi][2] - P[lo][2]) * f];
  };
  return {
    kind: 'line', m: total, pointAt,
    at(r, u = r()) { const p = pointAt(u), j = th3(r, o.th ?? 0.008); return [p[0] + j[0], p[1] + j[1], p[2] + j[2]]; },
    ...o,
  };
}

// 参数曲线 f(t), t ∈ [0, 1]
export const curve = (f, o = {}) => poly(Array.from({ length: (o.n ?? 200) + 1 }, (_, i) => f(i / (o.n ?? 200))), o);

export const circle = (c, R, o = {}) => curve((t) => {
  const a = (o.a0 ?? 0) + t * ((o.a1 ?? Math.PI * 2) - (o.a0 ?? 0));
  return o.plane === 'xz' ? [c[0] + Math.cos(a) * R, c[1], (c[2] ?? 0) + Math.sin(a) * R] : [c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R, c[2] ?? 0];
}, { n: 120, ...o });

export const rect = (x0, y0, x1, y1, o = {}) => poly([[x0, y0, o.z ?? 0], [x1, y0, o.z ?? 0], [x1, y1, o.z ?? 0], [x0, y1, o.z ?? 0]], { closed: true, ...o });

export const rectFill = (x0, y0, x1, y1, o = {}) => ({
  kind: 'area', m: Math.abs((x1 - x0) * (y1 - y0)),
  at(r) { return [x0 + (x1 - x0) * r(), y0 + (y1 - y0) * r(), (o.z ?? 0) + gauss(r) * (o.th ?? 0.005)]; },
  ...o,
});

export const disc = (c, R, o = {}) => ({
  kind: 'area', m: Math.PI * R * R,
  at(r) { const a = r() * Math.PI * 2, s = R * Math.sqrt(r()); return [c[0] + Math.cos(a) * s, c[1] + Math.sin(a) * s, (c[2] ?? 0) + gauss(r) * (o.th ?? 0.005)]; },
  ...o,
});

export const sphere = (c, R, o = {}) => ({
  kind: 'area', m: 4 * Math.PI * R * R,
  at(r) { const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), k = R * (1 + gauss(r) * (o.th ?? 0.01)); return [c[0] + s * Math.cos(a) * k, c[1] + u * k, (c[2] ?? 0) + s * Math.sin(a) * k]; },
  ...o,
});

// 实心发光球（高斯分布）
export const ball = (c, R, o = {}) => ({
  kind: 'area', m: Math.PI * R * R * 2,
  at(r) { return [c[0] + gauss(r) * R * 0.5, c[1] + gauss(r) * R * 0.5, (c[2] ?? 0) + gauss(r) * R * 0.5]; },
  ...o,
});

// 箭头：线段 + 两片箭头
export function arrow(a, b, o = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, h = o.head ?? 0.18;
  const ux = dx / L, uy = dy / L;
  const l1 = [b[0] - ux * h - uy * h * 0.5, b[1] - uy * h + ux * h * 0.5, b[2] ?? 0];
  const l2 = [b[0] - ux * h + uy * h * 0.5, b[1] - uy * h - ux * h * 0.5, b[2] ?? 0];
  return [seg(a, b, o), seg(l1, b, o), seg(l2, b, o)];
}

// ---------- 文字 ----------
// 支持 x^{2}、x_{0} 这样的上下标
function drawRich(g, str, x, y, size, font, draw) {
  const parts = [];
  const re = /([\^_])\{([^}]*)\}/g;
  let last = 0, m;
  while ((m = re.exec(str))) {
    if (m.index > last) parts.push([str.slice(last, m.index), 0]);
    parts.push([m[2], m[1] === '^' ? 1 : -1]);
    last = re.lastIndex;
  }
  if (last < str.length) parts.push([str.slice(last), 0]);
  let cx = x;
  for (const [t, k] of parts) {
    const s = k ? size * 0.62 : size;
    g.font = `${font.replace('SIZE', s)}`;
    if (draw) g.fillText(t, cx, y - k * size * (k > 0 ? 0.42 : -0.18));
    cx += g.measureText(t).width;
  }
  return cx - x;
}

const textCache = new Map();
// 文字图元：height 为字高（世界单位），align: left | center | right
export function text(str, o = {}) {
  const font = o.font ?? `${o.weight ?? 700} SIZEpx ${o.family ?? FONT}`;
  const key = str + '|' + font;
  let hit = textCache.get(key);
  if (!hit) {
    const px = 140;
    const cv = document.createElement('canvas');
    const g = cv.getContext('2d');
    const w = Math.ceil(drawRich(g, str, 0, 0, px, font, false)) + 20;
    const h = Math.ceil(px * 1.5);
    cv.width = w; cv.height = h;
    g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    drawRich(g, str, 10, px * 1.1, px, font, true);
    const data = g.getImageData(0, 0, w, h).data;
    const pts = [];
    for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] > 128) pts.push(i);
    hit = { w, h, px, pts };
    textCache.set(key, hit);
  }
  const H = o.height ?? 0.5, s = H / hit.px;
  const width = (hit.w - 20) * s;
  const ox = (o.x ?? 0) - (o.align === 'center' ? width / 2 : o.align === 'right' ? width : 0);
  const oy = o.y ?? 0, oz = o.z ?? 0;
  return {
    kind: 'area', m: hit.pts.length * s * s * 1.6, width,
    at(r) {
      const k = hit.pts.length ? hit.pts[(r() * hit.pts.length) | 0] : 0;
      return [ox + ((k % hit.w) - 10 + r()) * s, oy - (Math.floor(k / hit.w) + r() - hit.px * 1.1) * s, oz + gauss(r) * 0.004];
    },
    ...o,
  };
}

// ---------- 拼装 ----------
// prims: 图元数组（可嵌套），每个图元可带 w（权重）、c（颜色）、b（亮度）
// 返回每个粒子属于哪个图元（role）和它在图元上的随机参数（u），供动态形态使用
export function compose(N, pos, col, prims, seed = 1) {
  const list = prims.flat(3).filter(Boolean);
  const r = rng(seed);
  const W = list.reduce((s, p) => s + (p.w ?? 1) * Math.max(p.m, 1e-3) ** (p.kind === 'line' ? 1 : 0.5) * (p.kind === 'line' ? 1 : 2.5), 0);
  const weights = list.map((p) => ((p.w ?? 1) * Math.max(p.m, 1e-3) ** (p.kind === 'line' ? 1 : 0.5) * (p.kind === 'line' ? 1 : 2.5)) / W);
  const cum = [];
  weights.reduce((s, w, i) => (cum[i] = s + w), 0);
  const counts = new Float32Array(list.length);
  const role = new Uint16Array(N), u = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = r();
    let k = 0;
    while (k < cum.length - 1 && x > cum[k]) k++;
    role[i] = k; u[i] = r(); counts[k]++;
  }
  const mult = list.map((p, k) => {
    const d = counts[k] / Math.max(p.m, 1e-3);
    const ref = p.kind === 'line' ? D_LINE : D_AREA;
    return Math.min(6, Math.max(0.02, (ref / Math.max(d, 1)) * (N / 262144)));
  });
  for (let i = 0; i < N; i++) {
    const p = list[role[i]];
    const q = p.at(r, u[i]);
    pos[i * 3] = q[0]; pos[i * 3 + 1] = q[1]; pos[i * 3 + 2] = q[2];
    const c = typeof p.c === 'function' ? p.c(r, u[i]) : p.c ?? [0.43, 0.78, 1];
    const b = (p.b ?? 0.1) * mult[role[i]];
    col[i * 3] = c[0] * b; col[i * 3 + 1] = c[1] * b; col[i * 3 + 2] = c[2] * b;
  }
  return { list, role, u, mult, base: pos.slice(), baseCol: col.slice() };
}

// 便捷：静态形态 = compose 一次
export const staticShape = (build, seed) => (N, pos, col, params) => { compose(N, pos, col, build(params), seed); };
