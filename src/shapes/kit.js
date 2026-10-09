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

// ---------- 立体图元（带法线，配合 lit() 使用） ----------
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

// 实心球表面：均匀撒点，法线朝外
export const orb = (c, R, o = {}) => ({
  kind: 'area', m: 4 * Math.PI * R * R * 0.5,
  at(r) { const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), k = R * (1 + gauss(r) * (o.th ?? 0.006)); return [c[0] + s * Math.cos(a) * k, c[1] + u * k, (c[2] ?? 0) + s * Math.sin(a) * k]; },
  normal(q) { return norm3([q[0] - c[0], q[1] - c[1], q[2] - (c[2] ?? 0)]); },
  solid: true,
  ...o,
});

// 椭球：半轴 a = [ax, ay, az]
export const ellipsoid = (c, a, o = {}) => ({
  kind: 'area', m: 4 * Math.PI * ((a[0] * a[1] + a[1] * a[2] + a[0] * a[2]) / 3) * 0.5, solid: true,
  at(r) { const u = r() * 2 - 1, t = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); return [c[0] + s * Math.cos(t) * a[0], c[1] + u * a[1], (c[2] ?? 0) + s * Math.sin(t) * a[2]]; },
  normal(q) { return norm3([(q[0] - c[0]) / (a[0] * a[0]), (q[1] - c[1]) / (a[1] * a[1]), (q[2] - (c[2] ?? 0)) / (a[2] * a[2])]); },
  ...o,
});

// 圆柱（化学键、轴）：a → b，半径 R
export function rod(a, b, R, o = {}) {
  const A = [a[0], a[1], a[2] ?? 0], B = [b[0], b[1], b[2] ?? 0];
  const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(...d), w = norm3(d);
  const t0 = norm3(Math.abs(w[0]) < 0.9 ? [0, -w[2], w[1]] : [-w[2], 0, w[0]]);
  const t1 = [w[1] * t0[2] - w[2] * t0[1], w[2] * t0[0] - w[0] * t0[2], w[0] * t0[1] - w[1] * t0[0]];
  return {
    kind: 'area', m: 2 * Math.PI * R * L * 0.5, solid: true,
    at(r) { const s = r(), a2 = r() * Math.PI * 2, cs = Math.cos(a2) * R, sn = Math.sin(a2) * R; return [A[0] + d[0] * s + t0[0] * cs + t1[0] * sn, A[1] + d[1] * s + t0[1] * cs + t1[1] * sn, A[2] + d[2] * s + t0[2] * cs + t1[2] * sn]; },
    normal(q) { const v = [q[0] - A[0], q[1] - A[1], q[2] - A[2]], s = v[0] * w[0] + v[1] * w[1] + v[2] * w[2]; return norm3([v[0] - w[0] * s, v[1] - w[1] * s, v[2] - w[2] * s]); },
    ...o,
  };
}

// 轨道花瓣（孤对电子、p 轨道）：从 c 沿 dir 伸出的泪滴形曲面
export function lobe(c, dir, len, width, o = {}) {
  const w = norm3(dir);
  const t0 = norm3(Math.abs(w[0]) < 0.9 ? [0, -w[2], w[1]] : [-w[2], 0, w[0]]);
  const t1 = [w[1] * t0[2] - w[2] * t0[1], w[2] * t0[0] - w[0] * t0[2], w[0] * t0[1] - w[1] * t0[0]];
  const P = (s, a) => { const rr = width * Math.sin(Math.PI * Math.pow(s, 0.7)) * (1 - 0.25 * s); return [c[0] + w[0] * s * len + (t0[0] * Math.cos(a) + t1[0] * Math.sin(a)) * rr, c[1] + w[1] * s * len + (t0[1] * Math.cos(a) + t1[1] * Math.sin(a)) * rr, (c[2] ?? 0) + w[2] * s * len + (t0[2] * Math.cos(a) + t1[2] * Math.sin(a)) * rr]; };
  return {
    kind: 'area', m: len * width * 4, solid: true,
    at(r) { const s = Math.sqrt(r()), a = r() * Math.PI * 2; const q = P(s, a); q.s = s; q.a = a; return q; },
    normal(q) { const e = 0.01, a = P(Math.min(1, q.s + e), q.a), b = P(q.s, q.a + e), p0 = P(q.s, q.a); const u1 = [a[0] - p0[0], a[1] - p0[1], a[2] - p0[2]], u2 = [b[0] - p0[0], b[1] - p0[1], b[2] - p0[2]]; const n = norm3([u1[1] * u2[2] - u1[2] * u2[1], u1[2] * u2[0] - u1[0] * u2[2], u1[0] * u2[1] - u1[1] * u2[0]]); const out = [p0[0] - c[0] - w[0] * q.s * len, p0[1] - c[1] - w[1] * q.s * len, p0[2] - (c[2] ?? 0) - w[2] * q.s * len]; return n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0 ? [-n[0], -n[1], -n[2]] : n; },
    ...o,
  };
}

