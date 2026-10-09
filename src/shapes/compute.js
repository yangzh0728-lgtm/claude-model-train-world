// 第 4 章 计算：算盘、差分机、打孔卡、真值表、图灵机、真空管、半加器、生命游戏、芯片、摩尔定律、晶圆
import { rng, gauss, clamp, lerp, easeOut, smooth } from '../util.js';
import { C } from '../palette.js';
import { compose, seg, poly, curve, circle, rect, rectFill, disc, ball, sphere, text, arrow } from './kit.js';

// 卡拍的步进：每拍开头 0.3 拍内跳到下一格
const tick = (beat) => Math.floor(beat) + easeOut((beat % 1) / 0.3);
const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const scaleCol = (comp, col, i, k) => { const o = i * 3; col[o] = comp.baseCol[o] * k; col[o + 1] = comp.baseCol[o + 1] * k; col[o + 2] = comp.baseCol[o + 2] * k; };

// 椭圆珠子（面）
const bead = (o) => ({
  kind: 'area', m: Math.PI * 0.36 * 0.2,
  at(r) { const a = r() * Math.PI * 2, s = Math.sqrt(r()); return [Math.cos(a) * 0.36 * s, Math.sin(a) * 0.19 * s, gauss(r) * 0.03]; },
  ...o,
});

