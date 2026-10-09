// 第 1 章 原初：大爆炸 → 冷却成旋涡星云 → 收缩成玻尔原子
import { shape } from '../shapes/index.js';
import { range, steps, expoOut, lerp } from '../util.js';
import { cam, lerpCam, orbit, cut, RY } from './helpers.js';

const nebulaSpin = (t) => RY(-t * 0.35);

export default {
  shots: {
    // 1-1 亮点在第一拍大爆炸，镜头瞬间拉远；之后每拍物质云被再推一下
    '1-1': (f) => ({
      from: shape('point'),
      to: shape('bang'),
      p: range(f.lb, 0, 3),
      stagger: 0.05,
      noise: 0.6,
      energy: 1.4,
      flash: Math.exp(-f.lb * 3) * 0.6,
      cam: lerpCam(cam([0, 0, 6]), orbit(0.4 + f.lb * 0.08, 14 - f.lb * 0.3, 1.5), expoOut(range(f.lb, 0, 1))),
    }),

    // 1-2 两拍内冷却成旋涡星云；之后每小节硬切一个机位，镜头一直在转
    '1-2': (f) => ({
      from: shape('bang'),
      to: shape('nebula'),
      matB: nebulaSpin(f.t),
      p: steps(f.lb, 0, 3),
      stagger: 0.2,
      noise: 1.2,
      cam: f.lb < 4
        ? orbit(0.4 + f.lb * 0.15, lerp(11, 9, f.lb / 4), 3.5)
        : cut(f.bar, [
          orbit(f.lb * 0.12, 8, 5.5),
          orbit(2 + f.lb * 0.1, 5, 0.6, [1.2, 0, 0], 50),
          orbit(4 - f.lb * 0.12, 10, 1.8),
          cam([0, 11, 0.01], [0, 0, 0], 45),
        ]),
    }),

    // 1-3 两拍内收缩成玻尔原子，电子每半拍跃迁一次，镜头按拍推近
    '1-3': (f) => ({
      from: shape('nebula'),
      matA: nebulaSpin(f.t),
      to: shape('atom'),
      p: steps(f.lb, 0, 2),
      stagger: 0.15,
      noise: 0.8,
      energy: 1.2,
      cam: f.lb < 2 ? cam([0, 4, 9]) : cam([Math.sin(f.lb * 0.4) * 1.2, 0, lerp(8.5, 6, steps(f.lb, 2, 12))]),
    }),
  },
  log: {
    '1-1': [[0, 'epoch 001  loss 9.81', { cps: 40 }], [2, 'expand(t=1e-36 s)'], [4, 'inflate(x1e26)'], [8, 'quarks.bind() → p⁺ n⁰']],
    '1-2': [[0, (e) => `cooling... T = ${(2.7 + 2997 * Math.exp(-e * 0.9)).toFixed(1)}K`], [6, 'gravity.collapse(gas)'], [10, 'stars: 1e11']],
    '1-3': [[1, 'H: 1s¹'], [3, (e) => `e⁻: n=${1 + (Math.floor(e * 2) % 3)}  ΔE = ${(13.6 * (1 - 1 / Math.pow(1 + (Math.floor(e * 2) % 3), 2))).toFixed(2)} eV`]],
  },
};
