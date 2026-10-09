// 第 1 章 原初：大爆炸 → 暴胀 → 夸克 → CMB → 星系 → 核聚变 → 原子 → 周期表
import { shape } from '../shapes/index.js';
import { range, steps, expoOut, lerp } from '../util.js';
import { cam, lerpCam, orbit, cut, morph, RY, RX, S, mul } from './helpers.js';

const spin = (t) => RY(-t * 0.35);

export default {
  shots: {
    // 1a 大爆炸，镜头瞬间拉远
    '1a': (f) => ({
      from: shape('point'), to: shape('bang'), p: range(f.lb, 0, 2.5), stagger: 0.05, noise: 0.6, energy: 1.4,
      flash: Math.exp(-f.lb * 3) * 0.6,
      cam: lerpCam(cam([0, 0, 6]), orbit(0.4 + f.lb * 0.1, 13, 1.5), expoOut(range(f.lb, 0, 1))),
    }),

    // 1b 三维网格指数暴胀，镜头被网格穿过
    '1b': (f) => ({
      ...morph(f, shape('lattice'), { dur: 0.75, stagger: 0.1, noise: 0.5 }),
      matB: mul(RY(f.t * 0.3), S(0.35 * Math.pow(4.5, steps(f.lb, 0.5, 4)))),
      cam: cam([0.3, 0.4, 4.5], [0, 0, 0], 55),
    }),

    // 1c 夸克三三结合成重子
    '1c': (f) => ({ ...morph(f, shape('quarks'), { dur: 1, noise: 0.8 }), cam: orbit(f.lb * 0.15, 9, 1) }),

    // 1d 宇宙微波背景全天图
    '1d': (f) => ({
      ...morph(f, shape('cmb'), { dur: 1.5, stagger: 0.3, noise: 0.8 }),
      matB: RX(Math.sin(f.t * 0.6) * 0.15),
      cam: cut(f.bar, [cam([0, 0, lerp(8.5, 7.5, f.p)]), cam([2.5, -1.5, 4.5], [1.5, 0, 0], 50)]),
    }),

    // 1e 物质聚成三臂旋涡星系
    '1e': (f) => ({
      ...morph(f, shape('nebula'), { dur: 1.5, stagger: 0.2, noise: 1.2 }),
      matB: spin(f.t),
      cam: cut(f.bar, [orbit(f.lb * 0.15, 9.5, 4), orbit(2 + f.lb * 0.1, 5, 0.6, [1.2, 0, 0], 50)]),
    }),

    // 1f 恒星核心：四个氢核撞成氦核
    '1f': (f) => ({ ...morph(f, shape('fusion'), { dur: 0.5, noise: 0.6 }), energy: 1.3, cam: orbit(f.lb * 0.2, 8, 1.5) }),

    // 1g 玻尔原子，电子每半拍跃迁
    '1g': (f) => ({ ...morph(f, shape('atom'), { dur: 0.75, noise: 0.6 }), energy: 1.2, cam: cam([Math.sin(f.lb * 0.4), 0, lerp(7.5, 6.5, f.p)]) }),

    // 1h 元素周期表逐格点亮
    '1h': (f) => ({ ...morph(f, shape('periodic'), { dur: 0.75, stagger: 0.3, noise: 0.5 }), cam: cam([0, 0, lerp(7, 6.3, f.p)]) }),
  },
  log: {
    '1a': [[0, 'epoch 001  loss 9.81', { cps: 40 }], [2, 'expand(t=1e-36 s)']],
    '1b': [[0, 'a(t) ∝ e^{Ht}']],
    '1c': [[0, 'uud → p⁺   udd → n⁰']],
    '1d': [[0, (e) => `T = ${(2.725 + 2997 * Math.exp(-e * 1.5)).toFixed(3)} K`], [4, 'ΔT/T ~ 10⁻⁵']],
    '1e': [[0, 'gravity.collapse(gas)'], [4, 'stars: 1e11']],
    '1f': [[0, '4 ¹H → ⁴He + 2e⁺ + 2ν']],
    '1g': [[0, 'H: 1s¹  ΔE = 10.2 eV']],
    '1h': [[0, (e) => `Z = 1 … ${Math.min(118, Math.max(1, Math.round(118 * Math.min(1, (e / 4) * 1.15))))}`]],
  },
};
