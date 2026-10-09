// 第 5 章 网络：电报、熵、地球与数据包、TCP 握手、PageRank、字符雨
import { rng, gauss, clamp, lerp, easeOut, smooth } from '../util.js';
import { C } from '../palette.js';
import { compose, seg, poly, curve, circle, rect, disc, ball, text, arrow } from './kit.js';

const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const scaleCol = (comp, col, i, k) => { const o = i * 3; col[o] = comp.baseCol[o] * k; col[o + 1] = comp.baseCol[o + 1] * k; col[o + 2] = comp.baseCol[o + 2] * k; };

// 摩尔斯码 "... --- ..." 展开成亮/灭序列（单位长度）
const MORSE = (() => {
  const out = [];
  for (const ch of '... --- ...   ') {
    if (ch === '.') out.push(1, 0);
    else if (ch === '-') out.push(1, 1, 1, 0);
    else out.push(0, 0);
  }
  return out;
})();

// 假的大陆：几个三角函数叠加，阈值以上算陆地
const land = (lat, lon) => Math.sin(lon * 2 + 0.6) * Math.cos(lat * 2.2 - 0.3) + 0.6 * Math.sin(lon * 5 - lat * 3 + 1.3) + 0.35 * Math.cos(lon * 9 + lat * 7) > 0.45 && Math.abs(lat) < 1.3;

