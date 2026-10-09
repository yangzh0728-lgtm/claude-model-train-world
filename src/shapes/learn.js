// 第 6 章 学习：感知机、XOR、激活函数、多层网络（前向/反向）、MNIST、卷积、损失曲面、t-SNE、损失曲线
import { rng, gauss, clamp, lerp, lerp3, easeOut, smooth } from '../util.js';
import { C } from '../palette.js';
import { compose, seg, poly, curve, circle, rect, rectFill, disc, ball, sphere, text, arrow } from './kit.js';

const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const scaleCol = (comp, col, i, k) => { const o = i * 3; col[o] = comp.baseCol[o] * k; col[o + 1] = comp.baseCol[o + 1] * k; col[o + 2] = comp.baseCol[o + 2] * k; };
const setCol = (col, i, c, b) => { const o = i * 3; col[o] = c[0] * b; col[o + 1] = c[1] * b; col[o + 2] = c[2] * b; };
const LEARN = C.learn;

// 损失曲面 z = f(x, y)：两个谷，一个浅一个深
export const lossAt = (x, y) => 0.18 * (x * x + y * y) - 1.6 * Math.exp(-((x - 1.4) ** 2 + (y + 0.8) ** 2) / 1.2) - 0.9 * Math.exp(-((x + 1.6) ** 2 + (y - 1.2) ** 2) / 0.8) + 0.12 * Math.sin(x * 2.2) * Math.cos(y * 1.8);
const gradAt = (x, y) => { const e = 1e-3; return [(lossAt(x + e, y) - lossAt(x - e, y)) / (2 * e), (lossAt(x, y + e) - lossAt(x, y - e)) / (2 * e)]; };

