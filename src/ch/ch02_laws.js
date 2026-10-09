// 第 2 章 定律：苹果下落 → 行星轨道 → 电场线 → 双缝干涉 → E = mc²
import { shape } from '../shapes/index.js';
import { range, steps, lerp, seq } from '../util.js';
import { cam, lerpCam, orbit, cut, T, RY, mul } from './helpers.js';

const GROUND = -2.4;
// 0–1.5 拍成形，1.5–3 拍悬停，3–6 拍自由落体（加速），第 6 拍落地
const appleY = (lb) => (lb < 3 ? 2 : lb < 6 ? 2 - (2 - GROUND) * Math.pow((lb - 3) / 3, 2) : GROUND);
const front = cam([0, 0, 10]);

export default {
  shots: {
    // 2-1 苹果下落，落地变成行星；镜头跟随下摇，落地瞬间闪白震动
    '2-1': (f) => {
      const y = appleY(f.lb);
      const appleM = mul(T(0, y, 0), RY(f.t * 1.4));
      const follow = cam([Math.sin(f.lb * 0.5) * 1.5, y * 0.8 + 0.6, 6.5], [0, y, 0]);
      return seq(f.lb, [
        [1.5, (lb) => ({ from: shape('atom'), to: shape('apple'), matB: appleM, p: range(lb, 0, 1), stagger: 0.1, noise: 0.6, cam: follow })],
        [4.5, () => ({ from: shape('apple'), matA: appleM, noise: 0, cam: follow })],
        [6, (lb) => ({
          from: shape('apple'), matA: appleM, to: shape('sphere'), matB: T(0, GROUND, 0),
          p: range(lb, 0, 0.6), stagger: 0.05, noise: 0.5, energy: 1.5,
          flash: Math.exp(-lb * 5) * 0.45,
          cam: cut(Math.floor(lb / 2), [
            cam([0, GROUND + 0.4, 4.5], [0, GROUND, 0], 45),
            orbit(lb * 0.3, 3.5, 1.2, [0, GROUND, 0], 50),
            cam([2.5, GROUND + 2.5, 3], [0, GROUND, 0], 40),
          ]),
        })],
      ]);
    },

    // 2-2 行星绕日，椭圆轨道带拖尾；俯视旋转，每小节换机位
    '2-2': (f) => ({
      from: shape('sphere'),
      matA: T(0, GROUND, 0),
      to: shape('orbits'),
      p: steps(f.lb, 0, 2),
      stagger: 0.2,
      noise: 0.8,
      cam: cut(f.bar, [
        orbit(f.lb * 0.15, 4.5, 9),
        orbit(1 + f.lb * 0.2, 7, 1.0, [0, 0, 0], 45),
        orbit(3 - f.lb * 0.15, 3, 4.5),
      ]),
    }),

    // 2-3 轨道展开成电磁场力线；镜头快速侧移
    '2-3': (f) => ({
      from: shape('orbits'),
      to: shape('field'),
      p: steps(f.lb, 0, 2),
      stagger: 0.2,
      noise: 0.9,
      cam: cut(f.bar, [
        cam([lerp(-3.5, 3.5, f.p), 0.8, 7], [lerp(-1.2, 1.2, f.p), 0, 0]),
        orbit(1.57 + f.lb * 0.1, 4.5, 0.3, [-1.3, 0, 0], 50),
      ]),
    }),

    // 2-4 双缝干涉条纹，最后一拍闪出 E=mc² 字形
    '2-4': (f) =>
      seq(f.lb, [
        [6, (lb) => ({
          from: shape('field'), to: shape('slits'), p: steps(lb, 0, 2), stagger: 0.2, noise: 0.7,
          cam: lb < 3 ? cam([lerp(0, 1.5, lb / 3), 0, 6], [1.5, 0, 0], 45) : cam([0, 0, lerp(11, 9.5, (lb - 3) / 3)]),
        })],
        [2, (lb) => ({
          from: shape('slits'), to: shape('text', { str: 'E = mc²', width: 7 }),
          p: range(lb, 0, 0.5), stagger: 0.1, noise: 0.5, energy: 1.6,
          flash: Math.exp(-lb * 6) * 0.5, cam: cam([0, 0, lerp(10, 8.5, lb / 2)]),
        })],
      ]),
  },
  log: {
    '2-1': [[0, 'apple = Object(m=0.1)'], [3, 'F = ma'], [6, 'g = 9.81 m/s²']],
    '2-2': [[0, 'F = Gm₁m₂/r²'], [4, 'T² ∝ a³'], [8, 'orbit.stable() → True']],
    '2-3': [[0, '∇·E = ρ/ε₀'], [4, '∇×B = μ₀J + μ₀ε₀∂E/∂t']],
    '2-4': [[0, 'ψ = ψ₁ + ψ₂'], [3, 'P(x) = |ψ|²'], [6, 'E = mc²', { cps: 40 }]],
  },
};
