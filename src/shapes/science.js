// 加密场景表用到的形态：噪声与高斯分布、暴胀网格、夸克、CMB、核聚变、周期表、
// 抛物线、相空间、棱镜色散、电磁波
import { rng, gauss, lerp3, clamp, smooth, lerp, hex } from '../util.js';
import { C } from '../palette.js';

function set(arr, i, x, y, z) { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; }

// 每个粒子固定一个高斯随机值：噪声方阵里是亮度，直方图里是位置，两者一一对应
let gv = null;
function gaussValues(N) {
  if (gv && gv.length === N) return gv;
  const r = rng(5);
  gv = new Float32Array(N);
  for (let i = 0; i < N; i++) gv[i] = gauss(r);
  return gv;
}
const valueColor = (v) => {
  const k = clamp((v + 2.5) / 5);
  return k < 0.5 ? lerp3(C.deep, C.ice, k * 2) : lerp3(C.ice, C.warmWhite, (k - 0.5) * 2);
};

// 波长（nm）→ RGB
function spectrum(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else r = 1;
  return [r, g, b];
}

// 周期表：原子序数 → (行, 列)
function elementCell(Z) {
  const p = [[1, 1, 1], [2, 1, 18]];
  if (Z === 1) return [0, 0];
  if (Z === 2) return [0, 17];
  const rowsMain = [[3, 10, 1], [11, 18, 2], [19, 36, 3], [37, 54, 4]];
  for (const [a, b, row] of rowsMain) {
    if (Z >= a && Z <= b) {
      const k = Z - a;
      const len = b - a + 1;
      if (len === 8) return [row, k < 2 ? k : k + 10];
      return [row, k];
    }
  }
  for (const [a, row, frow] of [[55, 5, 7.6], [87, 6, 8.6]]) {
    const k = Z - a;
    if (k < 2) return [row, k];
    if (k < 17) return [frow, k + 1];
    if (k < 32) return [row, k - 14];
  }
  void p;
  return [0, 0];
}
const blockColor = (Z) => {
  const [row, col] = elementCell(Z);
  if (row > 7) return C.pink;
  if (col < 2 || Z === 2) return C.ice;
  if (col > 11) return C.life;
  return C.amber;
};