export default {
  // 6a 感知机：三个输入加权求和过激活函数
  perceptron(N, pos, col) {
    const prims = [];
    const ins = [[-3.6, 1.6], [-3.6, 0], [-3.6, -1.6]];
    const sum = [0, 0];
    ins.forEach((p, k) => {
      prims.push(circle(p, 0.42, { c: C.white, b: 0.14 }), text(`x_{${k + 1}}`, { x: p[0], y: p[1] - 0.16, height: 0.36, align: 'center', c: C.white, b: 0.12, weight: 500 }));
      prims.push(seg([p[0] + 0.45, p[1]], [sum[0] - 0.62, sum[1] + p[1] * 0.25], { c: LEARN, b: 0.14, sig: true, w: 1 + k * 0.5, th: 0.008 + k * 0.006 }));
      prims.push(text(`w_{${k + 1}}`, { x: lerp(p[0], sum[0], 0.5), y: p[1] * 0.62 + 0.18, height: 0.26, align: 'center', c: LEARN, b: 0.1, weight: 500 }));
    });
    prims.push(circle(sum, 0.6, { c: LEARN, b: 0.16 }), text('Σ', { x: 0, y: -0.27, height: 0.7, align: 'center', c: C.white, b: 0.14 }));
    prims.push(seg([0.62, 0], [1.6, 0], { c: LEARN, b: 0.14, sig: true }), rect(1.6, -0.55, 2.9, 0.55, { c: LEARN, b: 0.14 }));
    prims.push(curve((t) => [1.75 + t * 1.0, -0.38 + 0.76 / (1 + Math.exp(-(t - 0.5) * 12)), 0], { c: C.white, b: 0.12 }));
    prims.push(...arrow([2.9, 0], [4.2, 0], { c: LEARN, b: 0.14, sig: true }), text('y', { x: 4.5, y: -0.18, height: 0.42, align: 'center', c: C.white, b: 0.14, weight: 500 }));
    prims.push(seg([0, -1.6], [0, -0.62], { c: LEARN, b: 0.06 }), text('b', { x: 0, y: -2.0, height: 0.32, align: 'center', c: LEARN, b: 0.1, weight: 500 }));
    const comp = compose(N, pos, col, prims, 601);
    const L = comp.list;
    return function update(ctx) {
      const wf = lerp(-4.2, 4.4, (ctx.beat % 1) * 1.15);
      for (let i = 0; i < N; i++) {
        if (!L[comp.role[i]].sig) continue;
        const d = comp.base[i * 3] - wf;
        scaleCol(comp, col, i, 0.6 + 4 * Math.exp(-(d * d) / 0.12));
      }
    };
  },

  // 6b XOR：四个点，一条直线每拍换个角度，总有一个点分错
  xor(N, pos, col) {
    const X = (v) => -2 + v * 4, Y = (v) => -2 + v * 4;
    const prims = [...arrow([-2.8, -2.6], [3.2, -2.6], { c: C.white, b: 0.12 }), ...arrow([-2.6, -2.8], [-2.6, 3.0], { c: C.white, b: 0.12 })];
    [[0, 0], [1, 1]].forEach(([a, b]) => prims.push(circle([X(a), Y(b)], 0.32, { c: C.ice, b: 0.2, th: 0.02 })));
    [[0, 1], [1, 0]].forEach(([a, b]) => prims.push(seg([X(a) - 0.3, Y(b) - 0.3], [X(a) + 0.3, Y(b) + 0.3], { c: C.red, b: 0.2, th: 0.02 }), seg([X(a) - 0.3, Y(b) + 0.3], [X(a) + 0.3, Y(b) - 0.3], { c: C.red, b: 0.2, th: 0.02 })));
    const T = (s, x, y, o = {}) => prims.push(text(s, { x, y, height: 0.32, align: 'center', c: C.white, b: 0.12, family: '"EB Garamond"', weight: 600, ...o }));
    T('x₁', 3.4, -2.75); T('x₂', -2.6, 3.15); T('0', X(0), -3.05); T('1', X(1), -3.05); T('1', -3.0, Y(1) - 0.1);
    prims.push(seg([-1, 0], [1, 0], { c: LEARN, b: 0.2, line: true, th: 0.012, w: 2 }));
    const comp = compose(N, pos, col, prims, 602);
    const L = comp.list;
    const tries = [[0.6, 0.3], [-0.5, -0.4], [1.2, 0.5], [0.2, -0.2], [-1.0, 0.1]];
    return function update(ctx) {
      const n = Math.floor(ctx.beat), f = easeOut((ctx.beat % 1) / 0.3);
      const a = tries[((n - 1) % 5 + 5) % 5], b = tries[(n % 5 + 5) % 5];
      const ang = lerp(a[0], b[0], f), off = lerp(a[1], b[1], f);
      const c = Math.cos(ang), s = Math.sin(ang);
      for (let i = 0; i < N; i++) {
        if (!L[comp.role[i]].line) continue;
        const o = i * 3, x = comp.base[o] * 3.6, y = comp.base[o + 1];
        pos[o] = x * c - y * s - off * s; pos[o + 1] = x * s + y * c + off * c;
      }
    };
  },

  // 6c 激活函数：sigmoid → tanh → ReLU，每拍换一个
  activation(N, pos, col) {
    const prims = [...arrow([-3.6, 0], [3.8, 0], { c: C.white, b: 0.1 }), ...arrow([0, -2.2], [0, 2.8], { c: C.white, b: 0.1 })];
    prims.push(curve((t) => [-3.4 + t * 6.8, 0, 0], { c: LEARN, b: 0.2, n: 200, fn: true, w: 2.5, th: 0.012 }));
    const names = ['σ(z) = 1 / (1 + e^{−z})', 'tanh(z)', 'ReLU(z) = max(0, z)'];
    names.forEach((s, k) => prims.push(text(s, { x: -3.4, y: 2.2 - k * 0.5, height: 0.3, c: C.white, b: 0.12, family: '"EB Garamond"', weight: 600, lab: k })));
    const comp = compose(N, pos, col, prims, 603);
    const L = comp.list;
    const F = [(z) => 2 / (1 + Math.exp(-z * 1.6)), (z) => Math.tanh(z * 1.2) * 1.6, (z) => Math.max(0, z) * 0.75];
    return function update(ctx) {
      const n = Math.floor(ctx.beat), f = easeOut((ctx.beat % 1) / 0.35);
      const a = ((n - 1) % 3 + 3) % 3, b = (n % 3 + 3) % 3;
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]], o = i * 3;
        if (q.fn) { const z = comp.base[o] / 1.3; pos[o + 1] = lerp(F[a](z), F[b](z), f) + (comp.base[o + 1]); }
        else if (q.lab !== undefined) scaleCol(comp, col, i, q.lab === b ? 1.6 : 0.3);
      }
    };
  },

  // 6d / 6e 多层全连接网络。backward 时信号从右往左，颜色由红转蓝
  mlp(N, pos, col, { backward = false } = {}) {
    const layers = [12, 10, 8, 6, 10], X = [-4.8, -2.4, 0, 2.4, 4.8];
    const node = (l, k) => { const n = layers[l], y = (k - (n - 1) / 2) * 0.62; return [X[l], y, -Math.cos((y / 4) * Math.PI) * 0.6]; };
    const prims = [];
    for (let l = 0; l < 4; l++) for (let a = 0; a < layers[l]; a++) for (let b = 0; b < layers[l + 1]; b++) prims.push(seg(node(l, a), node(l + 1, b), { c: LEARN, b: 0.035, edge: true, th: 0.004 }));
    for (let l = 0; l < 5; l++) for (let k = 0; k < layers[l]; k++) prims.push(sphere(node(l, k), 0.17, { c: C.white, b: 0.06, nd: true }), ball(node(l, k), 0.14, { c: LEARN, b: 0.08, nd: true }));
    const comp = compose(N, pos, col, prims, 604);
    const L = comp.list;
    const red = C.red, blue = C.ice;
    return function update(ctx) {
      const ph = ((ctx.beat % 1) + 1) % 1;
      const wf = backward ? lerp(5.4, -5.4, ph) : lerp(-5.4, 5.4, ph);
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]], o = i * 3, x = comp.base[o], d = x - wf;
        const pulse = Math.exp(-(d * d) / 0.25);
        if (!backward) { scaleCol(comp, col, i, 0.7 + (q.nd ? 3 : 5) * pulse); continue; }
        // 反向：波前已经扫过的部分变蓝，还没扫到的是红
        const passed = clamp(0.5 + (x - wf) * 1.2);
        const c = lerp3(red, blue, clamp(passed * 0.6 + ctx.p * 0.7)), b = (q.nd ? 0.07 : 0.04) * (0.8 + 4 * pulse);
        const mul = comp.mult[comp.role[i]];
        setCol(col, i, c, b * mul);
      }
    };
  },

  // 6f MNIST 手写 7：28×28 像素点阵，右边十个输出条
  mnist(N, pos, col) {
    const S = 0.18, g = 28;
    // 手写的 7：一横一斜，带点粗细变化
    const ink = (x, y) => {
      const d1 = Math.abs(y - 6.5) + Math.max(0, Math.abs(x - 13.5) - 7.5);
      const t = clamp((y - 6.5) / 16), cx = 20.5 - t * 8.5, d2 = Math.abs(x - cx) + Math.max(0, y - 23) + Math.max(0, 6 - y);
      const d = Math.min(d1 * 1.1, d2);
      return clamp(1.6 - d * 0.75);
    };
    const prims = [];
    for (let y = 0; y < g; y++) for (let x = 0; x < g; x++) {
      const v = ink(x, y), px = -4.6 + x * S, py = 2.5 - y * S;
      if (v > 0.05) prims.push(rectFill(px, py - S * 0.86, px + S * 0.86, py, { c: lerp3(C.learn, C.white, v), b: 0.22 * v, w: v }));
      else prims.push(disc([px + S * 0.43, py - S * 0.43], 0.012, { c: C.white, b: 0.06, w: 0.12 }));
    }
    prims.push(rect(-4.65, -2.6, 0.5, 2.55, { c: C.white, b: 0.05 }));
    const probs = [0.01, 0.02, 0.03, 0.04, 0.01, 0.02, 0.01, 0.91, 0.03, 0.05];
    probs.forEach((p, k) => {
      const y = 2.2 - k * 0.48;
      prims.push(text(String(k), { x: 1.4, y: y - 0.14, height: 0.3, align: 'center', c: k === 7 ? C.gold : C.white, b: 0.12, weight: 500 }));
      prims.push(rectFill(1.8, y - 0.14, 1.8 + 0.05 + p * 3, y + 0.14, { c: k === 7 ? C.gold : LEARN, b: 0.2, bar: k, x0: 1.8 }));
    });
    const comp = compose(N, pos, col, prims, 606);
    const L = comp.list;
    return function update(ctx) {
      const f = easeOut(clamp(ctx.p * 2 - 0.3));
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]];
        if (q.bar === undefined) continue;
        const o = i * 3;
        pos[o] = q.x0 + (comp.base[o] - q.x0) * f;
      }
    };
  },

  // 6g 卷积（工程图纸）：3×3 卷积核在 8×8 输入上滑，右边特征图逐格填上
  conv(N, pos, col) {
    const S = 0.5, n = 8, m = 6;
    const ix = (x) => -4.6 + x * S, iy = (y) => 2.0 - y * S;
    const ox = (x) => 1.6 + x * S, oy = (y) => 1.5 - y * S;
    const r = rng(607);
    const prims = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      prims.push(rect(ix(x), iy(y) - S, ix(x) + S, iy(y), { c: C.white, b: 0.05, th: 0.004 }));
      if (r() < 0.4) prims.push(rectFill(ix(x) + 0.06, iy(y) - S + 0.06, ix(x) + S - 0.06, iy(y) - 0.06, { c: C.ice, b: 0.03 }));
    }
    for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) {
      prims.push(rect(ox(x), oy(y) - S, ox(x) + S, oy(y), { c: C.white, b: 0.05, th: 0.004 }));
      prims.push(rectFill(ox(x) + 0.05, oy(y) - S + 0.05, ox(x) + S - 0.05, oy(y) - 0.05, { c: LEARN, b: 0.03 + r() * 0.05, cell: y * m + x }));
    }
    // 后面叠两层特征图
    for (let k = 1; k <= 2; k++) prims.push(rect(ox(0) + k * 0.25, oy(m) + k * 0.25, ox(m) + k * 0.25, oy(0) + k * 0.25, { c: C.white, b: 0.05, z: -k * 0.3 }));
    prims.push(rect(0, -S * 3, S * 3, 0, { c: C.amber, b: 0.2, th: 0.012, kern: true }));
    for (let a = 1; a < 3; a++) prims.push(seg([a * S, -S * 3], [a * S, 0], { c: C.amber, b: 0.08, kern: true }), seg([0, -a * S], [S * 3, -a * S], { c: C.amber, b: 0.08, kern: true }));
    prims.push(seg([S * 3, 0], [0, 0], { c: C.amber, b: 0.06, link: true }));
    const T = (s, x, y) => prims.push(text(s, { x, y, height: 0.26, align: 'center', c: C.white, b: 0.1, weight: 500 }));
    T('input 8 × 8', ix(4), iy(n) - 0.45); T('feature map 6 × 6', ox(3), oy(m) - 0.45); T('K 3 × 3', -0.2, 2.6);
    const comp = compose(N, pos, col, prims, 607);
    const L = comp.list;
    return function update(ctx) {
      const stepF = clamp(ctx.p, 0, 0.999) * 36;   // 一小节扫完 36 个位置
      const k = Math.floor(stepF), kx = k % m, ky = Math.floor(k / m);
      const KX = ix(kx), KY = iy(ky);
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]], o = i * 3;
        if (q.kern) { pos[o] = comp.base[o] + KX; pos[o + 1] = comp.base[o + 1] + KY; pos[o + 2] = 0.05; }
        else if (q.link) {
          // 从卷积核中心连到输出格
          const u = comp.u[i], a = [KX + S * 1.5, KY - S * 1.5], b = [ox(kx) + S / 2, oy(ky) - S / 2];
          pos[o] = lerp(a[0], b[0], u); pos[o + 1] = lerp(a[1], b[1], u); pos[o + 2] = 0.05;
        } else if (q.cell !== undefined) scaleCol(comp, col, i, q.cell < k ? 1 : q.cell === k ? 3 : 0.05);
      }
    };
  },

  // 6h 损失曲面：网格曲面 + 沿梯度滚下的小球
  landscape(N, pos, col, { overshoot = false } = {}) {
    const r = rng(608), E = 3.2, Z = (x, y) => lossAt(x, y) * 1.1;
    const prims = [];
    const L = 22;
    for (let k = 0; k <= L; k++) {
      const v = -E + (k / L) * 2 * E;
      prims.push(curve((t) => { const x = -E + t * 2 * E; return [x, Z(x, v), v]; }, { c: (rr, u) => lerp3(C.deep, C.learn, clamp(0.5 + Z(-E + u * 2 * E, v) * 0.4)), b: 0.06, n: 80 }));
      prims.push(curve((t) => { const y = -E + t * 2 * E; return [v, Z(v, y), y]; }, { c: (rr, u) => lerp3(C.deep, C.learn, clamp(0.5 + Z(v, -E + u * 2 * E) * 0.4)), b: 0.06, n: 80 }));
    }
    // 梯度下降路径
    const path = [];
    let p = [-2.6, -2.4];
    for (let k = 0; k < 120; k++) {
      path.push([p[0], Z(p[0], p[1]) + 0.18, p[1]]);
      const g = gradAt(p[0], p[1]), eta = overshoot ? 1.9 : 0.22;
      p = [p[0] - eta * g[0], p[1] - eta * g[1]];
      if (overshoot) p = [clamp(p[0], -E, E), clamp(p[1], -E, E)];
    }
    prims.push(poly(path, { c: C.gold, b: 0.14, trail: true }));
    prims.push(ball([0, 0, 0], 0.32, { c: C.gold, b: 0.25, ballP: true }), sphere([0, 0, 0], 0.2, { c: C.white, b: 0.12, ballP: true }));
    const comp = compose(N, pos, col, prims, 608);
    const Ls = comp.list, trailPoly = Ls.find((q) => q.trail);
    void r;
    return function update(ctx) {
      const prog = smooth(clamp(ctx.p * 1.2));
      const head = trailPoly.pointAt(prog * 0.999);
      for (let i = 0; i < N; i++) {
        const q = Ls[comp.role[i]], o = i * 3;
        if (q.ballP) { pos[o] = comp.base[o] + head[0]; pos[o + 1] = comp.base[o + 1] + head[1]; pos[o + 2] = comp.base[o + 2] + head[2]; }
        else if (q.trail) scaleCol(comp, col, i, comp.u[i] < prog ? 1 : 0);
      }
    };
  },

  // 6i t-SNE：散点自己聚成十团
  tsne(N, pos, col) {
    const r = rng(609), K = 10;
    const cent = Array.from({ length: K }, (_, k) => { const a = (k / K) * Math.PI * 2 + r() * 0.3, d = 2.4 + r() * 1.2; return [Math.cos(a) * d * 1.3, Math.sin(a) * d * 0.85, (r() - 0.5) * 2]; });
    const pal = [C.learn, C.ice, C.life, C.amber, C.magenta, C.cyan, C.gold, C.red, C.pink, C.deep];
    const from = new Float32Array(N * 3), to = new Float32Array(N * 3), delay = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const k = (r() * K) | 0, o = i * 3;
      from.set([(r() * 2 - 1) * 5, (r() * 2 - 1) * 3, (r() * 2 - 1) * 2], o);
      const s = 0.3 + 0.45 * r();
      to.set([cent[k][0] + gauss(r) * s, cent[k][1] + gauss(r) * s, cent[k][2] + gauss(r) * s], o);
      delay[i] = r() * 0.3;
      const c = pal[k];
      col.set([c[0] * 0.022, c[1] * 0.022, c[2] * 0.022], o);
    }
    return function update(ctx) {
      for (let i = 0; i < N; i++) {
        const o = i * 3, f = smooth(clamp((ctx.p * 1.4 - delay[i]) / 0.8));
        pos[o] = lerp(from[o], to[o], f); pos[o + 1] = lerp(from[o + 1], to[o + 1], f); pos[o + 2] = lerp(from[o + 2], to[o + 2], f);
      }
    };
  },

  // 6j 损失曲线（也给 7b 用：val 曲线在后面掉头往上）
  losscurve(N, pos, col, { val = false } = {}) {
    const X = (e) => -4 + e * 8, Y = (l) => -2.2 + l * 4.4;
    const train = (e) => 0.06 + 0.88 * Math.exp(-e * 4.2) + 0.02 * Math.sin(e * 60) * (1 - e);
    const valid = (e) => 0.12 + 0.82 * Math.exp(-e * 3.6) + Math.max(0, e - 0.45) ** 2 * 1.6 + 0.02 * Math.sin(e * 47);
    const prims = [...arrow([-4.2, -2.2], [4.5, -2.2], { c: C.white, b: 0.12 }), ...arrow([-4, -2.4], [-4, 2.7], { c: C.white, b: 0.12 })];
    for (let k = 1; k <= 4; k++) prims.push(seg([-4, Y(k / 4)], [4.2, Y(k / 4)], { c: C.white, b: 0.015 }));
    prims.push(curve((t) => [X(t), Y(train(t)), 0], { c: LEARN, b: 0.18, n: 300, crv: true, w: 2 }));
    if (val) prims.push(curve((t) => [X(t), Y(valid(t)), 0], { c: C.magenta, b: 0.18, n: 300, crv: true, w: 2 }));
    prims.push(text('epoch', { x: 4.4, y: -2.65, height: 0.24, align: 'right', c: C.white, b: 0.1, weight: 500 }), text('loss', { x: -4, y: 2.85, height: 0.24, align: 'center', c: C.white, b: 0.1, weight: 500 }));
    if (val) prims.push(text('train', { x: 4.3, y: Y(train(1)) - 0.1, height: 0.24, c: LEARN, b: 0.12, weight: 500 }), text('val', { x: 4.3, y: Y(valid(1)) - 0.1, height: 0.24, c: C.magenta, b: 0.12, weight: 500 }));
    const comp = compose(N, pos, col, prims, 610);
    const L = comp.list;
    return function update(ctx) {
      const reveal = val ? 1 : X(clamp(ctx.p * 1.15));
      for (let i = 0; i < N; i++) {
        if (!L[comp.role[i]].crv) continue;
        const x = comp.base[i * 3];
        if (val) { const rv = X(clamp(0.45 + ctx.p * 0.7)); scaleCol(comp, col, i, x > rv ? 0 : 1 + 3 * Math.exp(-(rv - x) * 6)); }
        else scaleCol(comp, col, i, x > reveal ? 0 : 1 + 3 * Math.exp(-(reveal - x) * 6));
      }
    };
  },
};
