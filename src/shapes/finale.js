// 第 9 章 终章：单位圆上的 e^{iθ}
import { clamp, easeOut } from '../util.js';
import { C } from '../palette.js';
import { compose, seg, circle, disc, text, arrow, curve } from './kit.js';

export default {
  // 带上下标的大号公式
  formula(N, pos, col, { str = 'e^{iπ} + 1 = 0', height = 1.3 } = {}) {
    compose(N, pos, col, [text(str, { x: 0, y: -height * 0.35, height, align: 'center', c: C.white, b: 0.5, weight: 700 })], 905);
  },

  // 9d 单位圆（纸面插图）：半径每拍转 π/4，投影到两条轴上
  euler(N, pos, col) {
    const R = 2.2;
    const prims = [...arrow([-3.2, 0], [3.4, 0], { c: C.white, b: 0.1 }), ...arrow([0, -2.9], [0, 3.0], { c: C.white, b: 0.1 })];
    prims.push(circle([0, 0], R, { c: C.white, b: 0.12, n: 240 }));
    const T = (s, x, y, o = {}) => prims.push(text(s, { x, y, height: 0.32, align: 'center', c: C.white, b: 0.12, family: '"EB Garamond"', weight: 600, ...o }));
    T('Re', 3.6, -0.45); T('Im', 0.4, 2.9); T('1', R + 0.2, -0.45); T('−1', -R - 0.3, -0.45); T('i', 0.2, R + 0.12); T('−i', 0.3, -R - 0.45);
    prims.push(seg([0, 0], [1, 0], { c: C.red, b: 0.2, th: 0.014, rad: true, w: 2 }), disc([0, 0], 0.1, { c: C.red, b: 0.5, tip: true }));
    prims.push(seg([0, 0], [1, 0], { c: C.ice, b: 0.12, cosP: true }), seg([0, 0], [0, 1], { c: C.gold, b: 0.12, sinP: true }));
    prims.push(text('e^{iθ} = cos θ + i sin θ', { x: -3.0, y: 2.4, height: 0.36, c: C.white, b: 0.14, family: '"EB Garamond"', weight: 600 }));
    const comp = compose(N, pos, col, prims, 904);
    const L = comp.list;
    return function update(ctx) {
      const th = (Math.floor(ctx.beat) + easeOut((ctx.beat % 1) / 0.35)) * (Math.PI / 4);
      const c = Math.cos(th) * R, s = Math.sin(th) * R;
      for (let i = 0; i < N; i++) {
        const q = L[comp.role[i]], o = i * 3, u = comp.u[i];
        if (q.rad) { pos[o] = c * u; pos[o + 1] = s * u; }
        else if (q.tip) { pos[o] = comp.base[o] + c; pos[o + 1] = comp.base[o + 1] + s; }
        else if (q.cosP) { pos[o] = c * u; pos[o + 1] = s; }          // 横向虚影：从 Im 轴到圆上的点
        else if (q.sinP) { pos[o] = c; pos[o + 1] = s * u; }          // 竖向投影
      }
    };
  },
};
