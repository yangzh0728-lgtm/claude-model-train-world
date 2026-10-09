// 经典物理：苹果、行星轨道、电场线、双缝干涉
import { rng, gauss, lerp3, clamp } from '../util.js';
import { C } from '../palette.js';

function set(arr, i, x, y, z) { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; }

export default {
  // 苹果：变形的球壳 + 果柄 + 叶子，中心在原点、高约 1.9
  apple(N, pos, col) {
    const r = rng(31);
    for (let i = 0; i < N; i++) {
      const roll = r();
      if (roll < 0.86) {
        const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        let x = s * Math.cos(a), y = u, z = s * Math.sin(a);
        const rho = Math.sqrt(x * x + z * z);
        const widen = 1 + 0.12 * y;
        x *= widen; z *= widen;
        y *= 0.88;
        if (y > 0) y -= 0.32 * Math.exp(-(rho * rho) / 0.06);
        else y += 0.14 * Math.exp(-(rho * rho) / 0.04);
        const k = 1 + gauss(r) * 0.006;
        set(pos, i, x * k, y * k, z * k);
        const shade = 0.55 + 0.45 * clamp(0.5 + 0.5 * (x * -0.5 + y * 0.6 + z * 0.6));
        const c = lerp3(C.red, [1, 0.8, 0.75], r() < 0.12 ? 0.8 : 0.1);
        set(col, i, c[0] * 0.07 * shade, c[1] * 0.07 * shade, c[2] * 0.07 * shade);
      } else if (roll < 0.9) {
        const t = r();
        set(pos, i, 0.12 * t * t + gauss(r) * 0.012, 0.5 + 0.5 * t, gauss(r) * 0.012);
        set(col, i, 0.2, 0.13, 0.07);
      } else {
        // 叶子：斜挂在果柄上的椭圆
        let lx, ly;
        do { lx = r() * 2 - 1; ly = r() * 2 - 1; } while (lx * lx + ly * ly > 1);
        const L = 0.32, W = 0.13;
        const px = 0.08 + (lx + 1) * L, py = 0.92 + (lx + 1) * L * 0.45 + ly * W, pz = ly * W * 0.5;
        set(pos, i, px, py, pz);
        const c = C.life;
        set(col, i, c[0] * 0.12, c[1] * 0.12, c[2] * 0.12);
      }
    }
  },

  // 太阳 + 三颗沿开普勒椭圆轨道运动的行星，带拖尾；轨道在 xz 平面
  orbits(N, pos, col) {
    const r = rng(32);
    const planets = [
      { a: 1.5, e: 0.25, size: 0.11, c: C.ice, phase: 0.3 },
      { a: 2.5, e: 0.4, size: 0.16, c: C.white, phase: 2.1 },
      { a: 3.7, e: 0.12, size: 0.13, c: C.deep, phase: 4.0 },
    ];
    for (const p of planets) { p.b = p.a * Math.sqrt(1 - p.e * p.e); p.n = 1.6 / Math.pow(p.a, 1.5); }
    const role = new Uint8Array(N), pl = new Uint8Array(N), s = new Float32Array(N), off = new Float32Array(N * 3);
    const base = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const roll = r();
      const k = (r() * 3) | 0;
      pl[i] = k;
      const P = planets[k];
      let c, b;
      if (roll < 0.22) {
        role[i] = 0; const sz = 0.32;
        set(off, i, gauss(r) * sz, gauss(r) * sz, gauss(r) * sz);
        c = lerp3(C.gold, C.white, r() * 0.6); b = 0.12;
      } else if (roll < 0.36) {
        role[i] = 1;
        set(off, i, gauss(r) * P.size, gauss(r) * P.size, gauss(r) * P.size);
        c = P.c; b = 0.3;
      } else if (roll < 0.8) {
        role[i] = 2; s[i] = Math.pow(r(), 1.4);
        set(off, i, gauss(r) * 0.02, gauss(r) * 0.02, gauss(r) * 0.02);
        c = P.c; b = 0.45 * (1 - s[i]) + 0.04;
      } else {
        role[i] = 3; s[i] = r() * Math.PI * 2;
        set(off, i, gauss(r) * 0.01, gauss(r) * 0.01, gauss(r) * 0.01);
        c = P.c; b = 0.07;
      }
      set(base, i, c[0] * b, c[1] * b, c[2] * b);
    }
    col.set(base);

    const kepler = (P, M) => {
      let E = M;
      for (let it = 0; it < 4; it++) E -= (E - P.e * Math.sin(E) - M) / (1 - P.e * Math.cos(E));
      return [P.a * (Math.cos(E) - P.e), P.b * Math.sin(E)];
    };
    return function update(ctx) {
      const t = ctx.t;
      const heads = planets.map((P) => kepler(P, P.phase + P.n * t));
      for (let i = 0; i < N; i++) {
        const o = i * 3, P = planets[pl[i]];
        let x = 0, z = 0;
        if (role[i] === 1) [x, z] = heads[pl[i]];
        else if (role[i] === 2) [x, z] = kepler(P, P.phase + P.n * t - s[i] * 1.7);
        else if (role[i] === 3) { x = P.a * (Math.cos(s[i]) - P.e); z = P.b * Math.sin(s[i]); }
        pos[o] = x + off[o]; pos[o + 1] = off[o + 1]; pos[o + 2] = z + off[o + 2];
      }
    };
  },

  // 电偶极子的电场线（绕 x 轴对称），粒子沿力线从正电荷流向负电荷
  field(N, pos, col) {
    const r = rng(33);
    const q = 1.3;
    const E = (x, y) => {
      const dx1 = x + q, dx2 = x - q;
      const r1 = Math.pow(dx1 * dx1 + y * y, 1.5), r2 = Math.pow(dx2 * dx2 + y * y, 1.5);
      return [dx1 / r1 - dx2 / r2, y / r1 - y / r2];
    };
    const lines = [];
    const m = 14;
    for (let j = 0; j < m; j++) {
      const a = ((j + 0.5) / m) * Math.PI;
      let x = -q + Math.cos(a) * 0.12, y = Math.sin(a) * 0.12;
      const pts = [[x, y]], len = [0];
      for (let step = 0; step < 1500; step++) {
        const [ex, ey] = E(x, y);
        const l = Math.hypot(ex, ey) || 1;
        const h = 0.015;
        x += (ex / l) * h; y += (ey / l) * h;
        pts.push([x, y]); len.push(len[len.length - 1] + h);
        if (Math.hypot(x - q, y) < 0.1 || Math.hypot(x, y) > 7) break;
      }
      lines.push({ pts, len, total: len[len.length - 1] });
    }
    const planes = 7;
    const totalLen = lines.reduce((s, l) => s + l.total, 0);
    const role = new Uint8Array(N), li = new Uint16Array(N), u = new Float32Array(N), rot = new Float32Array(N), off = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const roll = r();
      let c, b;
      if (roll < 0.16) {
        role[i] = roll < 0.08 ? 0 : 1;
        const sz = 0.13;
        set(off, i, gauss(r) * sz, gauss(r) * sz, gauss(r) * sz);
        c = role[i] === 0 ? [1, 0.9, 0.8] : C.ice; b = 0.14;
      } else {
        role[i] = 2;
        let w = r() * totalLen, k = 0;
        while (k < lines.length - 1 && w > lines[k].total) { w -= lines[k].total; k++; }
        li[i] = k; u[i] = r(); rot[i] = (((r() * planes) | 0) / planes) * Math.PI + gauss(r) * 0.01;
        set(off, i, gauss(r) * 0.01, gauss(r) * 0.01, gauss(r) * 0.01);
        c = lerp3(C.ice, C.white, r() * 0.4); b = 0.2;
      }
      set(col, i, c[0] * b, c[1] * b, c[2] * b);
    }
    const sample = (L, d) => {
      const { pts, len } = L;
      let lo = 0, hi = len.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (len[mid] <= d) lo = mid; else hi = mid; }
      const f = (d - len[lo]) / (len[hi] - len[lo] || 1);
      return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f];
    };
    return function update(ctx) {
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        if (role[i] < 2) {
          pos[o] = (role[i] === 0 ? -q : q) + off[o]; pos[o + 1] = off[o + 1]; pos[o + 2] = off[o + 2];
          continue;
        }
        const L = lines[li[i]];
        const d = ((u[i] + ctx.t * 0.9 / L.total) % 1) * L.total;
        const [x, y] = sample(L, d);
        const a = rot[i];
        pos[o] = x + off[o]; pos[o + 1] = y * Math.cos(a) + off[o + 1]; pos[o + 2] = y * Math.sin(a) + off[o + 2];
      }
    };
  },

  // 双缝干涉：左侧平面波，挡板上两条缝，右侧两组圆形波叠加，最右边是屏上的明暗条纹
  slits(N, pos, col) {
    const r = rng(34);
    const wall = -1.2, screen = 3.9, d = 0.55, gap = 0.12, H = 3.2;
    const lambda = 0.42, k = (2 * Math.PI) / lambda, speed = 1.0, omega = k * speed;
    const role = new Uint8Array(N), base = new Float32Array(N * 3);
    const intensity = (y) => {
      const r1 = Math.hypot(screen - wall, y - d), r2 = Math.hypot(screen - wall, y + d);
      const env = Math.exp(-(y * y) / 8);
      return env * (1 + Math.cos(k * (r1 - r2))) / 2;
    };
    for (let i = 0; i < N; i++) {
      const roll = r();
      let x, y, z = 0, c = C.ice, b = 0.3;
      if (roll < 0.18) { role[i] = 0; x = -5.5 + r() * (wall + 5.5); y = (r() * 2 - 1) * H; }
      else if (roll < 0.25) {
        role[i] = 1; x = wall + gauss(r) * 0.02;
        do { y = (r() * 2 - 1) * H; } while (Math.abs(Math.abs(y) - d) < gap);
        c = C.white; b = 0.18;
      } else if (roll < 0.8) { role[i] = 2; x = wall + r() * (screen - wall - 0.15); y = (r() * 2 - 1) * H; }
      else {
        role[i] = 3;
        do { y = (r() * 2 - 1) * H; } while (r() > intensity(y));
        x = screen + r() * 0.25; z = gauss(r) * 0.02; c = C.white; b = 0.16;
      }
      set(pos, i, x, y, z);
      set(base, i, c[0] * b, c[1] * b, c[2] * b);
    }
    col.set(base);
    return function update(ctx) {
      const t = ctx.t;
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        if (role[i] === 0 || role[i] === 2) {
          const x = pos[o], y = pos[o + 1];
          let amp;
          if (role[i] === 0) amp = Math.cos(k * x - omega * t);
          else {
            const r1 = Math.hypot(x - wall, y - d), r2 = Math.hypot(x - wall, y + d);
            amp = 0.5 * (Math.cos(k * r1 - omega * t) / Math.sqrt(0.6 + r1) + Math.cos(k * r2 - omega * t) / Math.sqrt(0.6 + r2)) * 1.6;
          }
          pos[o + 2] = amp * 0.18;
          const v = Math.max(0, amp);
          const b = 0.03 + 0.4 * v * v;
          col[o] = C.ice[0] * b; col[o + 1] = C.ice[1] * b; col[o + 2] = C.ice[2] * b;
        }
      }
    };
  },
};
