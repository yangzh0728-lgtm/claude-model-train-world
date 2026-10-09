// 第 3 章 生命：水分子、苯环、α 螺旋、DNA、转录翻译、细胞分裂、神经元、眼睛
import { rng, gauss, lerp3, clamp, smooth, lerp } from '../util.js';
import { C } from '../palette.js';
import { compose, seg, poly, curve, circle, disc, sphere, ball, text, orb, rod, lobe, lit, torus } from './kit.js';

const BASE = { A: [0.49, 1, 0.7], T: [1, 0.35, 0.43], C: [0.43, 0.78, 1], G: [1, 0.82, 0.48] };
const PAIR = { A: 'T', T: 'A', C: 'G', G: 'C' };
const SEQ = 'ATGCGTACCTAGGCATTACGGATCCATGGCTAAGTCGATCGTA';

export default {
  // 3a 水分子（纸面插图）：立体球棍模型，两对孤对电子是 sp³ 花瓣，慢慢转动，点刻阴影
  water(N, pos, col) {
    const O = [0, 0.45, 0], half = (104.5 / 2) * (Math.PI / 180), d = 2.25;
    const H1 = [O[0] + Math.sin(half) * d, O[1] - Math.cos(half) * d, 0], H2 = [O[0] - Math.sin(half) * d, O[1] - Math.cos(half) * d, 0];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const prims = [
      orb(O, 0.95, { c: C.red, b: 0.16, w: 1.4 }),
      orb(H1, 0.58, { c: C.white, b: 0.1 }), orb(H2, 0.58, { c: C.white, b: 0.1 }),
      rod(O, H1, 0.16, { c: C.white, b: 0.1 }), rod(O, H2, 0.16, { c: C.white, b: 0.1 }),
      // 孤对电子：两片花瓣伸向分子平面的前后上方
      lobe(O, [0, 0.62, 0.78], 1.55, 0.72, { c: C.ice, b: 0.05, w: 0.8 }), lobe(O, [0, 0.62, -0.78], 1.55, 0.72, { c: C.ice, b: 0.05, w: 0.8 }),
      // 键角弧线（随分子转动）
      circle(O, 1.35, { a0: -Math.PI / 2 - half, a1: -Math.PI / 2 + half, c: C.amber, b: 0.14, n: 80 }),
      // 文字标注不转
      text('O', { x: 1.25, y: 1.25, height: 0.42, c: C.red, b: 0.14, flat: true, family: '"EB Garamond"', weight: 600 }),
      text('H', { x: H1[0] + 0.55, y: H1[1] - 0.95, height: 0.38, c: C.white, b: 0.14, flat: true, family: '"EB Garamond"', weight: 600 }),
      text('H', { x: H2[0] - 0.85, y: H2[1] - 0.95, height: 0.38, c: C.white, b: 0.14, flat: true, family: '"EB Garamond"', weight: 600 }),
      text('104.5°', { x: 0, y: O[1] - 2.25, height: 0.3, align: 'center', c: C.amber, b: 0.16, flat: true, family: '"EB Garamond"', weight: 600 }),
      text('lone pairs', { x: -2.6, y: 2.55, height: 0.24, c: C.ice, b: 0.12, flat: true, family: '"EB Garamond"', weight: 400 }),
      seg([-1.25, 2.5], [-0.45, 1.95], { c: C.ice, b: 0.06, flat: true }),
    ];
    void sub;
    const comp = compose(N, pos, col, prims, 301);
    return function update(ctx) {
      lit(comp, pos, col, N, { ry: Math.sin(ctx.t * 0.7) * 0.55, rx: 0.18 + Math.sin(ctx.t * 0.45) * 0.12, ink: true, center: O });
    };
  },

  // 3b 苯环：立体球棍模型 + 上下两层 π 电子云，整体在空间里转；双键每拍换位置（共振）
  benzene(N, pos, col) {
    const R = 1.55, V = Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 2 + (k * Math.PI) / 3; return [Math.cos(a) * R, Math.sin(a) * R, 0]; });
    const prims = [];
    V.forEach((v, k) => {
      const w = V[(k + 1) % 6], hpos = [v[0] * 1.7, v[1] * 1.7, 0];
      prims.push(orb(v, 0.34, { c: lerp3(C.ice, C.white, 0.3), b: 0.2 }));
      prims.push(orb(hpos, 0.2, { c: C.white, b: 0.18 }));
      prims.push(rod(v, hpos, 0.07, { c: C.white, b: 0.14 }));
      prims.push(rod(v, w, 0.085, { c: C.ice, b: 0.18 }));
      // 双键的第二根：往环内偏一点
      const inn = (p) => [p[0] * 0.84, p[1] * 0.84, 0];
      prims.push(rod(lerp3(inn(v), inn(w), 0.12), lerp3(inn(v), inn(w), 0.88), 0.07, { c: C.life, b: 0.22, dbl: k % 2 }));
    });
    // π 电子云：环上下两个甜甜圈
    for (const z of [-0.42, 0.42]) prims.push(torus([0, 0, z], R, 0.28, { c: C.life, b: 0.025, cloud: true, rim: 1.2, spec: 0.2 }));
    const comp = compose(N, pos, col, prims, 302);
    const L = comp.list;
    return function update(ctx) {
      lit(comp, pos, col, N, { ry: ctx.t * 0.6, rx: -1.0 + Math.sin(ctx.t * 0.4) * 0.25 });
      const set = Math.floor(ctx.beat) % 2;
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]];
        if (q.dbl === undefined) continue;
        if (q.dbl !== set) { const o = i * 3; col[o] = col[o + 1] = col[o + 2] = 0; }
      }
    };
  },

  // 3c α 螺旋：伸直的肽链按进度折叠成螺旋（每圈 3.6 个残基）
  helix(N, pos, col) {
    const r = rng(303), n = 26, R = 0.9, pitch = 1.5;
    const role = new Uint8Array(N), s = new Float32Array(N), off = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const x = r();
      role[i] = x < 0.45 ? 0 : x < 0.9 ? 1 : 2;  // 0 残基 1 主链 2 氢键
      s[i] = role[i] === 0 ? ((r() * n) | 0) / (n - 1) : r();
      const t = role[i] === 0 ? 0.13 : 0.02;
      off[i * 3] = gauss(r) * t; off[i * 3 + 1] = gauss(r) * t; off[i * 3 + 2] = gauss(r) * t;
      const c = role[i] === 0 ? lerp3(C.life, C.ice, s[i]) : role[i] === 1 ? C.white : C.amber;
      const b = role[i] === 0 ? 0.05 : role[i] === 1 ? 0.06 : 0.05;
      col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
    }
    const at = (sv, f) => {
      const x0 = -4.5 + sv * 9, zig = Math.sin(sv * n * Math.PI) * 0.25;
      const th = sv * (n / 3.6) * Math.PI * 2;
      const xh = -((n / 3.6) * pitch) / 2 + sv * (n / 3.6) * pitch;
      return [lerp(x0, xh, f), lerp(zig, R * Math.cos(th), f), lerp(0, R * Math.sin(th), f)];
    };
    return function update(ctx) {
      const f = smooth(clamp(ctx.p * 1.6 - 0.1));
      for (let i = 0; i < N; i++) {
        let p;
        if (role[i] === 2) {
          // i → i+4 的氢键（虚线），折叠后才出现
          const k = Math.floor(s[i] * (n - 4)), t = (s[i] * (n - 4)) % 1;
          const a = at(k / (n - 1), f), b = at((k + 4) / (n - 1), f);
          const dash = Math.floor(t * 8) % 2 ? 1 : 0;
          p = f > 0.85 && dash ? lerp3(a, b, t) : a;
        } else p = at(s[i], f);
        pos[i * 3] = p[0] + off[i * 3]; pos[i * 3 + 1] = p[1] + off[i * 3 + 1]; pos[i * 3 + 2] = p[2] + off[i * 3 + 2];
      }
    };
  },

  // 3d DNA 双螺旋（沿 y 轴），碱基对按拍从下往上依次亮起
  dna(N, pos, col) {
    const r = rng(304), H = 9, R = 1.15, turns = 2.6, rungs = 40;
    const role = new Uint8Array(N), s = new Float32Array(N), side = new Uint8Array(N), base = new Float32Array(N * 3);
    const strandAt = (sv, k) => {
      const a = sv * turns * Math.PI * 2 + (k ? 2.3 : 0);
      return [Math.cos(a) * R, -H / 2 + sv * H, Math.sin(a) * R];
    };
    for (let i = 0; i < N; i++) {
      const x = r();
      if (x < 0.5) { role[i] = 0; s[i] = r(); side[i] = r() < 0.5 ? 1 : 0; }
      else { role[i] = 1; s[i] = ((r() * rungs) | 0) + 0.5; side[i] = r() < 0.5 ? 1 : 0; }
      const ch = SEQ[Math.floor(s[i]) % SEQ.length];
      const c = role[i] === 0 ? lerp3(C.white, C.ice, 0.4) : BASE[side[i] ? PAIR[ch] : ch];
      const b = role[i] === 0 ? 0.045 : 0.06;
      base.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
      const t = r();
      let p;
      if (role[i] === 0) p = strandAt(s[i], side[i]);
      else {
        const sv = s[i] / rungs, a = strandAt(sv, 0), b2 = strandAt(sv, 1);
        p = side[i] ? lerp3(lerp3(a, b2, 0.5), b2, t * 0.95) : lerp3(a, lerp3(a, b2, 0.5), 0.05 + t * 0.95);
      }
      pos.set([p[0] + gauss(r) * 0.03, p[1] + gauss(r) * 0.03, p[2] + gauss(r) * 0.03], i * 3);
    }
    col.set(base);
    return function update(ctx) {
      const lit = (ctx.beat * 4) % rungs;
      for (let i = 0; i < N; i++) {
        if (role[i] !== 1) continue;
        const d = (lit - s[i] + rungs) % rungs;
        const k = 1 + 3 * Math.exp(-d * 0.6);
        col[i * 3] = base[i * 3] * k; col[i * 3 + 1] = base[i * 3 + 1] * k; col[i * 3 + 2] = base[i * 3 + 2] * k;
      }
    };
  },

  // 3e 转录与翻译：DNA 打开一个泡，mRNA 从泡里出来进到核糖体，蛋白质链一颗颗长出来
  transcribe(N, pos, col) {
    const r = rng(305);
    const strand = (sgn) => curve((t) => { const x = -6 + t * 9; const bub = Math.exp(-((x - 0.3) ** 2) / 0.9); return [x, sgn * (0.5 + bub * 0.9), 0]; }, { c: C.ice, b: 0.09 });
    const rungsP = [];
    for (let k = 0; k < 34; k++) {
      const x = -5.8 + k * 0.26;
      const bub = Math.exp(-((x - 0.3) ** 2) / 0.9);
      if (bub > 0.25) continue;
      const ch = SEQ[k % SEQ.length];
      rungsP.push(seg([x, -0.45, 0], [x, 0, 0], { c: BASE[ch], b: 0.06 }), seg([x, 0, 0], [x, 0.45, 0], { c: BASE[PAIR[ch]], b: 0.06 }));
    }
    const mrna = curve((t) => [0.3 + t * 3.0, -1.1 - Math.sin(t * Math.PI) * 0.6 - t * 0.6, 0], { c: C.amber, b: 0.12 });
    const ribo = [sphere([3.5, -1.9, 0], 0.75, { c: C.white, b: 0.05 }), sphere([3.6, -1.15, 0], 0.5, { c: C.white, b: 0.05 })];
    const labels = [text('AUG', { x: 1.2, y: -2.45, height: 0.3, c: C.amber, b: 0.1, weight: 500 }), text('Met', { x: 4.6, y: 0.2, height: 0.3, c: C.life, b: 0.1, weight: 500 })];
    const beads = [];
    for (let k = 0; k < 12; k++) beads.push(ball([3.8 + k * 0.28, -1.0 + k * 0.32 + Math.sin(k) * 0.15, 0], 0.22, { c: lerp3(C.life, C.gold, k / 12), b: 0.1, bead: k }));
    const comp = compose(N, pos, col, [strand(1), strand(-1), ...rungsP, mrna, ...ribo, ...labels, ...beads], 305);
    const beadOf = comp.list.map((p) => p.bead ?? -1);
    return function update(ctx) {
      const shown = 12 * clamp(ctx.p * 1.3);
      for (let i = 0; i < N; i++) {
        const k = beadOf[comp.role[i]];
        if (k < 0) continue;
        const o = i * 3;
        const f = clamp(shown - k);
        pos[o] = lerp(3.6, comp.base[o], f); pos[o + 1] = lerp(-1.4, comp.base[o + 1], f); pos[o + 2] = comp.base[o + 2];
      }
      void r;
    };
  },

  // 3f 细胞分裂：每拍分裂一次，1 → 2 → 4 → 8
  cells(N, pos, col) {
    const r = rng(306);
    const cell = new Uint8Array(N), role = new Uint8Array(N), dir = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      cell[i] = (r() * 8) | 0;
      role[i] = r() < 0.75 ? 0 : 1;      // 0 细胞膜 1 细胞核
      const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const rr = role[i] ? 0.35 * Math.cbrt(r()) : 1 + gauss(r) * 0.015;
      dir.set([s * Math.cos(a) * rr, u * rr, s * Math.sin(a) * rr], i * 3);
      const c = role[i] ? C.life : lerp3(C.life, C.white, 0.3);
      const b = role[i] ? 0.09 : 0.045;
      col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
    }
    // 第 g 代第 j 个细胞的位置：每代沿交替的轴分开
    const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const center = (j, g, f) => {
      const c = [0, 0, 0];
      for (let k = 0; k < g; k++) {
        const bit = (j >> (2 - k)) & 1, ax = axes[k % 3], d = (k === g - 1 ? f : 1) * 1.25 / Math.pow(1.35, k);
        c[0] += ax[0] * d * (bit ? 1 : -1); c[1] += ax[1] * d * (bit ? 1 : -1); c[2] += ax[2] * d * (bit ? 1 : -1);
      }
      return c;
    };
    const base = col.slice(), LX = -0.5, LY = 0.6, LZ = 0.62;
    return function update(ctx) {
      const b = clamp(ctx.p * 4, 0, 3.999);
      const g = Math.min(3, Math.floor(b) + 1), f = smooth(clamp((b % 1) / 0.5));
      const R = 1.5 / Math.pow(1.26, g - 1 + f);
      for (let i = 0; i < N; i++) {
        const c = center(cell[i], g, f), o = i * 3;
        // 正在分裂时细胞拉长、中间收腰
        const pinch = 1 - 0.35 * Math.sin(f * Math.PI);
        pos[o] = c[0] + dir[o] * R; pos[o + 1] = c[1] + dir[o + 1] * R * pinch; pos[o + 2] = c[2] + dir[o + 2] * R * pinch;
        if (!role[i]) {
          // 细胞膜按光照明暗：迎光面亮、边缘一圈轮廓光，像半透明的球
          const k = 0.2 + 1.3 * Math.max(0, dir[o] * LX + dir[o + 1] * LY + dir[o + 2] * LZ) + 1.1 * Math.pow(1 - Math.abs(dir[o + 2]), 3);
          col[o] = base[o] * k; col[o + 1] = base[o + 1] * k; col[o + 2] = base[o + 2] * k;
        }
      }
    };
  },

  // 3g 神经元：胞体、树突、带髓鞘的轴突，动作电位沿轴突传过去
  neuron(N, pos, col) {
    const r = rng(307);
    const soma = [-3.6, 0, 0];
    const dend = [];
    const grow = (p, a, len, depth) => {
      if (depth > 4) return;
      const q = [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len, gauss(r) * 0.2];
      dend.push(seg(p, q, { c: C.life, b: 0.06, th: 0.012 }));
      grow(q, a + 0.45 + gauss(r) * 0.2, len * 0.72, depth + 1);
      grow(q, a - 0.45 + gauss(r) * 0.2, len * 0.72, depth + 1);
    };
    for (let k = 0; k < 6; k++) grow(soma, Math.PI * 0.5 + (k / 5) * Math.PI + gauss(r) * 0.15, 0.9, 0);
    const axonF = (t) => [soma[0] + 0.5 + t * 7.4, Math.sin(t * 5) * 0.25, 0];
    const axon = curve(axonF, { c: C.white, b: 0.08, axon: true });
    const myelin = [];
    for (let k = 0; k < 9; k++) {
      const t0 = 0.08 + k * 0.1, t1 = t0 + 0.075;
      const a = axonF(t0), b = axonF(t1);
      myelin.push(curve((t) => { const p = axonF(t0 + (t1 - t0) * t); const e = Math.sin(t * Math.PI); return [p[0], p[1] + 0.18 * e + 0.02, 0]; }, { c: C.ice, b: 0.06, axon: true }));
      myelin.push(curve((t) => { const p = axonF(t0 + (t1 - t0) * t); const e = Math.sin(t * Math.PI); return [p[0], p[1] - 0.18 * e - 0.02, 0]; }, { c: C.ice, b: 0.06, axon: true }));
      void a; void b;
    }
    const term = [];
    const end = axonF(1);
    for (let k = 0; k < 5; k++) { const a = -0.8 + k * 0.4; term.push(seg(end, [end[0] + Math.cos(a) * 0.7, end[1] + Math.sin(a) * 0.7, 0], { c: C.life, b: 0.07, axon: true }), ball([end[0] + Math.cos(a) * 0.75, end[1] + Math.sin(a) * 0.75, 0], 0.1, { c: C.life, b: 0.3, axon: true })); }
    const comp = compose(N, pos, col, [sphere(soma, 0.6, { c: C.life, b: 0.05 }), ball(soma, 0.3, { c: C.white, b: 0.12 }), ...dend, axon, ...myelin, ...term], 307);
    const isAxon = comp.list.map((p) => !!p.axon);
    return function update(ctx) {
      // 每拍一个脉冲，从胞体跑到末梢
      const ph = ((ctx.beat % 1) + 1) % 1, x = soma[0] + 0.5 + ph * 8.4;
      for (let i = 0; i < N; i++) {
        if (!isAxon[comp.role[i]]) continue;
        const o = i * 3, d = pos[o] - x;
        const k = 1 + 6 * Math.exp(-(d * d) / 0.08);
        col[o] = comp.baseCol[o] * k; col[o + 1] = comp.baseCol[o + 1] * k * 1.1; col[o + 2] = comp.baseCol[o + 2] * k;
      }
    };
  },

  // 3h 眼睛：上下眼睑（带睫毛和眼褶）、巩膜、放射纹理的虹膜、角膜高光；瞳孔随拍收缩；周围是细胞镶嵌
  eye(N, pos, col) {
    const r = rng(308);
    const lidY = (x, sgn) => sgn * (sgn > 0 ? 1.95 : 1.55) * Math.pow(Math.max(0, Math.cos((x / 4.1) * (Math.PI / 2))), 1.25);
    const lid = (sgn, b, dy = 0, th = 0.015) => curve((t) => { const x = -4.1 + t * 8.2; return [x, lidY(x, sgn) + dy * Math.cos((x / 4.1) * Math.PI / 2), 0.05]; }, { c: C.warmWhite, b, th, n: 200 });
    const prims = [lid(1, 0.14, 0, 0.02), lid(-1, 0.1), lid(1, 0.05, 0.55), lid(-1, 0.03, -0.35)];
    // 睫毛：上睑一排弯弯的短线
    for (let k = 0; k < 34; k++) {
      const x = -3.2 + (k / 33) * 6.4, y = lidY(x, 1), a = Math.PI / 2 + (x / 4.1) * 0.9;
      prims.push(curve((t) => [x + Math.cos(a) * t * 0.55 - t * t * 0.12 * Math.sign(x || 1), y + Math.sin(a) * t * 0.55 - t * t * 0.08, 0.05], { c: C.warmWhite, b: 0.06, n: 12 }));
    }
    // 巩膜：眼睑之间淡淡的一层，越靠眼角越暗
    prims.push({ kind: 'area', m: 10, at(rr) { let x, y; do { x = (rr() * 2 - 1) * 4.0; y = (rr() * 2 - 1) * 1.9; } while (y > lidY(x, 1) || y < lidY(x, -1)); return [x, y, 0]; }, c: (rr, u) => C.warmWhite, b: 0.012 });
    // 虹膜：放射状纤维，内圈琥珀、外圈蓝灰，外缘一圈深色的角膜缘
    const RI = 1.45, RP = 0.5;
    prims.push({
      kind: 'area', m: Math.PI * RI * RI * 1.5,
      at(rr) { const a = Math.round(rr() * 160) / 160 * Math.PI * 2 + gauss(rr) * 0.006, s = RP + (RI - RP) * Math.sqrt(rr()); const q = [Math.cos(a) * s, Math.sin(a) * s, 0.12]; q.s = (s - RP) / (RI - RP); return q; },
      c: (rr) => lerp3(lerp3(C.amber, C.life, 0.5), lerp3(C.ice, C.deep, 0.35), Math.pow(rr(), 0.8)), b: 0.14, iris: true,
    });
    prims.push(circle([0, 0, 0.12], RI, { c: C.deep, b: 0.18, th: 0.03 }), circle([0, 0, 0.12], RP, { c: C.white, b: 0.06, pupil: true }));
    // 角膜高光：左上一大一小两个亮点
    prims.push(disc([-0.48, 0.5, 0.2], 0.2, { c: C.white, b: 0.5 }), disc([0.42, -0.42, 0.2], 0.07, { c: C.white, b: 0.5 }));
    // 周围的细胞镶嵌
    for (let k = 0; k < 140; k++) {
      let x, y;
      do { x = (r() * 2 - 1) * 6.8; y = (r() * 2 - 1) * 3.8; } while (Math.abs(x) < 4.6 && Math.abs(y) < 2.9);
      prims.push(circle([x, y], 0.16 + r() * 0.12, { c: C.life, b: 0.025, n: 24 }));
    }
    const comp = compose(N, pos, col, prims, 308);
    const L = comp.list;
    return function update(ctx) {
      // 瞳孔每拍收缩一下再放开
      const k = 1 - 0.28 * Math.exp(-(ctx.beat % 1) * 5);
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]];
        if (!q.iris && !q.pupil) continue;
        const o = i * 3, x = comp.base[o], y = comp.base[o + 1], s = Math.hypot(x, y);
        if (q.pupil) { pos[o] = x * k; pos[o + 1] = y * k; continue; }
        const t = (s - RP) / (RI - RP), s2 = RP * k + (RI - RP * k) * t;
        pos[o] = (x / s) * s2; pos[o + 1] = (y / s) * s2;
      }
    };
  },
};