export default {
  // 白噪声方阵：亮度 = 粒子的高斯值
  noiseSquare(N, pos, col) {
    const v = gaussValues(N), r = rng(51);
    for (let i = 0; i < N; i++) {
      set(pos, i, (r() * 2 - 1) * 3.2, (r() * 2 - 1) * 3.2, 0);
      const b = 0.04 + 0.22 * clamp((v[i] + 2.5) / 5);
      set(col, i, b, b, b * 1.1);
    }
  },

  // 高斯钟形直方图：粒子按自己的值落进对应的柱子，从下往上堆
  histogram(N, pos, col) {
    const v = gaussValues(N), r = rng(52);
    const bins = 61, lo = -3.05, w = 0.1;
    const count = new Int32Array(bins), rank = new Int32Array(N);
    for (let i = 0; i < N; i++) {
      const b = Math.min(bins - 1, Math.max(0, Math.floor((v[i] - lo) / w)));
      rank[i] = count[b]++;
    }
    const max = Math.max(...count);
    for (let i = 0; i < N; i++) {
      const b = Math.min(bins - 1, Math.max(0, Math.floor((v[i] - lo) / w)));
      const x = (lo + (b + 0.1 + r() * 0.8) * w) * 1.9;
      const y = -2.4 + (rank[i] / max) * 4.6;
      set(pos, i, x, y, gauss(r) * 0.01);
      const c = valueColor(v[i]);
      set(col, i, c[0] * 0.08, c[1] * 0.08, c[2] * 0.08);
    }
  },

  // 三维立方网格（暴胀时整体放大）
  lattice(N, pos, col) {
    const r = rng(53), n = 9, s = 0.55, h = ((n - 1) * s) / 2;
    for (let i = 0; i < N; i++) {
      const axis = (r() * 3) | 0;
      const a = ((r() * n) | 0) * s - h, b = ((r() * n) | 0) * s - h, t = r() * (n - 1) * s - h;
      const p = axis === 0 ? [t, a, b] : axis === 1 ? [a, t, b] : [a, b, t];
      set(pos, i, p[0] + gauss(r) * 0.006, p[1] + gauss(r) * 0.006, p[2] + gauss(r) * 0.006);
      const c = lerp3(C.ice, C.white, r() * 0.5);
      set(col, i, c[0] * 0.06, c[1] * 0.06, c[2] * 0.06);
    }
  },

  // 夸克：三个一组结合成重子（红绿蓝三色荷）
  quarks(N, pos, col) {
    const r = rng(54), B = 700;
    const centers = [];
    for (let k = 0; k < B; k++) {
      let x, y, z;
      do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; } while (x * x + y * y + z * z > 1);
      centers.push([x * 5, y * 3.2, z * 3, r() * 6.28]);
    }
    const qc = [hex('#FF4D6D'), hex('#4DFF88'), hex('#4D9BFF')];
    const bi = new Uint16Array(N), qi = new Uint8Array(N), off = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      bi[i] = (r() * B) | 0; qi[i] = (r() * 3) | 0;
      set(off, i, gauss(r) * 0.035, gauss(r) * 0.035, gauss(r) * 0.035);
      const c = lerp3(qc[qi[i]], C.white, 0.25);
      set(col, i, c[0] * 0.14, c[1] * 0.14, c[2] * 0.14);
    }
    return function update(ctx) {
      const bind = smooth(clamp(ctx.p * 2.2 - 0.2));
      const sep = lerp(0.7, 0.11, bind);
      for (let i = 0; i < N; i++) {
        const c = centers[bi[i]], o = i * 3;
        const a = c[3] + ctx.t * 3 + (qi[i] * Math.PI * 2) / 3;
        pos[o] = c[0] + Math.cos(a) * sep + off[o];
        pos[o + 1] = c[1] + Math.sin(a) * sep + off[o + 1];
        pos[o + 2] = c[2] + off[o + 2];
      }
    };
  },

  // 宇宙微波背景：椭圆全天图（摩尔威德投影的轮廓）上的温度涨落
  cmb(N, pos, col) {
    const r = rng(55);
    const waves = [];
    for (let k = 0; k < 40; k++) waves.push([gauss(r) * 3 * (1 + k / 10), gauss(r) * 3 * (1 + k / 10), r() * 6.28, 1 / (1 + k * 0.15)]);
    for (let i = 0; i < N; i++) {
      let x, y;
      do { x = r() * 2 - 1; y = r() * 2 - 1; } while (x * x + y * y > 1);
      let v = 0;
      for (const [kx, ky, ph, a] of waves) v += a * Math.sin(kx * x + ky * y + ph);
      v = clamp(v / 4, -1, 1);
      set(pos, i, x * 5, y * 2.6, v * 0.08);
      const c = v < 0 ? lerp3(C.white, C.deep, -v) : lerp3(C.white, C.amber, v);
      const b = 0.12 + 0.12 * Math.abs(v);
      set(col, i, c[0] * b, c[1] * b, c[2] * b);
    }
  },

  // 恒星核心：每小节四个氢核撞成一个氦核，放出正电子和中微子
  fusion(N, pos, col) {
    const r = rng(56);
    const role = new Uint8Array(N), which = new Uint8Array(N), off = new Float32Array(N * 3);
    const dirs = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]].map((d) => d.map((x) => x / Math.sqrt(3)));
    for (let i = 0; i < N; i++) {
      const roll = r();
      let c, b;
      if (roll < 0.5) {
        role[i] = 0;
        const u = r() * 2 - 1, a = r() * 6.28, s = Math.sqrt(1 - u * u), rr = 4.2 + gauss(r) * 0.25;
        set(off, i, s * Math.cos(a) * rr, u * rr, s * Math.sin(a) * rr);
        c = lerp3(C.amber, C.red, r()); b = 0.025;
      } else if (roll < 0.9) {
        role[i] = 1; which[i] = (r() * 4) | 0;
        set(off, i, gauss(r) * 0.17, gauss(r) * 0.17, gauss(r) * 0.17);
        c = lerp3(C.warmWhite, C.gold, r()); b = 0.1;
      } else {
        role[i] = 2; which[i] = (r() * 4) | 0;
        set(off, i, r(), gauss(r) * 0.02, gauss(r) * 0.02);
        c = which[i] < 2 ? C.cyan : C.white; b = 0.12;
      }
      set(col, i, c[0] * b, c[1] * b, c[2] * b);
    }
    return function update(ctx) {
      const ph = (((ctx.beat % 4) + 4) % 4) / 4;
      const close = smooth(clamp(ph / 0.45));
      const out = Math.max(0, ph - 0.45);
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        if (role[i] === 0) {
          const s = 1 + 0.03 * Math.sin(ctx.t * 6 + off[o + 1] * 3);
          pos[o] = off[o] * s; pos[o + 1] = off[o + 1] * s; pos[o + 2] = off[o + 2] * s;
        } else if (role[i] === 1) {
          const d = dirs[which[i]], k = 2.4 * (1 - close) + 0.2;
          pos[o] = d[0] * k + off[o]; pos[o + 1] = d[1] * k + off[o + 1]; pos[o + 2] = d[2] * k + off[o + 2];
        } else {
          const d = dirs[which[i]], k = out * 14 + off[o] * out * 4;
          pos[o] = -d[0] * k + off[o + 1]; pos[o + 1] = -d[2] * k + off[o + 2]; pos[o + 2] = d[1] * k;
        }
      }
    };
  },

  // 元素周期表，按进度逐格点亮
  periodic(N, pos, col) {
    const r = rng(57), cell = 0.44;
    const Zs = new Uint8Array(N);
    const base = [];
    for (let Z = 1; Z <= 118; Z++) base[Z] = blockColor(Z);
    for (let i = 0; i < N; i++) {
      const Z = 1 + ((r() * 118) | 0);
      Zs[i] = Z;
      const [row, c] = elementCell(Z);
      let u = r() - 0.5, v = r() - 0.5;
      if (r() < 0.5) { if (r() < 0.5) u = Math.sign(u) * 0.5; else v = Math.sign(v) * 0.5; }
      set(pos, i, (c - 8.5 + u * 0.82) * cell, (3.9 - row + v * 0.82) * cell, 0);
    }
    return function update(ctx) {
      const lit = 118 * clamp(ctx.p * 1.15);
      for (let i = 0; i < N; i++) {
        const Z = Zs[i], c = base[Z], o = i * 3;
        const age = lit - Z;
        const b = age < 0 ? 0.02 : 0.12 + 0.3 * Math.exp(-age * 0.25);
        col[o] = c[0] * b; col[o + 1] = c[1] * b; col[o + 2] = c[2] * b;
      }
    };
  },

  // 一束抛射轨迹，按拍扇形展开
  parabolas(N, pos, col) {
    const r = rng(58), K = 9, v0 = 6.6, g = 9.81, ox = -4.2, oy = -2.2, sc = 1.25;
    const tr = new Uint8Array(N), s = new Float32Array(N), role = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (r() < 0.06) { role[i] = 1; set(pos, i, -5 + r() * 10, oy - 0.02, 0); set(col, i, 0.03, 0.04, 0.05); continue; }
      tr[i] = (r() * K) | 0; s[i] = r();
      const c = lerp3(C.ice, C.white, tr[i] / K);
      set(col, i, c[0] * 0.07, c[1] * 0.07, c[2] * 0.07);
    }
    return function update(ctx) {
      for (let i = 0; i < N; i++) {
        if (role[i]) continue;
        const k = tr[i], th = ((15 + (60 * k) / (K - 1)) * Math.PI) / 180;
        const T = (2 * v0 * Math.sin(th)) / g;
        const reveal = clamp((ctx.p * 1.3 - k * 0.07) / 0.35);
        const tt = Math.min(s[i], reveal) * T;
        const o = i * 3;
        pos[o] = ox + v0 * Math.cos(th) * tt * sc;
        pos[o + 1] = oy + (v0 * Math.sin(th) * tt - 0.5 * g * tt * tt) * sc;
        pos[o + 2] = gauss01(i) * 0.02;
      }
    };
  },

  // 简谐振动：相空间里的圆 → 展开成余弦波
  phase(N, pos, col) {
    const r = rng(59), R = 1.4, cx = -3.4, x0 = -1.4, x1 = 5.4, speed = 2.2, w = Math.PI * 2;
    const role = new Uint8Array(N), u = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const roll = r();
      role[i] = roll < 0.2 ? 0 : roll < 0.26 ? 1 : roll < 0.32 ? 2 : roll < 0.4 ? 3 : 4;
      u[i] = r();
      const c = role[i] === 1 ? C.white : role[i] === 3 ? C.deep : C.ice;
      const b = [0.05, 0.25, 0.04, 0.03, 0.08][role[i]];
      set(col, i, c[0] * b, c[1] * b, c[2] * b);
    }
    return function update(ctx) {
      const t = ctx.t, my = R * Math.sin(w * t), mx = cx + R * Math.cos(w * t);
      for (let i = 0; i < N; i++) {
        const o = i * 3, a = u[i];
        let x = 0, y = 0;
        switch (role[i]) {
          case 0: x = cx + R * Math.cos(a * 6.283); y = R * Math.sin(a * 6.283); break;
          case 1: x = mx + gauss01(i) * 0.05; y = my + gauss01(i + 7) * 0.05; break;
          case 2: x = lerp(mx, x0, a); y = my; break;
          case 3: x = lerp(cx - 2, x1, a); y = 0; break;
          default: x = lerp(x0, x1, a); y = R * Math.sin(w * (t - (x - x0) / speed));
        }
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = 0;
      }
    };
  },

  // 白光穿过三棱镜散成光谱，光子沿光路流动
  prism(N, pos, col) {
    const r = rng(60);
    const A = [0, 1.5], Bv = [-1.3, -0.75], Cv = [1.3, -0.75];
    const entry = [-0.65, 0.375], exit = [0.65, 0.375], src = [-6.5, -1.4];
    const role = new Uint8Array(N), u = new Float32Array(N), lam = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const roll = r();
      role[i] = roll < 0.14 ? 0 : roll < 0.38 ? 1 : roll < 0.46 ? 2 : 3;
      u[i] = r(); lam[i] = 400 + r() * 300;
      let c, b;
      if (role[i] === 0) {
        const e = (r() * 3) | 0, t = r(), P = [A, Bv, Cv][e], Q = [Bv, Cv, A][e];
        set(pos, i, lerp(P[0], Q[0], t), lerp(P[1], Q[1], t), gauss01(i) * 0.02);
        c = C.white; b = 0.05;
      } else if (role[i] === 3) { c = spectrum(lam[i]); b = 0.07; }
      else { c = C.white; b = 0.06; }
      set(col, i, c[0] * b, c[1] * b, c[2] * b);
    }
    return function update(ctx) {
      for (let i = 0; i < N; i++) {
        if (role[i] === 0) continue;
        const o = i * 3, f = (u[i] + ctx.t * 0.8) % 1;
        let x, y;
        if (role[i] === 1) { x = lerp(src[0], entry[0], f); y = lerp(src[1], entry[1], f); }
        else if (role[i] === 2) { x = lerp(entry[0], exit[0], f); y = lerp(entry[1], exit[1], f) + (lam[i] - 550) * 0.0002; }
        else {
          const ang = -0.12 - ((700 - lam[i]) / 300) * 0.5;
          const L = 6.2 * f;
          x = exit[0] + Math.cos(ang) * L; y = exit[1] + Math.sin(ang) * L;
        }
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = gauss01(i) * 0.03;
      }
    };
  },

  // 电磁波：E（竖直）与 B（水平）两列正交正弦波沿 x 推进
  emwave(N, pos, col) {
    const r = rng(61), A = 1.5, k = (Math.PI * 2) / 3.6, w = Math.PI * 2 * 1.2;
    const role = new Uint8Array(N), x = new Float32Array(N), f = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const roll = r();
      role[i] = roll < 0.32 ? 0 : roll < 0.64 ? 1 : roll < 0.8 ? 2 : roll < 0.95 ? 3 : 4;
      x[i] = -6 + r() * 12;
      if (role[i] === 2 || role[i] === 3) x[i] = Math.round(x[i] / 0.3) * 0.3;
      f[i] = r();
      const c = role[i] === 0 || role[i] === 2 ? C.ice : role[i] === 4 ? C.white : C.amber;
      const b = role[i] < 2 ? 0.08 : role[i] === 4 ? 0.04 : 0.03;
      set(col, i, c[0] * b, c[1] * b, c[2] * b);
    }
    return function update(ctx) {
      for (let i = 0; i < N; i++) {
        const o = i * 3, ph = A * Math.sin(k * x[i] - w * ctx.t);
        let y = 0, z = 0;
        if (role[i] === 0) y = ph; else if (role[i] === 1) z = ph;
        else if (role[i] === 2) y = ph * f[i]; else if (role[i] === 3) z = ph * f[i];
        pos[o] = x[i]; pos[o + 1] = y; pos[o + 2] = z;
      }
    };
  },
};

// 固定的逐粒子小抖动（不随时间变）
function gauss01(i) {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}
