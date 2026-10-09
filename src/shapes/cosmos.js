// 宇宙尺度：旋涡星云、玻尔原子
import { rng, gauss, lerp3, clamp, smooth } from '../util.js';
import { C } from '../palette.js';

function set(arr, i, x, y, z) { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; }

export default {
  // 三臂旋涡星云，盘面在 xz 平面
  nebula(N, pos, col) {
    const r = rng(21);
    const arms = 3;
    for (let i = 0; i < N; i++) {
      const roll = r();
      if (roll < 0.16) {
        // 核球
        const s = 0.45;
        set(pos, i, gauss(r) * s, gauss(r) * s * 0.55, gauss(r) * s);
        const c = lerp3([1, 0.93, 0.82], C.white, r());
        set(col, i, c[0] * 0.18, c[1] * 0.18, c[2] * 0.18);
        continue;
      }
      const arm = (r() * arms) | 0;
      const rad = 0.35 + 4.6 * Math.pow(r(), 0.85);
      const spread = 0.28 + 0.1 * rad;
      const ang = (arm / arms) * Math.PI * 2 + Math.log(rad + 0.4) * 2.2 + gauss(r) * spread / (0.6 + rad * 0.25);
      const x = Math.cos(ang) * rad + gauss(r) * 0.08 * rad;
      const z = Math.sin(ang) * rad + gauss(r) * 0.08 * rad;
      const y = gauss(r) * (0.07 + 0.04 * rad);
      set(pos, i, x, y, z);
      let c;
      const pick = r();
      if (pick < 0.05) c = C.pink;
      else if (pick < 0.2) c = C.white;
      else c = lerp3(C.ice, C.deep, clamp(rad / 5) * 0.6);
      const b = 0.4 * (1.15 - clamp(rad / 5) * 0.5);
      set(col, i, c[0] * b, c[1] * b, c[2] * b);
    }
  },

  // 玻尔原子（氢）：原子核 + 三条轨道 + 一个随拍跃迁的电子
  atom(N, pos, col) {
    const r = rng(22);
    const radii = [1.0, 1.75, 2.5];
    const role = new Uint8Array(N);      // 0 核 1 轨道 2 电子 3 光子
    const ring = new Uint8Array(N);
    const a0 = new Float32Array(N);
    const off = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const roll = r();
      if (roll < 0.1) {
        role[i] = 0;
        const s = 0.16;
        set(off, i, gauss(r) * s, gauss(r) * s, gauss(r) * s);
        const c = lerp3(C.white, [1, 0.9, 0.8], r());
        set(col, i, c[0] * 0.12, c[1] * 0.12, c[2] * 0.12);
      } else if (roll < 0.82) {
        role[i] = 1;
        const w = r() * (radii[0] + radii[1] + radii[2]);
        ring[i] = w < radii[0] ? 0 : w < radii[0] + radii[1] ? 1 : 2;
        a0[i] = r() * Math.PI * 2;
        set(off, i, gauss(r) * 0.012, gauss(r) * 0.012, gauss(r) * 0.012);
        const c = lerp3(C.ice, C.white, 0.2 + r() * 0.3);
        set(col, i, c[0] * 0.16, c[1] * 0.16, c[2] * 0.16);
      } else if (roll < 0.95) {
        role[i] = 2;
        const s = 0.09;
        set(off, i, gauss(r) * s, gauss(r) * s, gauss(r) * s);
        set(col, i, 0.07, 0.09, 0.12);
      } else {
        role[i] = 3;
        a0[i] = r() * Math.PI * 2;
        set(off, i, r(), gauss(r) * 0.02, 0);
        const c = C.ice;
        set(col, i, c[0] * 0.5, c[1] * 0.5, c[2] * 0.5);
      }
    }

    // 电子每拍跃迁一次：1→2→3→1…，跃迁本身用 0.25 拍完成
    return function update(ctx) {
      const beat = ctx.beat * 2;   // 每半拍跃迁一次
      const k = Math.floor(beat);
      const f = clamp((beat - k) / 0.25);
      const from = radii[((k - 1) % 3 + 3) % 3], to = radii[(k % 3 + 3) % 3];
      const er = from + (to - from) * smooth(f);
      const ea = ctx.t * 2.4;
      const ex = Math.cos(ea) * er, ey = Math.sin(ea) * er;
      // 向低能级跃迁时放出一圈光子
      const emitting = to < from;
      const pr = emitting ? 0.2 + (beat - k) * 3.2 : 0;
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        switch (role[i]) {
          case 0: pos[o] = off[o]; pos[o + 1] = off[o + 1]; pos[o + 2] = off[o + 2]; break;
          case 1: {
            const rr = radii[ring[i]];
            const a = a0[i] + ctx.t * 0.05 * (3 - ring[i]);
            pos[o] = Math.cos(a) * rr + off[o]; pos[o + 1] = Math.sin(a) * rr + off[o + 1]; pos[o + 2] = off[o + 2];
            break;
          }
          case 2: pos[o] = ex + off[o]; pos[o + 1] = ey + off[o + 1]; pos[o + 2] = off[o + 2]; break;
          case 3: {
            if (emitting) {
              const rr = pr + off[o] * 0.1;
              pos[o] = ex + Math.cos(a0[i]) * rr; pos[o + 1] = ey + Math.sin(a0[i]) * rr; pos[o + 2] = off[o + 1];
            } else {
              pos[o] = ex + off[o + 1]; pos[o + 1] = ey + off[o + 1]; pos[o + 2] = 0;
            }
          }
        }
      }
    };
  },
};