export default {
  // 5a 电报：两根电线杆之间，点划脉冲沿导线跑过去
  telegraph(N, pos, col) {
    const pole = (x) => [seg([x, -2.6], [x, 1.2], { c: C.white, b: 0.12, th: 0.02 }), seg([x - 0.6, 0.9], [x + 0.6, 0.9], { c: C.white, b: 0.12 }), disc([x + 0.45, 1.0], 0.07, { c: C.amber, b: 0.4 }), disc([x - 0.45, 1.0], 0.07, { c: C.amber, b: 0.4 })];
    const wireF = (t) => [-4 + 0.45 + t * 7.1, 1.0 - Math.sin(t * Math.PI) * 0.35, 0];
    const prims = [...pole(-4), ...pole(4), curve(wireF, { c: C.amber, b: 0.2, wire: true, w: 3 }), curve((t) => { const p = wireF(t); return [p[0] - 0.9, p[1], 0]; }, { c: C.white, b: 0.03 })];
    prims.push(text('WASHINGTON', { x: -4, y: -3.1, height: 0.26, align: 'center', c: C.white, b: 0.1, weight: 500 }), text('BALTIMORE', { x: 4, y: -3.1, height: 0.26, align: 'center', c: C.white, b: 0.1, weight: 500 }));
    prims.push(text('···  — — —  ···', { x: 0, y: -1.2, height: 0.5, align: 'center', c: C.amber, b: 0.12, weight: 700 }));
    const comp = compose(N, pos, col, prims, 501);
    const L = comp.list;
    return function update(ctx) {
      const head = ctx.beat * 6;  // 每拍 6 个单位
      for (let i = 0; i < N; i++) {
        if (!L[comp.role[i]].wire) continue;
        const s = Math.floor(comp.u[i] * 30 - head), on = MORSE[((s % MORSE.length) + MORSE.length) % MORSE.length];
        scaleCol(comp, col, i, on ? 2.2 : 0.12);
      }
    };
  },

  // 5b 香农熵曲线（纸面插图），下方比特流滚动
  entropy(N, pos, col) {
    const X = (p) => -3.5 + p * 7, Y = (h) => -1.6 + h * 3.4;
    const H = (p) => (p <= 0 || p >= 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p));
    const prims = [...arrow([-3.7, -1.6], [3.9, -1.6], { c: C.white, b: 0.12 }), ...arrow([-3.5, -1.8], [-3.5, 2.3], { c: C.white, b: 0.12 })];
    prims.push(curve((t) => [X(t), Y(H(t)), 0], { c: C.amber, b: 0.18, n: 300 }));
    for (let k = 0; k < 12; k++) prims.push(seg([X(0.5), Y(k / 12)], [X(0.5), Y((k + 0.5) / 12)], { c: C.white, b: 0.06 }));
    for (let k = 0; k < 12; k++) prims.push(seg([X(k / 24), Y(1)], [X((k + 0.5) / 24), Y(1)], { c: C.white, b: 0.06 }));
    const T = (s, x, y, o = {}) => prims.push(text(s, { x, y, height: 0.32, align: 'center', c: C.white, b: 0.12, family: '"EB Garamond"', weight: 600, ...o }));
    T('0', X(0), -2.05); T('½', X(0.5), -2.05); T('1', X(1), -2.05); T('p', 4.1, -1.75); T('H(p)', -3.5, 2.45);
    T('1 bit', X(0.5) + 0.75, Y(1) + 0.15, { c: C.amber });
    prims.push(ball([0, 0, 0], 0.16, { c: C.red, b: 0.25, marker: true }));
    const bits = '0110100111010010110100101101001110101101';
    prims.push(text(bits, { x: 0, y: -3.0, height: 0.3, align: 'center', c: C.white, b: 0.1, weight: 500, stream: true }));
    const comp = compose(N, pos, col, prims, 502);
    const L = comp.list;
    return function update(ctx) {
      const p = 0.5 + 0.45 * Math.sin(ctx.t * 1.6);
      const mx = X(p), my = Y(H(p));
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]], o = i * 3;
        if (q.marker) { pos[o] = comp.base[o] + mx; pos[o + 1] = comp.base[o + 1] + my; }
        else if (q.stream) { let x = comp.base[o] - ctx.t * 0.8; x = ((x + 6) % 12 + 12) % 12 - 6; pos[o] = x; scaleCol(comp, col, i, clamp(1.4 - Math.abs(x) / 4.5)); }
      }
    };
  },

  // 5c / 5d / 5h 地球：同一套经纬度，arcs 加数据包航线，flat 把球面展开成平面网格
  globe(N, pos, col, { flat = false, arcs = false } = {}) {
    const r = rng(503), R = 3;
    const nodes = [];
    while (nodes.length < 36) { const lat = (r() * 2 - 1) * 1.2, lon = (r() * 2 - 1) * Math.PI; if (land(lat, lon)) nodes.push([lat, lon]); }
    const P = (lat, lon, h = 0) => flat
      ? [(lon / Math.PI) * 6, (lat / (Math.PI / 2)) * 3 + h * 0.6, 0]
      : [(R + h) * Math.cos(lat) * Math.sin(lon), (R + h) * Math.sin(lat), (R + h) * Math.cos(lat) * Math.cos(lon)];
    const pairs = Array.from({ length: 24 }, (_, k) => [k % nodes.length, (k * 7 + 5) % nodes.length]);
    const type = new Uint8Array(N), ll = new Float32Array(N * 2), nodeOf = new Uint16Array(N), tt = new Float32Array(N), off = new Float32Array(N * 3);
    const tint = (c, b) => [c[0] * b, c[1] * b, c[2] * b];
    for (let i = 0; i < N; i++) {
      const x = r();
      let lat, lon, t;
      off.set([gauss(r) * 0.012, gauss(r) * 0.012, gauss(r) * 0.012], i * 3);
      if (x < 0.12) {
        type[i] = 0;
        if (r() < 0.5) { lon = (Math.floor(r() * 12) / 12) * Math.PI * 2 - Math.PI; lat = (r() * 2 - 1) * (Math.PI / 2); }
        else { lat = (Math.floor(r() * 5) - 2) * (Math.PI / 6); lon = (r() * 2 - 1) * Math.PI; }
        col.set(tint(C.amber, 0.05), i * 3);
      } else if (x < 0.66) {
        type[i] = 1;
        do { lat = Math.asin(r() * 2 - 1); lon = (r() * 2 - 1) * Math.PI; } while (!land(lat, lon));
        col.set(tint(C.amber, 0.08), i * 3);
      } else if (x < 0.74) {
        type[i] = 2;
        lat = Math.asin(r() * 2 - 1); lon = (r() * 2 - 1) * Math.PI;
        col.set(tint(C.deep, 0.04), i * 3);
      } else if (x < 0.84 || !arcs) {
        type[i] = 3;
        const k = (r() * nodes.length) | 0;
        nodeOf[i] = k; [lat, lon] = nodes[k];
        off.set([gauss(r) * 0.05, gauss(r) * 0.05, gauss(r) * 0.05], i * 3);
        col.set(tint(C.warmWhite, 0.045), i * 3);
      } else {
        type[i] = r() < 0.7 ? 4 : 5;   // 4 航线 5 数据包
        const k = (r() * pairs.length) | 0;
        nodeOf[i] = k; t = r(); tt[i] = t;
        lat = 0; lon = 0;
        col.set(tint(type[i] === 4 ? C.cyan : C.white, type[i] === 4 ? 0.07 : 0.15), i * 3);
        if (type[i] === 5) off.set([gauss(r) * 0.04, gauss(r) * 0.04, gauss(r) * 0.04], i * 3);
      }
      ll[i * 2] = lat; ll[i * 2 + 1] = lon;
    }
    const base = col.slice();
    // 大圆插值
    const arcAt = (k, t) => {
      const [a, b] = pairs[k];
      const A = nodes[a], B = nodes[b];
      if (flat) { const p = P(lerp(A[0], B[0], t), lerp(A[1], B[1], t)); p[1] += Math.sin(t * Math.PI) * 0.8; return p; }
      const va = P(A[0], A[1]), vb = P(B[0], B[1]);
      const v = [lerp(va[0], vb[0], t), lerp(va[1], vb[1], t), lerp(va[2], vb[2], t)], L = Math.hypot(...v) || 1, h = R + Math.sin(t * Math.PI) * 1.0;
      return [(v[0] / L) * h, (v[1] / L) * h, (v[2] / L) * h];
    };
    const place = (i, p) => { pos[i * 3] = p[0] + off[i * 3]; pos[i * 3 + 1] = p[1] + off[i * 3 + 1]; pos[i * 3 + 2] = p[2] + off[i * 3 + 2]; };
    for (let i = 0; i < N; i++) if (type[i] < 4) place(i, P(ll[i * 2], ll[i * 2 + 1])); else place(i, arcAt(nodeOf[i], tt[i]));
    return function update(ctx) {
      const n = Math.floor(ctx.beat * 2), ph = ctx.beat * 0.5;
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        if (type[i] === 3) {
          // 节点按半拍随机亮起（ping）
          const k = hash(nodeOf[i], n) < 0.4 ? 2.5 * (1 - ((ctx.beat * 2) % 1)) + 0.6 : 0.6;
          col[o] = base[o] * k; col[o + 1] = base[o + 1] * k; col[o + 2] = base[o + 2] * k;
        } else if (type[i] === 5) {
          place(i, arcAt(nodeOf[i], (ph + nodeOf[i] * 0.37) % 1));
        }
      }
    };
  },

  // 5e TCP 三次握手（工程图纸），每拍画出一支箭
  handshake(N, pos, col) {
    const prims = [seg([-2.6, 2.0], [-2.6, -2.6], { c: C.white, b: 0.12, th: 0.015 }), seg([2.6, 2.0], [2.6, -2.6], { c: C.white, b: 0.12, th: 0.015 })];
    const T = (s, x, y, o = {}) => prims.push(text(s, { x, y, height: 0.3, align: 'center', c: C.white, b: 0.12, weight: 500, ...o }));
    T('CLIENT', -2.6, 2.25); T('SERVER', 2.6, 2.25);
    const legs = [[[-2.6, 1.4], [2.6, 0.5], 'SYN  seq = x'], [[2.6, 0.2], [-2.6, -0.7], 'SYN-ACK  seq = y, ack = x + 1'], [[-2.6, -1.0], [2.6, -1.9], 'ACK  ack = y + 1']];
    legs.forEach(([a, b, s], k) => {
      prims.push(...arrow(a, b, { c: C.amber, b: 0.16, leg: k, head: 0.22 }).map((p, j) => ({ ...p, head: j > 0 })));
      prims.push(text(s, { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 + 0.22, height: 0.22, align: 'center', c: C.white, b: 0.12, weight: 500, leg: k, label: true }));
    });
    ['CLOSED', 'SYN-SENT', 'ESTABLISHED'].forEach((s, k) => T(s, -3.0, 1.35 - k * 1.25, { height: 0.18, align: 'right', b: 0.08 }));
    ['LISTEN', 'SYN-RCVD', 'ESTABLISHED'].forEach((s, k) => T(s, 3.0, 1.35 - k * 1.25 - 0.6, { height: 0.18, align: 'left', b: 0.08 }));
    const comp = compose(N, pos, col, prims, 505);
    const L = comp.list;
    return function update(ctx) {
      const prog = ctx.p * 4 - 0.3;
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]];
        if (q.leg === undefined) continue;
        const f = clamp((prog - q.leg) / 0.6);
        const vis = q.label || q.head ? f >= 1 : comp.u[i] <= f;
        scaleCol(comp, col, i, vis ? 1 : 0);
      }
    };
  },

  // 5f PageRank：节点按重要性长大，脉冲沿链接流动
  pagerank(N, pos, col) {
    const r = rng(506), n = 48;
    const P = Array.from({ length: n }, () => { const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = 2.2 + r() * 1.4; return [s * Math.cos(a) * d * 1.3, u * d * 0.8, s * Math.sin(a) * d]; });
    // 偏好连接：越早的节点越容易被链接
    const E = [];
    for (let k = 1; k < n; k++) for (let j = 0; j < 3; j++) { const t = Math.floor(Math.pow(r(), 2.2) * k); if (t !== k) E.push([k, t]); }
    const out = new Array(n).fill(0); E.forEach(([a]) => out[a]++);
    let pr = new Array(n).fill(1 / n);
    for (let it = 0; it < 40; it++) {
      const nx = new Array(n).fill(0.15 / n);
      E.forEach(([a, b]) => { nx[b] += 0.85 * pr[a] / out[a]; });
      const s = nx.reduce((x, y) => x + y, 0); pr = nx.map((x) => x / s);
    }
    const maxPr = Math.max(...pr);
    const prims = [];
    E.forEach(([a, b], k) => prims.push(seg(P[a], P[b], { c: C.amber, b: 0.04, edge: k })));
    for (let k = 0; k < n; k++) prims.push(ball([0, 0, 0], 1, { c: k < 4 ? C.gold : C.warmWhite, b: 0.08, w: 0.4 + 2 * pr[k] / maxPr, node: k }));
    const comp = compose(N, pos, col, prims, 506);
    const L = comp.list;
    return function update(ctx) {
      const g = smooth(clamp(ctx.p * 1.5));
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]], o = i * 3;
        if (q.node !== undefined) {
          const rad = lerp(0.18, 0.12 + 0.75 * Math.sqrt(pr[q.node] / maxPr), g);
          pos[o] = P[q.node][0] + comp.base[o] * rad; pos[o + 1] = P[q.node][1] + comp.base[o + 1] * rad; pos[o + 2] = P[q.node][2] + comp.base[o + 2] * rad;
        } else {
          const d = (comp.u[i] - ((ctx.beat + q.edge * 0.13) % 1) + 1) % 1;
          scaleCol(comp, col, i, 0.6 + 4 * Math.exp(-d * 25));
        }
      }
    };
  },

  // 5g 字符雨：语料倾泻而下
  rain(N, pos, col) {
    const r = rng(507), cols = 34, rows = 16, chars = 'abcdefghijklmnopqrstuvwxyz0123456789{}()<>=+;:.,"/的是一了人我在有他这中大来上';
    const prims = [];
    for (let c = 0; c < cols; c++) for (let k = 0; k < rows; k++) {
      const ch = chars[(r() * chars.length) | 0];
      prims.push(text(ch, { x: -7.2 + c * 0.44, y: 4.2 - k * 0.56, height: 0.34, align: 'center', c: C.amber, b: 0.3, weight: 500, colN: c, rowN: k }));
    }
    const comp = compose(N, pos, col, prims, 507);
    const L = comp.list;
    const speed = Array.from({ length: cols }, () => 4 + r() * 5), phase = Array.from({ length: cols }, () => r() * 9);
    return function update(ctx) {
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]], o = i * 3;
        let y = comp.base[o + 1] - ctx.t * 0.25;
        y = ((y + 4.6) % 9 + 9) % 9 - 4.6;
        pos[o + 1] = y;
        // 每列有一个往下跑的“头”，最亮，往上拖尾
        const head = 4.4 - (((ctx.t * speed[q.colN] + phase[q.colN]) % 9) + 9) % 9;
        const d = ((y - head) % 9 + 9) % 9;
        const k = d < 0.3 ? 3.5 : Math.max(0.15, 1.3 - d * 0.22);
        const o3 = o;
        col[o3] = comp.baseCol[o3] * k * (d < 0.3 ? 1.3 : 1); col[o3 + 1] = comp.baseCol[o3 + 1] * k; col[o3 + 2] = comp.baseCol[o3 + 2] * k * (d < 0.3 ? 2.5 : 1);
      }
    };
  },
};
