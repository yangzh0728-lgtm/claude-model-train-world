// 第 1 章 原初：大爆炸 → 冷却成旋涡星云 → 收缩成玻尔原子
import { shape } from '../shapes/index.js';
import { range, smooth, expoOut, lerp } from '../util.js';
import { cam, lerpCam, orbit, RY } from './helpers.js';

const nebulaSpin = (t) => RY(-t * 0.12);
const orbitEnd = orbit(0.4 + Math.PI * 0.5, 11, 4.5);

export default {
  shots: {
    // 1-1 亮点在第一拍大爆炸，镜头快速拉远
    '1-1': (f) => ({
      from: shape('point'),
      to: shape('bang'),
      p: range(f.lb, 0, 8),
      ease: 'expoOut',
      stagger: 0.08,
      noise: 0.5,
      flash: Math.exp(-f.lb * 2.2) * 0.6,
      cam: lerpCam(cam([0, 0, 6]), orbit(0.4, 14, 1.5), expoOut(range(f.lb, 0, 3))),
    }),

    // 1-2 冷却成旋涡星云，镜头绕星云环绕
    '1-2': (f) => ({
      from: shape('bang'),
      to: shape('nebula'),
      matB: nebulaSpin(f.t),
      p: range(f.lb, 0, 11),
      stagger: 0.45,
      noise: 1.4,
      cam: lerpCam(orbit(0.4, 14, 1.5), orbit(0.4 + Math.PI * 0.5 * f.p, 11, 4.5), smooth(range(f.lb, 0, 6))),
    }),

    // 1-3 星云收缩成玻尔原子，电子按拍跃迁，镜头推近
    '1-3': (f) => ({
      from: shape('nebula'),
      matA: nebulaSpin(f.t),
      to: shape('atom'),
      p: range(f.lb, 0, 6),
      stagger: 0.35,
      noise: 0.9,
      pulse: f.lb > 6 ? Math.exp(-(f.beat % 1) * 6) * 0.35 : 0,
      cam: lerpCam(orbitEnd, cam([0, 0, lerp(8.5, 7, smooth(range(f.lb, 6, 12)))]), smooth(range(f.lb, 0, 6))),
    }),
  },
  log: {
    '1-1': [[0, 'epoch 001  loss 9.81'], [4, 'expand(t=1e-36 s)']],
    '1-2': [[1, (e) => `cooling... T = ${(2.7 + 2997 * Math.exp(-e * 0.45)).toFixed(1)}K`]],
    '1-3': [[2, 'H: 1s¹'], [7, 'e⁻: n=1 → n=2 → n=3']],
  },
};
