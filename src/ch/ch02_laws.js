// 第 2 章 定律：苹果 → 抛物线 → 简谐振动 → 开普勒轨道 → 棱镜 → 电场线 → 电磁波 → 双缝 → E = mc²
import { shape } from '../shapes/index.js';
import { range, lerp, seq } from '../util.js';
import { cam, orbit, cut, morph, T, RY, mul } from './helpers.js';

const GROUND = -2.4;
// 0–1 拍成形，1–3 拍自由落体（加速），第 3 拍落地
const appleY = (lb) => (lb < 1 ? 2 : lb < 3 ? 2 - (2 - GROUND) * Math.pow((lb - 1) / 2, 2) : GROUND);

export default {
  shots: {
    // 2a 苹果下落，落地炸开
    '2a': (f) => {
      const y = appleY(f.lb);
      const appleM = mul(T(0, y, 0), RY(f.t * 1.4));
      const follow = cam([Math.sin(f.lb * 0.5) * 1.5, y * 0.8 + 0.6, 6.5], [0, y, 0]);
      return seq(f.lb, [
        [3, (lb) => ({ ...morph(f, shape('apple'), { dur: 0.8, stagger: 0.1, noise: 0.6 }), matB: appleM, p: range(lb, 0, 0.8), cam: follow })],
        [1, (lb) => ({
          from: shape('apple'), matA: appleM, to: shape('sphere'), matB: T(0, GROUND, 0), p: range(lb, 0, 0.4),
          stagger: 0.05, noise: 1.2, energy: 1.5, flash: Math.exp(-lb * 5) * 0.45, cam: cam([0, GROUND + 0.4, 4.5], [0, GROUND, 0], 45),
        })],
      ]);
    },

    // 2b 一束抛物线轨迹按拍扇形展开
    '2b': (f) => ({ ...morph(f, shape('parabolas'), { dur: 0.6, stagger: 0.1, noise: 0.4 }), fromP: 1, cam: cam([lerp(0.6, -0.4, f.p), 0, 8.5]) }),

    // 2c 相空间里的圆展开成余弦波
    '2c': (f) => ({ ...morph(f, shape('phase'), { dur: 0.75, stagger: 0.15, noise: 0.5 }), cam: cam([0.8, 0, lerp(9.5, 8.5, f.p)], [0.8, 0, 0]) }),

    // 2d 开普勒椭圆轨道
    '2d': (f) => ({
      ...morph(f, shape('orbits'), { dur: 1, stagger: 0.2, noise: 0.8 }),
      cam: cut(f.bar, [orbit(f.lb * 0.15, 4.5, 9), orbit(1 + f.lb * 0.2, 7, 1.0, [0, 0, 0], 45)]),
    }),

    // 2e 白光穿过棱镜散成光谱
    '2e': (f) => ({ ...morph(f, shape('prism'), { dur: 0.75, stagger: 0.2, noise: 0.5 }), cam: cam([lerp(-0.5, 0.5, f.p), 0, 9]) }),

    // 2f 电偶极子电场线
    '2f': (f) => ({ ...morph(f, shape('field'), { dur: 0.75, stagger: 0.2, noise: 0.8 }), cam: cam([lerp(-3.5, 3.5, f.p), 0.8, 7], [lerp(-1.2, 1.2, f.p), 0, 0]) }),

    // 2g 电磁波
    '2g': (f) => ({ ...morph(f, shape('emwave'), { dur: 0.75, stagger: 0.15, noise: 0.6 }), cam: orbit(-0.6 + f.lb * 0.12, 8.5, 2.8) }),

    // 2h 双缝干涉
    '2h': (f) => ({ ...morph(f, shape('slits'), { dur: 0.75, stagger: 0.2, noise: 0.6 }), cam: cam([0, 0, lerp(10.5, 9.5, f.p)]) }),

    // 2i 闪出 E = mc²
    '2i': (f) => ({
      ...morph(f, shape('text', { str: 'E = mc²', width: 7 }), { dur: 0.5, stagger: 0.1, noise: 0.5 }), energy: 1.6,
      flash: Math.exp(-f.lb * 6) * 0.5, cam: cam([0, 0, lerp(10, 8.5, f.p)]),
    }),
  },
  log: {
    '2a': [[0, 'F = ma'], [3, 'g = 9.81 m/s²', { cps: 40 }]],
    '2b': [[0, 'y = x·tanθ − gx²/(2v²cos²θ)', { cps: 40 }]],
    '2c': [[0, 'x = A·cos(ωt)']],
    '2d': [[0, 'T² ∝ a³'], [4, 'F = Gm₁m₂/r²']],
    '2e': [[0, 'n(λ) = A + B/λ²']],
    '2f': [[0, '∇·E = ρ/ε₀']],
    '2g': [[0, 'c = 1/√(μ₀ε₀)']],
    '2h': [[0, 'P(x) = |ψ₁ + ψ₂|²']],
    '2i': [[0, 'E = mc²', { cps: 40 }]],
  },
};
