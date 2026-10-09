// 第 8 章 大模型：词向量、注意力、多头、位置编码、Transformer 塔、词元瀑布、缩放定律、潜空间、扩散、公式环
import { rng, gauss, clamp, lerp, lerp3, easeOut, smooth } from '../util.js';
import { C } from '../palette.js';
import { compose, seg, poly, curve, circle, rect, rectFill, disc, ball, sphere, text, arrow } from './kit.js';

const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const scaleCol = (comp, col, i, k) => { const o = i * 3; col[o] = comp.baseCol[o] * k; col[o + 1] = comp.baseCol[o + 1] * k; col[o + 2] = comp.baseCol[o + 2] * k; };
const G = C.gold;
const TOKENS = ['the', 'cat', 'sat', 'on', 'the', 'mat', 'because', 'it', 'was', 'warm'];

// 注意力权重：每行一个 softmax，带一点“语义”结构（it → cat）
function attn(n, seed, sharp = 3) {
  const W = [];
  for (let q = 0; q < n; q++) {
    const row = [];
    for (let k = 0; k < n; k++) {
      let s = (k <= q ? 0 : -9) + hash(q * 31 + k, seed) * sharp - Math.abs(q - k) * 0.25;
      if (seed === 1 && q === 7 && k === 1) s += 6;
      if (k === q) s += 1.2;
      row.push(Math.exp(s));
    }
    const t = row.reduce((a, b) => a + b, 0);
    W.push(row.map((v) => v / t));
  }
  return W;
}

