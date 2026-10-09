// 基础形态：亮点、屏幕边框、大爆炸、球
import { rng, gauss, lerp3 } from '../util.js';
import { C } from '../palette.js';

function set(arr, i, x, y, z) { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; }

export default {
  // 一个发亮的点
  point(N, pos, col) {
    const r = rng(11);
    for (let i = 0; i < N; i++) {
      const s = r() < 0.85 ? 0.06 : 0.2;
      set(pos, i, gauss(r) * s, gauss(r) * s, gauss(r) * s);
      const c = lerp3(C.white, C.ice, r() * 0.5);
      set(col, i, c[0] * 0.025, c[1] * 0.025, c[2] * 0.025);
    }
  },

  // 沿屏幕四边分布（相机在 z=10、视角 40° 时正好在画面边缘）
  edges(N, pos, col) {
    const r = rng(12);
    const hw = 6.8, hh = 3.85;
    for (let i = 0; i < N; i++) {
      const per = r() * 2 * (hw + hh) * 2;
      let x, y;
      if (per < 2 * hw) { x = -hw + per; y = hh; }
      else if (per < 2 * hw + 2 * hh) { x = hw; y = hh - (per - 2 * hw); }
      else if (per < 4 * hw + 2 * hh) { x = hw - (per - 2 * hw - 2 * hh); y = -hh; }
      else { x = -hw; y = -hh + (per - 4 * hw - 2 * hh); }
      const inset = Math.abs(gauss(r)) * 0.25;
      x -= Math.sign(x) * (Math.abs(x) >= hw - 1e-6 ? inset : 0);
      y -= Math.sign(y) * (Math.abs(y) >= hh - 1e-6 ? inset : 0);
      set(pos, i, x, y, gauss(r) * 0.3);
      const c = lerp3(C.ice, C.white, r() * 0.4);
      set(col, i, c[0] * 0.14, c[1] * 0.14, c[2] * 0.14);
    }
  },

  // 大爆炸后的物质云：内核白热，外层冷蓝，带一些放射状细丝
  bang(N, pos, col) {
    const r = rng(13);
    const rays = [];
    for (let k = 0; k < 90; k++) {
      const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      rays.push([s * Math.cos(a), u, s * Math.sin(a)]);
    }
    for (let i = 0; i < N; i++) {
      let d;
      if (r() < 0.35) {
        const ray = rays[(r() * rays.length) | 0];
        d = [ray[0] + gauss(r) * 0.04, ray[1] + gauss(r) * 0.04, ray[2] + gauss(r) * 0.04];
      } else {
        const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        d = [s * Math.cos(a), u, s * Math.sin(a)];
      }
      const rad = 6.5 * Math.pow(r(), 0.6);
      set(pos, i, d[0] * rad, d[1] * rad, d[2] * rad);
      const k = Math.min(1, rad / 6.5);
      const c = k < 0.35 ? lerp3([1, 0.92, 0.8], C.white, k / 0.35) : lerp3(C.white, C.ice, (k - 0.35) / 0.65);
      const b = 0.3 * (1.2 - k * 0.6);
      set(col, i, c[0] * b, c[1] * b, c[2] * b);
    }
  },

  // 球面（行星）
  sphere(N, pos, col, { radius = 0.6 } = {}) {
    const r = rng(14);
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const rr = radius * (1 + gauss(r) * 0.01);
      set(pos, i, s * Math.cos(a) * rr, u * rr, s * Math.sin(a) * rr);
      const band = 0.5 + 0.5 * Math.sin(u * 14);
      const c = lerp3(C.ice, C.white, band * 0.6);
      set(col, i, c[0] * 0.1, c[1] * 0.1, c[2] * 0.1);
    }
  },
};