// 圆环（π 电子云、甜甜圈）：中心 c，在 xy 平面，大半径 R，管半径 r
export const torus = (c, R, r, o = {}) => ({
  kind: 'area', m: 4 * Math.PI * Math.PI * R * r * 0.5, solid: true,
  at(rr) { const a = rr() * Math.PI * 2, b = rr() * Math.PI * 2; return [c[0] + (R + r * Math.cos(b)) * Math.cos(a), c[1] + (R + r * Math.cos(b)) * Math.sin(a), (c[2] ?? 0) + r * Math.sin(b)]; },
  normal(q) { const a = Math.atan2(q[1] - c[1], q[0] - c[0]); return norm3([q[0] - c[0] - Math.cos(a) * R, q[1] - c[1] - Math.sin(a) * R, q[2] - (c[2] ?? 0)]); },
  ...o,
});

// 光照：把组合形态绕 y、x 轴转动后，按固定光源重新算每个粒子的亮度。
// 立体图元：漫反射 + 高光 + 轮廓光；ink = true 时（纸面）反过来——暗面粒子更亮，显影成更浓的墨，像铜版画的点刻阴影。
// 其他图元只跟着转。
const LIGHT = norm3([-0.55, 0.65, 0.75]);
export function lit(comp, pos, col, N, { ry = 0, rx = 0, ink = false, light = LIGHT, center = [0, 0, 0], only } = {}) {
  const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
  const { base, baseCol, nrm, list, role } = comp;
  for (let i = 0; i < N; i++) {
    const p = list[role[i]];
    if (only && !only(p)) continue;
    if (p.flat) continue;
    const o = i * 3;
    let x = base[o] - center[0], y = base[o + 1] - center[1], z = base[o + 2] - center[2];
    let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    let y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
    pos[o] = x1 + center[0]; pos[o + 1] = y2 + center[1]; pos[o + 2] = z2 + center[2];
    if (!p.solid || !nrm) continue;
    let nx = nrm[o], ny = nrm[o + 1], nz = nrm[o + 2];
    const nx1 = nx * cy + nz * sy, nz1 = -nx * sy + nz * cy;
    const ny2 = ny * cx - nz1 * sx, nz2 = ny * sx + nz1 * cx;
    const ndl = nx1 * light[0] + ny2 * light[1] + nz2 * light[2];
    const diff = Math.max(0, ndl);
    // 半程向量（观察方向 +z）的高光
    const hx = light[0], hy = light[1], hz = light[2] + 1, hl = Math.hypot(hx, hy, hz);
    const spec = Math.pow(Math.max(0, (nx1 * hx + ny2 * hy + nz2 * hz) / hl), 40);
    const rim = Math.pow(1 - Math.abs(nz2), 3);
    // 背面的点淡掉，避免穿透感
    const back = nz2 < 0 ? 0.25 : 1;
    let k;
    if (ink) k = (0.12 + 1.5 * Math.pow(1 - diff, 1.6) + 0.9 * rim * (1 - diff)) * back * (1 - 0.9 * spec);
    else k = (0.08 + 1.25 * diff + (p.spec ?? 1) * 2.2 * spec + (p.rim ?? 0.6) * rim) * back;
    col[o] = baseCol[o] * k; col[o + 1] = baseCol[o + 1] * k; col[o + 2] = baseCol[o + 2] * k;
  }
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
  // 有法线的图元（立体球、圆柱、花瓣）记下法线，供 lit() 做光照
  const hasN = list.some((p) => p.normal);
  const nrm = hasN ? new Float32Array(N * 3) : null;
  for (let i = 0; i < N; i++) {
    const p = list[role[i]];
    const q = p.at(r, u[i]);
    pos[i * 3] = q[0]; pos[i * 3 + 1] = q[1]; pos[i * 3 + 2] = q[2];
    if (hasN && p.normal) { const n = p.normal(q); nrm[i * 3] = n[0]; nrm[i * 3 + 1] = n[1]; nrm[i * 3 + 2] = n[2]; }
    const c = typeof p.c === 'function' ? p.c(r, u[i]) : p.c ?? [0.43, 0.78, 1];
    const b = (p.b ?? 0.1) * mult[role[i]];
    col[i * 3] = c[0] * b; col[i * 3 + 1] = c[1] * b; col[i * 3 + 2] = c[2] * b;
  }
  return { list, role, u, mult, nrm, base: pos.slice(), baseCol: col.slice() };
}

// 便捷：静态形态 = compose 一次
export const staticShape = (build, seed) => (N, pos, col, params) => { compose(N, pos, col, build(params), seed); };