export default {
  // 8b 词向量（纸面插图）：king − man + woman ≈ queen
  embedding(N, pos, col) {
    const P = { man: [-2.4, -1.4], woman: [-0.4, -0.1], king: [0.6, -1.9], queen: [2.6, -0.6] };
    const prims = [...arrow([-3.6, -2.8], [3.8, -2.8], { c: C.white, b: 0.1 }), ...arrow([-3.6, -2.8], [-3.6, 2.6], { c: C.white, b: 0.1 })];
    const r = rng(802);
    const words = ['apple', 'river', 'prince', 'girl', 'boy', 'aunt', 'uncle', 'paris', 'rome', 'run', 'ran', 'blue', 'seven', 'cold'];
    words.forEach((w) => { const x = (r() * 2 - 1) * 3.2, y = 0.6 + r() * 1.8; prims.push(disc([x, y], 0.05, { c: C.white, b: 0.2 }), text(w, { x: x + 0.12, y: y - 0.06, height: 0.18, c: C.white, b: 0.06, family: '"EB Garamond"', weight: 400 })); });
    Object.entries(P).forEach(([w, p]) => prims.push(disc(p, 0.09, { c: G, b: 0.4 }), text(w, { x: p[0] + 0.18, y: p[1] - 0.1, height: 0.34, c: C.white, b: 0.14, family: '"EB Garamond"', weight: 600 })));
    prims.push(...arrow(P.man, P.woman, { c: C.red, b: 0.16, step: 0, head: 0.2 }), ...arrow(P.king, P.queen, { c: C.red, b: 0.16, step: 1, head: 0.2 }));
    prims.push(...arrow(P.man, P.king, { c: C.ice, b: 0.16, step: 2, head: 0.2 }), ...arrow(P.woman, P.queen, { c: C.ice, b: 0.16, step: 3, head: 0.2 }));
    const comp = compose(N, pos, col, prims, 802);
    const L = comp.list;
    return function update(ctx) {
      const prog = ctx.p * 8 - 0.5;   // 两小节 8 拍，每两拍画一支箭
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]];
        if (q.step === undefined) continue;
        scaleCol(comp, col, i, prog > q.step * 2 ? 1 : 0);
      }
    };
  },

  // 8c 注意力热图：10 个词元，查询行逐拍扫过
  attention(N, pos, col) {
    const n = TOKENS.length, S = 0.48, W = attn(n, 1);
    const x0 = -n * S / 2 + 0.6, y0 = 2.0;
    const prims = [];
    TOKENS.forEach((t, k) => {
      prims.push(text(t, { x: x0 + k * S + S / 2, y: y0 + 0.2, height: 0.22, align: 'center', c: C.white, b: 0.25, weight: 500, key: k }));
      prims.push(text(t, { x: x0 - 0.15, y: y0 - k * S - S * 0.65, height: 0.22, align: 'right', c: C.white, b: 0.25, weight: 500, qrow: k }));
    });
    for (let q = 0; q < n; q++) for (let k = 0; k < n; k++) {
      const w = W[q][k];
      if (w > 0.004) prims.push(rectFill(x0 + k * S + 0.03, y0 - (q + 1) * S + 0.03, x0 + (k + 1) * S - 0.03, y0 - q * S - 0.03, { c: lerp3(C.magenta, G, w), b: 0.02 + 0.3 * Math.sqrt(w), q, w: 0.3 + w }));
      prims.push(rect(x0 + k * S, y0 - (q + 1) * S, x0 + (k + 1) * S, y0 - q * S, { c: C.white, b: 0.015, w: 0.15 }));
    }
    const comp = compose(N, pos, col, prims, 803);
    const L = comp.list;
    return function update(ctx) {
      const row = Math.floor(clamp(ctx.p, 0, 0.999) * 8 * 1.25) % n;
      for (let i = 0; i < N; i++) {
        const t = L[comp.role[i]];
        if (t.q !== undefined) scaleCol(comp, col, i, t.q === row ? 2.2 : t.q < row ? 0.8 : 0.25);
        else if (t.qrow !== undefined) scaleCol(comp, col, i, t.qrow === row ? 2 : 0.6);
      }
    };
  },

  // 8d 12 个注意力头：4 × 3 的小热图
  heads(N, pos, col) {
    const n = 8, S = 0.2, prims = [];
    for (let h = 0; h < 12; h++) {
      const W = attn(n, h + 10, 2 + (h % 4) * 1.5);
      const cx = -4.2 + (h % 4) * 2.8, cy = 2.2 - Math.floor(h / 4) * 2.3;
      prims.push(rect(cx - 0.05, cy - n * S - 0.05, cx + n * S + 0.05, cy + 0.05, { c: G, b: 0.06, head: h }));
      prims.push(text(`head ${h + 1}`, { x: cx + n * S / 2, y: cy + 0.15, height: 0.16, align: 'center', c: C.white, b: 0.1, weight: 500 }));
      for (let q = 0; q < n; q++) for (let k = 0; k <= q; k++) {
        const w = W[q][k];
        prims.push(rectFill(cx + k * S + 0.015, cy - (q + 1) * S + 0.015, cx + (k + 1) * S - 0.015, cy - q * S - 0.015, { c: lerp3(C.magenta, G, w), b: 0.02 + 0.3 * Math.sqrt(w), head: h, w: 0.2 + w }));
      }
    }
    const comp = compose(N, pos, col, prims, 804);
    const L = comp.list;
    return function update(ctx) {
      const n2 = Math.floor(ctx.beat * 2);
      for (let i = 0; i < N; i++) {
        const h = L[comp.role[i]].head;
        if (h === undefined) continue;
        scaleCol(comp, col, i, hash(h, n2) < 0.35 ? 2 : 0.7);
      }
    };
  },

  // 8e 位置编码（工程图纸）：不同频率的正弦叠成条纹
  posenc(N, pos, col) {
    const prims = [];
    const rows = 8;
    for (let k = 0; k < rows; k++) {
      const y = 1.9 - k * 0.55, w = Math.pow(1.7, k);
      prims.push(curve((t) => [-4.4 + t * 8.8, y + 0.2 * Math.sin((t * 8.8 * 2.2) / w * (k % 2 ? 1 : 1)) * (k % 2 ? 1 : 1), 0], { c: k % 2 ? C.ice : G, b: 0.14, n: 400, wave: k }));
      prims.push(seg([-4.4, y], [4.4, y], { c: C.white, b: 0.02 }));
      prims.push(text(k % 2 ? `cos  i = ${k}` : `sin  i = ${k}`, { x: -4.6, y: y - 0.08, height: 0.17, align: 'right', c: C.white, b: 0.1, weight: 500 }));
    }
    prims.push(rect(-4.4, -2.3, 4.4, 2.25, { c: C.white, b: 0.06 }));
    for (let p = 0; p <= 16; p++) prims.push(seg([-4.4 + p * 0.55, -2.3], [-4.4 + p * 0.55, -2.45], { c: C.white, b: 0.08 }));
    prims.push(text('position →', { x: 4.4, y: -2.8, height: 0.2, align: 'right', c: C.white, b: 0.1, weight: 500 }));
    prims.push(seg([0, -2.3], [0, 2.25], { c: C.red, b: 0.12, cursor: true, w: 1.5 }));
    const comp = compose(N, pos, col, prims, 805);
    const L = comp.list;
    return function update(ctx) {
      // 竖线游标每拍跳一个位置
      const x = -4.4 + ((Math.floor(ctx.beat) % 16) + easeOut((ctx.beat % 1) / 0.25)) * 0.55;
      for (let i = 0; i < N; i++) if (L[comp.role[i]].cursor) pos[i * 3] = x;
    };
  },

  // 8f Transformer 塔：12 层，每层注意力 + 前馈，残差流从下往上
  tower(N, pos, col) {
    const prims = [], layers = 12, H = 0.62;
    const box = (x0, y0, z0, x1, y1, z1, o) => {
      const P = (x, y, z) => [x, y, z];
      const e = [[P(x0, y0, z0), P(x1, y0, z0)], [P(x1, y0, z0), P(x1, y0, z1)], [P(x1, y0, z1), P(x0, y0, z1)], [P(x0, y0, z1), P(x0, y0, z0)],
        [P(x0, y1, z0), P(x1, y1, z0)], [P(x1, y1, z0), P(x1, y1, z1)], [P(x1, y1, z1), P(x0, y1, z1)], [P(x0, y1, z1), P(x0, y1, z0)],
        [P(x0, y0, z0), P(x0, y1, z0)], [P(x1, y0, z0), P(x1, y1, z0)], [P(x1, y0, z1), P(x1, y1, z1)], [P(x0, y0, z1), P(x0, y1, z1)]];
      return e.map(([a, b]) => seg(a, b, o));
    };
    for (let l = 0; l < layers; l++) {
      const y = -3.6 + l * H;
      prims.push(...box(-1.6, y, -1, -0.1, y + H * 0.38, 1, { c: C.magenta, b: 0.07, layer: l }));
      prims.push(...box(0.1, y + H * 0.45, -1, 1.6, y + H * 0.85, 1, { c: G, b: 0.07, layer: l }));
    }
    prims.push(seg([0, -4.2, 0], [0, 4.2, 0], { c: C.white, b: 0.12, stream: true, w: 2 }));
    prims.push(text('×12', { x: 2.0, y: 3.6, height: 0.3, c: C.white, b: 0.12, weight: 500 }));
    const comp = compose(N, pos, col, prims, 806);
    const L = comp.list;
    return function update(ctx) {
      const ph = ((ctx.beat % 1) + 1) % 1, yf = -4.2 + ph * 8.4;
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]], y = comp.base[i * 3 + 1];
        if (q.stream) scaleCol(comp, col, i, 0.6 + 6 * Math.exp(-((y - yf) ** 2) / 0.05));
        else if (q.layer !== undefined) { const ly = -3.6 + q.layer * H + H * 0.4; scaleCol(comp, col, i, 0.7 + 3 * Math.exp(-((ly - yf) ** 2) / 0.12)); }
      }
    };
  },

  // 8g 词元瀑布：一个词一个词掉下来排成段落
  waterfall(N, pos, col) {
    const lines = ['the world is a dataset', 'every law a pattern', 'every pattern a weight', 'every weight a guess', 'and every guess', 'gets a little less wrong'];
    const prims = [];
    let idx = 0;
    lines.forEach((ln, j) => {
      const ws = ln.split(' ');
      const tot = ws.reduce((a, w) => a + w.length + 1, -1) * 0.3;
      let x = -tot / 2;
      ws.forEach((w) => {
        const t = text(w, { x, y: 2.2 - j * 0.9, height: 0.5, c: j === 5 ? G : C.warmWhite, b: 0.22, weight: 500, word: idx++ });
        prims.push(t);
        x += (w.length + 1) * 0.3;
      });
    });
    const total = idx;
    const comp = compose(N, pos, col, prims, 807);
    const L = comp.list;
    return function update(ctx) {
      const shown = clamp(ctx.p * 1.15) * total;
      for (let i = 0; i < N; i++) {
        const k = L[comp.role[i]].word, o = i * 3;
        const f = clamp(shown - k);
        const e = 1 - Math.pow(1 - f, 3);
        pos[o + 1] = comp.base[o + 1] + (1 - e) * 4;
        scaleCol(comp, col, i, f <= 0 ? 0 : e * (1 + 2 * (1 - f)));
      }
    };
  },

  // 8h 缩放定律（纸面插图）：对数坐标下的直线
  scaling(N, pos, col) {
    const prims = [...arrow([-3.6, -2.4], [3.9, -2.4], { c: C.white, b: 0.12 }), ...arrow([-3.6, -2.6], [-3.6, 2.5], { c: C.white, b: 0.12 })];
    const X = (lg) => -3.6 + ((lg - 6) / 6) * 7, Y = (l) => -2.4 + l * 4.5;
    for (let lg = 6; lg <= 12; lg += 2) prims.push(text(`10^{${lg}}`, { x: X(lg), y: -2.85, height: 0.26, align: 'center', c: C.white, b: 0.1, family: '"EB Garamond"', weight: 600 }));
    const r = rng(808);
    for (let k = 0; k < 4; k++) {
      const off = k * 0.12;
      prims.push(curve((t) => { const lg = 6 + t * 6; return [X(lg), Y(0.92 - (lg - 6) * 0.11 - off + (t < 0.15 ? (0.15 - t) * 0.6 : 0)), 0]; }, { c: lerp3(C.red, G, k / 3), b: 0.14, n: 120, ln: true }));
      for (let j = 0; j < 7; j++) { const lg = 6.4 + j * 0.85; prims.push(disc([X(lg), Y(0.92 - (lg - 6) * 0.11 - off) + gauss(r) * 0.04], 0.06, { c: lerp3(C.red, G, k / 3), b: 0.4, ln: true })); }
    }
    prims.push(text('N (parameters)', { x: 3.9, y: -3.25, height: 0.26, align: 'right', c: C.white, b: 0.1, family: '"EB Garamond"', weight: 600 }));
    prims.push(text('L', { x: -3.6, y: 2.65, height: 0.3, align: 'center', c: C.white, b: 0.12, family: '"EB Garamond"', weight: 600 }));
    prims.push(text('L ∝ N^{−0.076}', { x: 1.0, y: 1.6, height: 0.42, c: C.white, b: 0.14, family: '"EB Garamond"', weight: 600 }));
    const comp = compose(N, pos, col, prims, 808);
    const L = comp.list;
    return function update(ctx) {
      const rv = lerp(-3.7, 3.6, smooth(clamp(ctx.p * 1.4)));
      for (let i = 0; i < N; i++) if (L[comp.role[i]].ln) scaleCol(comp, col, i, comp.base[i * 3] > rv ? 0 : 1);
    };
  },

  // 8i 潜空间星系：每条旋臂是一类概念，带几个词
  latent(N, pos, col) {
    const r = rng(809), arms = 5;
    const pal = [G, C.pink, C.cyan, C.learn, C.warmWhite];
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      if (r() < 0.1) {
        const s = 0.5;
        pos.set([gauss(r) * s, gauss(r) * s * 0.5, gauss(r) * s], o);
        col.set([0.2 * 0.6, 0.18 * 0.6, 0.14 * 0.6], o);
        continue;
      }
      const arm = (r() * arms) | 0, rad = 0.4 + 5 * Math.pow(r(), 0.8);
      const ang = (arm / arms) * Math.PI * 2 + Math.log(rad + 0.4) * 1.8 + gauss(r) * 0.22;
      // 沿旋臂的小团簇
      const clump = Math.floor(rad * 3) / 3;
      pos.set([Math.cos(ang) * rad + gauss(r) * 0.12, gauss(r) * (0.06 + 0.03 * rad) + Math.sin(clump * 7) * 0.05, Math.sin(ang) * rad + gauss(r) * 0.12], o);
      const c = pal[arm], b = 0.22 * (1.1 - rad / 6);
      col.set([c[0] * b, c[1] * b, c[2] * b], o);
    }
  },

  // 8j 扩散：噪声一步步去噪成一张脸（每拍一步）
  face(N, pos, col) {
    const prims = [];
    prims.push(curve((t) => { const a = t * Math.PI * 2; return [Math.cos(a) * 1.9, Math.sin(a) * 2.4 - (Math.sin(a) < 0 ? Math.sin(a) ** 2 * 0.3 : 0), 0]; }, { c: G, b: 0.12 }));
    for (const s of [-1, 1]) {
      prims.push(curve((t) => { const a = t * Math.PI * 2; return [s * 0.75 + Math.cos(a) * 0.38, 0.45 + Math.sin(a) * 0.18, 0]; }, { c: C.warmWhite, b: 0.12 }));
      prims.push(disc([s * 0.75, 0.45], 0.11, { c: C.warmWhite, b: 0.3 }));
      prims.push(curve((t) => [s * (0.35 + t * 0.8), 0.95 + Math.sin(t * Math.PI) * 0.18, 0], { c: G, b: 0.1 }));
    }
    prims.push(poly([[0, 0.25], [-0.25, -0.55], [0.1, -0.6]], { c: C.warmWhite, b: 0.1 }));
    prims.push(curve((t) => [-0.6 + t * 1.2, -1.15 - Math.sin(t * Math.PI) * 0.22, 0], { c: C.pink, b: 0.14 }));
    for (let k = 0; k < 26; k++) { const a = Math.PI * (0.05 + (k / 25) * 0.9); prims.push(curve((t) => [Math.cos(a) * (1.9 + t * 0.5) * (1 - t * 0.1), Math.sin(a) * (2.4 + t * 0.4) - t * 0.3 * Math.cos(a), 0], { c: G, b: 0.06 })); }
    const comp = compose(N, pos, col, prims, 810);
    const r = rng(811), nz = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) nz[i] = gauss(r) * 1.1;
    return function update(ctx) {
      // 8 个去噪步，每拍半步跳一次
      const T = 8, step = Math.min(T, Math.floor(clamp(ctx.p * 1.1) * T * 1.0001) + easeOut(((ctx.p * 1.1 * T) % 1) / 0.3));
      const a = Math.pow(1 - step / T, 1.3);
      for (let i = 0; i < N * 3; i++) pos[i] = comp.base[i] + nz[i] * a;
    };
  },

  // 8k 公式环：全片的公式绕成一圈
  ring(N, pos, col) {
    const F = ['E = mc²', 'F = ma', 'H₂O', 'Δ²y = const', 'δ(q, a) → (q′, b, R)', 'H = −Σ p log p', 'y = σ(Wx + b)', 'θ ← θ − η∇L', 'softmax(QKᵀ/√d)V', 'L ∝ N^{−0.076}', 'S = A ⊕ B', '∇ · E = ρ/ε₀'];
    const prims = [];
    const R = 4.2;
    F.forEach((s, k) => {
      const t = text(s, { x: 0, y: 0, height: 0.5, align: 'center', c: k % 3 === 0 ? G : C.warmWhite, b: 0.12, weight: 500 });
      const a = (k / F.length) * Math.PI * 2;
      // 每条公式贴在圆柱面上
      prims.push({ ...t, at: (rr, u) => { const q = t.at(rr, u); const th = a + q[0] / R; return [Math.sin(th) * R, q[1], Math.cos(th) * R]; } });
    });
    prims.push(circle([0, -0.45, 0], R, { plane: 'xz', c: G, b: 0.05, n: 300 }), circle([0, 0.75, 0], R, { plane: 'xz', c: G, b: 0.05, n: 300 }));
    prims.push(text('epoch ∞', { x: 0, y: -0.3, height: 0.7, align: 'center', c: C.white, b: 0.12, weight: 700 }));
    compose(N, pos, col, prims, 812);
  },
};