export default {
  // 4a 算盘：每拍拨一次珠，显示一个在增长的数
  abacus(N, pos, col) {
    const rods = 9, X = (k) => -4 + k;
    const prims = [rect(-4.7, -2.5, 4.7, 2.5, { c: C.amber, b: 0.12, th: 0.02 }), seg([-4.7, 1.0], [4.7, 1.0], { c: C.amber, b: 0.12, th: 0.02 })];
    for (let k = 0; k < rods; k++) prims.push(seg([X(k), -2.5], [X(k), 2.5], { c: C.white, b: 0.05 }));
    for (let k = 0; k < rods; k++) {
      prims.push(bead({ c: C.term, b: 0.16, rod: k, heaven: true }));
      for (let j = 0; j < 4; j++) prims.push(bead({ c: C.term, b: 0.12, rod: k, earth: j }));
    }
    const comp = compose(N, pos, col, prims, 401);
    const L = comp.list;
    const digitsAt = (n) => { const v = 1000 + n * 137; return Array.from({ length: rods }, (_, k) => Math.floor(v / 10 ** (rods - 1 - k)) % 10); };
    const beadY = (p, d) => {
      if (p.heaven) return d >= 5 ? 1.35 : 2.05;
      const m = d % 5;
      return p.earth < m ? 0.65 - p.earth * 0.42 : -2.15 + (3 - p.earth) * 0.42;
    };
    return function update(ctx) {
      const n = Math.floor(ctx.beat), f = easeOut((ctx.beat % 1) / 0.25);
      const a = digitsAt(n - 1), b = digitsAt(n);
      for (let i = 0; i < N; i++) {
        const p = L[comp.role[i]];
        if (p.rod === undefined) continue;
        const o = i * 3, y = lerp(beadY(p, a[p.rod]), beadY(p, b[p.rod]), f);
        pos[o] = comp.base[o] + X(p.rod); pos[o + 1] = comp.base[o + 1] + y; pos[o + 2] = comp.base[o + 2];
      }
    };
  },

  // 4b 差分机：三列齿轮，每拍咬合转一齿
  gears(N, pos, col) {
    const G = [];
    const gear = (cx, cy, R, teeth, dir, o = {}) => {
      G.push({ cx, cy, teeth, dir });
      const id = G.length - 1;
      const prof = (t) => { const a = t * Math.PI * 2, s = Math.sin(a * teeth); const r = R + 0.13 * Math.tanh(s * 4); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]; };
      return [curve(prof, { n: teeth * 24, c: C.ice, b: 0.12, gear: id, ...o }), circle([cx, cy], R * 0.45, { c: C.ice, b: 0.06, gear: id }), disc([cx, cy], 0.09, { c: C.white, b: 0.2, gear: id }),
        ...[0, 1, 2, 3, 4, 5].map((k) => { const a = (k * Math.PI) / 3; return seg([cx + Math.cos(a) * 0.12, cy + Math.sin(a) * 0.12], [cx + Math.cos(a) * R * 0.43, cy + Math.sin(a) * R * 0.43], { c: C.ice, b: 0.05, gear: id }); })];
    };
    const prims = [];
    const cols = [-3, 0, 3];
    cols.forEach((x, ci) => {
      for (let j = 0; j < 3; j++) prims.push(gear(x, -1.9 + j * 1.9, 0.78, 12, (ci + j) % 2 ? 1 : -1));
      prims.push(seg([x, -2.9], [x, 2.9], { c: C.white, b: 0.04 }));
      prims.push(text(['Δ²', 'Δ¹', 'y'][ci], { x, y: 3.1, height: 0.42, align: 'center', c: C.white, b: 0.1, weight: 500 }));
    });
    // 列与列之间的小传动齿轮
    prims.push(gear(-1.5, 0, 0.5, 8, 1), gear(1.5, 0, 0.5, 8, -1));
    prims.push(rect(-4.2, -3.1, 4.2, 2.8, { c: C.white, b: 0.04 }));
    const comp = compose(N, pos, col, prims, 402);
    const L = comp.list;
    return function update(ctx) {
      const step = tick(ctx.beat);
      for (let i = 0; i < N; i++) {
        const p = L[comp.role[i]];
        if (p.gear === undefined) continue;
        const g = G[p.gear], a = g.dir * step * ((Math.PI * 2) / g.teeth), c = Math.cos(a), s = Math.sin(a);
        const o = i * 3, dx = comp.base[o] - g.cx, dy = comp.base[o + 1] - g.cy;
        pos[o] = g.cx + dx * c - dy * s; pos[o + 1] = g.cy + dx * s + dy * c;
      }
    };
  },

  // 4c 提花机打孔卡：一叠卡，每拍最前面一张翻走
  punchcards(N, pos, col) {
    const r = rng(403), K = 6, W = 3.6, H = 1.6;
    const prims = [];
    for (let k = 0; k < K; k++) {
      prims.push(rect(-W, -H, W, H, { c: C.amber, b: 0.1, card: k, th: 0.012 }));
      prims.push(rectFill(-W, -H, W, H, { c: C.amber, b: 0.012, card: k }));
      for (let x = 0; x < 24; x++) for (let y = 0; y < 8; y++) {
        if (r() < 0.32) {
          const cx = -W + 0.45 + x * 0.29, cy = -H + 0.3 + y * 0.37;
          prims.push(rect(cx - 0.07, cy - 0.11, cx + 0.07, cy + 0.11, { c: C.warmWhite, b: 0.12, card: k, w: 0.6 }));
        }
      }
    }
    const comp = compose(N, pos, col, prims, 403);
    const L = comp.list;
    return function update(ctx) {
      const n = Math.floor(ctx.beat), f = easeOut((ctx.beat % 1) / 0.45);
      for (let i = 0; i < N; i++) {
        const k = L[comp.role[i]].card, o = i * 3;
        const slot = (((k - n) % K) + K) % K;
        let x = comp.base[o], y = comp.base[o + 1], z = comp.base[o + 2] - slot * 0.55;
        if (slot === 0) {
          // 绕上边翻起来，飞出画面
          const a = f * Math.PI * 0.9, dy = y - H;
          y = H + dy * Math.cos(a); z = z + dy * Math.sin(a) + f * 1.5;
          y += f * 1.2;
        }
        pos[o] = x + slot * 0.08; pos[o + 1] = y + slot * 0.12; pos[o + 2] = z;
        scaleCol(comp, col, i, slot === 0 ? 1.3 : 1 - slot * 0.13);
      }
    };
  },

  // 4d 布尔真值表：每拍点亮一行
  truth(N, pos, col) {
    const heads = ['x', 'y', 'x ∧ y', 'x ∨ y', 'x ⊕ y'], xs = [-3.6, -2.2, -0.4, 1.6, 3.6];
    const rows = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const ink = { c: C.white, b: 0.12, family: '"EB Garamond"', weight: 600 };
    const prims = heads.map((h, k) => text(h, { x: xs[k], y: 1.75, height: 0.5, align: 'center', ...ink }));
    prims.push(seg([-4.5, 1.5], [4.5, 1.5], { c: C.white, b: 0.1 }), seg([-1.5, 2.4], [-1.5, -2.6], { c: C.white, b: 0.1 }), seg([-4.5, 2.4], [4.5, 2.4], { c: C.white, b: 0.06 }), seg([-4.5, -2.6], [4.5, -2.6], { c: C.white, b: 0.06 }));
    rows.forEach(([x, y], j) => {
      const v = [x, y, x & y, x | y, x ^ y];
      v.forEach((b, k) => prims.push(text(String(b), { x: xs[k], y: 0.65 - j * 0.95, height: 0.5, align: 'center', c: k > 1 && b ? C.amber : C.white, b: 0.2, row: j, family: '"EB Garamond"', weight: 600 })));
    });
    const comp = compose(N, pos, col, prims, 404);
    const L = comp.list;
    return function update(ctx) {
      const lit = clamp(ctx.p * 4 + 0.6, 0, 4);
      for (let i = 0; i < N; i++) {
        const row = L[comp.role[i]].row;
        if (row === undefined) continue;
        scaleCol(comp, col, i, row < Math.floor(lit) ? 1 : 0.12);
      }
    };
  },

  // 4e 图灵机：纸带每拍左移一格，读写头下的格子闪亮
  turing(N, pos, col) {
    const r = rng(405), cw = 0.62, n = 30, span = n * cw;
    const prims = [];
    for (let k = 0; k < n; k++) {
      const x = -span / 2 + k * cw;
      const ch = r() < 0.15 ? '␣' : r() < 0.5 ? '0' : '1';
      prims.push(rect(x + 0.03, -0.38, x + cw - 0.03, 0.38, { c: C.term, b: 0.08, cell: k }));
      prims.push(text(ch, { x: x + cw / 2, y: -0.17, height: 0.36, align: 'center', c: C.white, b: 0.1, cell: k, weight: 500 }));
    }
    // 读写头和状态框
    const head = [poly([[-0.25, 1.15], [0.25, 1.15], [0, 0.55]], { closed: true, c: C.amber, b: 0.18 }), rect(-0.55, 1.3, 0.55, 2.0, { c: C.amber, b: 0.12 }), text('q₁', { x: 0, y: 1.42, height: 0.42, align: 'center', c: C.amber, b: 0.14, weight: 500 })];
    prims.push(...head.map((h) => ({ ...h, head: true })));
    // 下方的状态图：三个状态圈
    [[-1.6, -1.9, 'q₀'], [0, -1.9, 'q₁'], [1.6, -1.9, 'q₂']].forEach(([x, y, s], k) => {
      prims.push(circle([x, y], 0.42, { c: C.term, b: 0.08, st: k }), text(s, { x, y: y - 0.15, height: 0.32, align: 'center', c: C.term, b: 0.1, st: k, weight: 500 }));
    });
    prims.push(...arrow([-1.12, -1.9], [-0.47, -1.9], { c: C.term, b: 0.06, head: 0.14 }), ...arrow([0.48, -1.9], [1.13, -1.9], { c: C.term, b: 0.06, head: 0.14 }));
    const comp = compose(N, pos, col, prims, 405);
    const L = comp.list;
    return function update(ctx) {
      const shift = tick(ctx.beat) * cw, st = Math.floor(ctx.beat) % 3;
      const bounce = Math.exp(-(ctx.beat % 1) * 8) * 0.25;
      for (let i = 0; i < N; i++) {
        const p = L[comp.role[i]], o = i * 3;
        if (p.cell !== undefined) {
          let x = comp.base[o] - shift;
          x = ((((x + span / 2) % span) + span) % span) - span / 2;
          pos[o] = x;
          const near = Math.abs(x) < cw * 0.55 ? 2.4 : 1;
          scaleCol(comp, col, i, near * (1 - Math.min(0.8, Math.abs(x) / (span / 2))));
        } else if (p.head) {
          pos[o + 1] = comp.base[o + 1] - bounce;
        } else if (p.st !== undefined) {
          scaleCol(comp, col, i, p.st === st ? 2.5 : 0.7);
        }
      }
    };
  },

  // 4f 真空管阵列 + ENIAC 指示灯面板
  tubes(N, pos, col) {
    const prims = [];
    const tube = (cx, cy, k) => {
      const w = 0.32, h = 0.85;
      prims.push(poly([[cx - w, cy - h], [cx - w, cy + h - w], ...Array.from({ length: 13 }, (_, i) => { const a = Math.PI - (i / 12) * Math.PI; return [cx + Math.cos(a) * w, cy + h - w + Math.sin(a) * w]; }), [cx + w, cy - h]], { c: C.white, b: 0.06, tube: k }));
      prims.push(rect(cx - w - 0.05, cy - h - 0.25, cx + w + 0.05, cy - h, { c: C.white, b: 0.05 }));
      prims.push(seg([cx, cy - h + 0.1], [cx, cy + 0.35], { c: C.amber, b: 0.16, tube: k, fil: true }), ball([cx, cy + 0.1, 0], 0.32, { c: C.amber, b: 0.05, tube: k, fil: true }));
      for (let j = -1; j <= 1; j++) prims.push(seg([cx + j * 0.15, cy - h - 0.25], [cx + j * 0.15, cy - h - 0.45], { c: C.white, b: 0.04 }));
    };
    let k = 0;
    for (let x = 0; x < 9; x++) for (let y = 0; y < 2; y++) tube(-4.8 + x * 1.2, 0.95 + y * 2.3 - 0.4, k++);
    // 指示灯面板
    prims.push(rect(-5.4, -3.4, 5.4, -0.9, { c: C.term, b: 0.06 }));
    let l = 0;
    for (let x = 0; x < 24; x++) for (let y = 0; y < 5; y++) prims.push(disc([-5 + x * 0.435, -1.3 - y * 0.45], 0.08, { c: x % 6 === 5 ? C.red : C.term, b: 0.4, lamp: l++ }));
    const comp = compose(N, pos, col, prims, 406);
    const L = comp.list;
    return function update(ctx) {
      const n = Math.floor(ctx.beat * 2);
      for (let i = 0; i < N; i++) {
        const p = L[comp.role[i]];
        if (p.lamp !== undefined) scaleCol(comp, col, i, hash(p.lamp, n) < 0.45 ? 1 : 0.08);
        else if (p.fil) scaleCol(comp, col, i, 0.75 + 0.25 * Math.sin(ctx.t * 23 + p.tube * 1.7) + (hash(p.tube, Math.floor(ctx.beat)) < 0.15 ? 1 : 0));
      }
    };
  },

  // 4g 半加器：XOR 出和，AND 出进位；输入每拍走一遍 00 01 10 11
  adder(N, pos, col) {
    const prims = [];
    const W = (pts, sig) => prims.push(poly(pts, { c: C.white, b: 0.1, sig }));
    W([[-3.4, 1.5], [0.62, 1.5]], 'A'); W([[-1.8, 1.5], [-1.8, -0.7], [0.4, -0.7]], 'A');
    W([[-3.4, 0.9], [0.62, 0.9]], 'B'); W([[-1.0, 0.9], [-1.0, -1.3], [0.4, -1.3]], 'B');
    W([[1.95, 1.2], [3.6, 1.2]], 'S'); W([[1.6, -1.0], [3.6, -1.0]], 'C');
    prims.push(disc([-1.8, 1.5], 0.07, { c: C.white, b: 0.4 }), disc([-1.0, 0.9], 0.07, { c: C.white, b: 0.4 }));
    // AND 门
    prims.push(poly([[1.0, -0.4], [0.4, -0.4], [0.4, -1.6], [1.0, -1.6]], { c: C.ice, b: 0.14 }), circle([1.0, -1.0], 0.6, { a0: -Math.PI / 2, a1: Math.PI / 2, c: C.ice, b: 0.14, n: 60 }));
    // XOR 门：OR 形 + 后面多一道弧
    const back = (dx) => curve((t) => [0.4 + dx + Math.sin(t * Math.PI) * 0.22, 0.55 + t * 1.3, 0], { c: C.ice, b: 0.14, n: 40 });
    prims.push(back(0), back(-0.18));
    prims.push(curve((t) => [0.4 + t * 1.55, 1.85 - Math.pow(t, 2) * 0.65, 0], { c: C.ice, b: 0.14, n: 40 }), curve((t) => [0.4 + t * 1.55, 0.55 + Math.pow(t, 2) * 0.65, 0], { c: C.ice, b: 0.14, n: 40 }));
    const lab = (s, x, y, o = {}) => prims.push(text(s, { x, y, height: 0.4, c: C.white, b: 0.12, weight: 500, ...o }));
    lab('A', -4.0, 1.35); lab('B', -4.0, 0.75); lab('S', 3.8, 1.05, { sig: 'S' }); lab('C', 3.8, -1.15, { sig: 'C' });
    lab('XOR', 0.75, 2.05, { height: 0.26 }); lab('AND', 0.55, -2.05, { height: 0.26 });
    const comp = compose(N, pos, col, prims, 407);
    const L = comp.list;
    return function update(ctx) {
      const n = ((Math.floor(ctx.beat) % 4) + 4) % 4, A = n >> 1, B = n & 1;
      const v = { A, B, S: A ^ B, C: A & B };
      const ph = ctx.beat % 1;
      for (let i = 0; i < N; i++) {
        const s = L[comp.role[i]].sig;
        if (!s) continue;
        const on = v[s];
        // 为 1 的线上有一个亮点从左往右跑
        const run = on ? 1 + 3 * Math.exp(-((comp.u[i] - ph) ** 2) / 0.004) : 0;
        scaleCol(comp, col, i, on ? 1.4 + run : 0.25);
      }
    };
  },

  // 4h 康威生命游戏：高斯帕滑翔机枪
  life(N, pos, col) {
    const GW = 76, GH = 42, cell = 0.17, D = 9000 * (N / 262144);
    const gun = [[24, 0], [22, 1], [24, 1], [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2], [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3], [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4], [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5], [10, 6], [16, 6], [24, 6], [11, 7], [15, 7], [12, 8], [13, 8]];
    const gens = [];
    let g = new Uint8Array(GW * GH);
    for (const [x, y] of gun) g[(y + 2) * GW + x + 2] = 1;
    for (let k = 0; k < 160; k++) {
      gens.push(g);
      const h = new Uint8Array(GW * GH);
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < GW && yy < GH) s += g[yy * GW + xx];
        }
        h[y * GW + x] = s === 3 || (s === 2 && g[y * GW + x]) ? 1 : 0;
      }
      g = h;
    }
    // 15% 的粒子铺成暗格点当棋盘，其余的每帧分给活着的细胞
    const r = rng(408);
    const jx = new Float32Array(N), jy = new Float32Array(N), bg = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      jx[i] = (r() - 0.5) * cell * 0.8; jy[i] = (r() - 0.5) * cell * 0.8; bg[i] = r() < 0.15 ? 1 : 0;
      if (bg[i]) {
        const c = (r() * GW * GH) | 0, x = c % GW, y = (c / GW) | 0;
        pos.set([(x - GW / 2 + 0.5) * cell + jx[i] * 0.15, -(y - GH / 2 + 0.5) * cell + jy[i] * 0.15, 0], i * 3);
        col.set([C.ice[0] * 0.01, C.ice[1] * 0.01, C.ice[2] * 0.01], i * 3);
      }
    }
    const alive = new Uint32Array(GW * GH);
    return function update(ctx) {
      const gen = gens[Math.min(gens.length - 1, Math.floor(clamp(ctx.p) * 96))];
      let A = 0;
      for (let c = 0; c < gen.length; c++) if (gen[c]) alive[A++] = c;
      const per = (N * 0.85) / Math.max(1, A);
      const k = Math.min(0.08, (0.35 * D * cell * cell) / per);
      for (let i = 0; i < N; i++) {
        if (bg[i]) continue;
        const c = alive[i % Math.max(1, A)], o = i * 3, x = c % GW, y = (c / GW) | 0;
        pos[o] = (x - GW / 2 + 0.5) * cell + jx[i]; pos[o + 1] = -(y - GH / 2 + 0.5) * cell + jy[i]; pos[o + 2] = 0;
        const t = A ? C.term : [0, 0, 0];
        col[o] = t[0] * k; col[o + 1] = t[1] * k; col[o + 2] = t[2] * k;
      }
    };
  },

  // 4i 芯片平面布局：核心、缓存、焊盘，走线按进度亮起
  chip(N, pos, col) {
    const r = rng(409), prims = [];
    prims.push(rect(-3.2, -3.2, 3.2, 3.2, { c: C.white, b: 0.12, th: 0.015 }));
    for (let k = 0; k < 20; k++) for (const side of [0, 1, 2, 3]) {
      const t = -2.85 + k * 0.3, p = side < 2 ? [t, side ? 3.0 : -3.0] : [side === 2 ? -3.0 : 3.0, t];
      prims.push(rectFill(p[0] - 0.08, p[1] - 0.08, p[0] + 0.08, p[1] + 0.08, { c: C.amber, b: 0.08 }));
    }
    const blocks = [[-2.6, 0.2, -0.2, 2.6], [0.2, 0.2, 2.6, 2.6], [-2.6, -2.6, -0.2, -0.2], [0.2, -2.6, 2.6, -1.4], [0.2, -1.1, 2.6, -0.2]];
    blocks.forEach(([x0, y0, x1, y1], k) => {
      prims.push(rect(x0, y0, x1, y1, { c: k < 3 ? C.ice : C.term, b: 0.1 }));
      if (k < 3) {
        // 核心：内部的格子
        for (let j = 1; j < 6; j++) prims.push(seg([x0, y0 + ((y1 - y0) * j) / 6], [x1, y0 + ((y1 - y0) * j) / 6], { c: C.ice, b: 0.025 }), seg([x0 + ((x1 - x0) * j) / 6, y0], [x0 + ((x1 - x0) * j) / 6, y1], { c: C.ice, b: 0.025 }));
        prims.push(rectFill(x0 + 0.3, y0 + 0.3, x0 + 1.0, y0 + 1.0, { c: C.ice, b: 0.03 }));
      } else {
        // 缓存：密排的横线
        for (let j = 1; j < 10; j++) prims.push(seg([x0 + 0.05, y0 + ((y1 - y0) * j) / 10], [x1 - 0.05, y0 + ((y1 - y0) * j) / 10], { c: C.term, b: 0.025 }));
      }
    });
    // 曼哈顿走线
    for (let k = 0; k < 40; k++) {
      let x = (r() * 2 - 1) * 2.9, y = (r() * 2 - 1) * 2.9;
      const pts = [[x, y]];
      for (let j = 0; j < 5; j++) {
        if (j % 2) y = clamp(y + (r() * 2 - 1) * 2, -2.95, 2.95); else x = clamp(x + (r() * 2 - 1) * 2, -2.95, 2.95);
        pts.push([x, y]);
      }
      prims.push(poly(pts, { c: C.amber, b: 0.13, route: k, w: 0.8, z: 0.02 }));
    }
    const comp = compose(N, pos, col, prims, 409);
    const L = comp.list;
    return function update(ctx) {
      for (let i = 0; i < N; i++) {
        const p = L[comp.role[i]];
        if (p.route === undefined) continue;
        const head = clamp(ctx.p, 0, 1) * 2.4 - (p.route % 10) * 0.12;
        const d = head - comp.u[i];
        scaleCol(comp, col, i, d < 0 ? 0 : 0.6 + 4 * Math.exp(-d * 30));
      }
    };
  },

  // 4j 摩尔定律：对数坐标，点一年年冒出来，拟合线向上冲
  moore(N, pos, col) {
    const prims = [];
    const X = (yr) => -4 + ((yr - 1970) / 52) * 8, Y = (lg) => -2.6 + ((lg - 3) / 8) * 5.2;
    prims.push(...arrow([-4.2, -2.6], [4.4, -2.6], { c: C.white, b: 0.1 }), ...arrow([-4, -2.8], [-4, 2.9], { c: C.white, b: 0.1 }));
    for (let lg = 3; lg <= 11; lg++) {
      prims.push(seg([-4, Y(lg)], [4.2, Y(lg)], { c: C.white, b: 0.015 }));
      if (lg % 2 === 1) prims.push(text(`10^{${lg}}`, { x: -4.2, y: Y(lg) - 0.1, height: 0.24, align: 'right', c: C.white, b: 0.08, weight: 500 }));
    }
    for (const yr of [1971, 1990, 2010, 2021]) prims.push(text(String(yr), { x: X(yr), y: -3.0, height: 0.22, align: 'center', c: C.white, b: 0.08, weight: 500 }));
    const r = rng(410);
    const chips = [[1971, 3.36], [1974, 3.65], [1978, 4.46], [1982, 5.13], [1985, 5.44], [1989, 6.08], [1993, 6.49], [1997, 6.88], [2000, 7.6], [2003, 8.0], [2006, 8.46], [2008, 8.88], [2010, 9.36], [2012, 9.7], [2014, 9.85], [2016, 10.0], [2017, 10.3], [2019, 10.6], [2021, 10.75]];
    for (let k = 0; k < 40; k++) {
      const [yr, lg] = chips[k % chips.length];
      const y2 = yr + (k >= chips.length ? r() * 2 - 1 : 0), l2 = lg + (k >= chips.length ? gauss(r) * 0.2 : 0);
      prims.push(disc([X(y2), Y(l2)], 0.07, { c: C.term, b: 0.4, xr: X(y2) }));
    }
    prims.push(curve((t) => { const yr = 1970 + t * 52; return [X(yr), Y(3.2 + (yr - 1970) * 0.1505), 0]; }, { c: C.amber, b: 0.16, n: 100, line: true, w: 1.5 }));
    const comp = compose(N, pos, col, prims, 410);
    const L = comp.list;
    return function update(ctx) {
      const reveal = lerp(-4.2, 4.3, smooth(clamp(ctx.p * 1.15)));
      for (let i = 0; i < N; i++) {
        const p = L[comp.role[i]];
        if (p.xr === undefined && !p.line) continue;
        const x = comp.base[i * 3];
        if (p.line) scaleCol(comp, col, i, x > reveal ? 0 : 1 + 4 * Math.exp(-(reveal - x) * 6));
        else scaleCol(comp, col, i, p.xr > reveal ? 0 : 1 + 3 * Math.exp(-(reveal - p.xr) * 3));
      }
    };
  },

  // 4k 晶圆：一圈芯片，中间一块是上一镜的芯片
  wafer(N, pos, col) {
    const prims = [circle([0, 0], 4, { c: C.white, b: 0.12, n: 240, a0: -1.35, a1: Math.PI * 2 - 1.79 }), seg([Math.cos(-1.35) * 4, Math.sin(-1.35) * 4], [Math.cos(-1.79) * 4, Math.sin(-1.79) * 4], { c: C.white, b: 0.12 })];
    const d = 0.42;
    for (let x = -10; x <= 9; x++) for (let y = -10; y <= 9; y++) {
      const x0 = x * d, y0 = y * d;
      if (Math.hypot(x0 + d / 2, y0 + d / 2) > 3.75) continue;
      const hero = x === 0 && y === 0;
      prims.push(rect(x0 + 0.02, y0 + 0.02, x0 + d - 0.02, y0 + d - 0.02, { c: hero ? C.amber : C.term, b: hero ? 0.2 : 0.035 }));
    }
    prims.push(rectFill(0.06, 0.06, d - 0.06, d - 0.06, { c: C.amber, b: 0.1 }));
    prims.push(text('0b01001000 01101001', { x: 0, y: -5.0, height: 0.42, align: 'center', c: C.term, b: 0.12, weight: 500 }));
    compose(N, pos, col, prims, 411);
  },
};
