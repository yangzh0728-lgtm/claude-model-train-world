// 第 2 章 定律：苹果下落 → 行星轨道 → 电场线 → 双缝干涉 → E = mc²
import { shape } from '../shapes/index.js';
import { range, smooth, lerp, seq } from '../util.js';
import { cam, lerpCam, orbit, T, RY, mul } from './helpers.js';

const GROUND = -2.4;
const appleY = (lb) => (lb < 3 ? 2 : lb < 9 ? 2 - (2 - GROUND) * Math.pow((lb - 3) / 6, 2) : GROUND);
const topView = (lb) => orbit(lb * 0.07, 4.5, 9);
const sideView = (p) => cam([lerp(-3.2, 3.2, p), 0.8, 8], [lerp(-1.2, 1.2, p), 0, 0]);
const front = cam([0, 0, 10]);

export default {
  shots: {
    // 2-1 苹果下落，落地变成行星；镜头跟随下摇
    '2-1': (f) => {
      const y = appleY(f.lb);
      const appleM = mul(T(0, y, 0), RY(f.t * 0.6));
      const follow = cam([0, y * 0.85 + 0.4, 7], [0, y, 0]);
      const camera = lerpCam(cam([0, 0, 7]), follow, smooth(range(f.lb, 0, 3)));
      return seq(f.lb, [
        [3, (lb) => ({ from: shape('atom'), to: shape('apple'), matB: appleM, p: range(lb, 0, 3), stagger: 0.3, noise: 0.8, cam: camera })],
        [6, () => ({ from: shape('apple'), matA: appleM, noise: 0, cam: camera })],
        [3, (lb) => ({
          from: shape('apple'), matA: appleM, to: shape('sphere'), matB: T(0, GROUND, 0),
          p: range(lb, 0, 2.5), stagger: 0.2, noise: 0.4, flash: Math.exp(-lb * 4) * 0.25, cam: camera,
        })],
      ]);
    },

    // 2-2 行星绕日，椭圆轨道带拖尾；俯视旋转
    '2-2': (f) => ({
      from: shape('sphere'),
      matA: T(0, GROUND, 0),
      to: shape('orbits'),
      p: range(f.lb, 0, 5),
      stagger: 0.4,
      noise: 0.8,
      cam: lerpCam(cam([0, GROUND * 0.85 + 0.4, 7], [0, GROUND, 0]), topView(f.lb), smooth(range(f.lb, 0, 5))),
    }),

    // 2-3 轨道展开成电磁场力线；镜头侧移
    '2-3': (f) => ({
      from: shape('orbits'),
      to: shape('field'),
      p: range(f.lb, 0, 4),
      stagger: 0.4,
      noise: 0.9,
      cam: lerpCam(topView(12), sideView(f.p), smooth(range(f.lb, 0, 3))),
    }),

    // 2-4 双缝干涉条纹，最后一拍闪出 E=mc² 字形
    '2-4': (f) =>
      seq(f.lb, [
        [6, (lb) => ({
          from: shape('field'), to: shape('slits'), p: range(lb, 0, 3), stagger: 0.35, noise: 0.7,
          cam: lerpCam(sideView(1), front, smooth(range(lb, 0, 2.5))),
        })],
        [2, (lb) => ({
          from: shape('slits'), to: shape('text', { str: 'E = mc²', width: 7 }),
          p: range(lb, 0, 1), stagger: 0.25, noise: 0.5, ease: 'expoOut',
          flash: lb > 1 ? Math.exp(-(lb - 1) * 5) * 0.5 : 0, cam: front,
        })],
      ]),
  },
  log: {
    '2-1': [[3, 'F = ma'], [8, 'g = 9.81 m/s²']],
    '2-2': [[1, 'F = Gm₁m₂/r²']],
    '2-3': [[0.5, '∇·E = ρ/ε₀']],
    '2-4': [[0.5, 'ψ = ψ₁ + ψ₂'], [6.5, 'E = mc²', { cps: 24 }]],
  },
};
