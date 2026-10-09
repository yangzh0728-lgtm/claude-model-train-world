// 第 7 章 崩溃：过拟合 → 训练/验证分叉 → 梯度爆炸 → NaN → 六指手 → 拼错的字 → 闪回 → 塌缩 → 黑
import { shape } from '../shapes/index.js';
import { range, lerp, steps, expoOut } from '../util.js';
import { cam, orbit, cut, morph, T, RY, RX, RZ, mul, S } from './helpers.js';

// 每拍开头一下故障，越往后越重
const jolt = (f, base, k = 0.6) => base + k * Math.exp(-(f.lb % 1) * 6);

const FLASH = [['nebula'], ['atom'], ['dna'], ['eye'], ['abacus'], ['chip'], ['globe'], ['mlp']];

export default {
  shots: {
    // 7a 小球冲过谷底，飞上对面的坡
    '7a': (f) => ({
      ...morph(f, shape('landscape', { overshoot: true }), { dur: 0.6, stagger: 0.2, noise: 0.6 }),
      cam: orbit(0.9 + f.lb * 0.08, 10.5, 5, [0, -0.6, 0]), glitch: jolt(f, 0.05, 0.25), rgb: 0.003,
    }),

    // 7b 训练损失继续降，验证损失掉头往上
    '7b': (f) => ({ ...morph(f, shape('losscurve', { val: true }), { dur: 0.5, stagger: 0.2, noise: 0.5 }), cam: cam([0.2, 0, 10], [0.2, 0, 0]), glitch: jolt(f, 0.05, 0.3) }),

    // 7c 梯度爆炸：每拍放大一级，粒子飞向无穷远
    '7c': (f) => {
      const prev = f.prev();
      const k = Math.pow(2.4, steps(f.lb, 0, 4));
      return {
        from: prev.shape, matA: prev.mat, to: prev.shape, matB: mul(S(k), RZ(steps(f.lb, 0, 4) * 0.3)), p: 1,
        noise: 0.6 + f.lb * 0.8, energy: 1.6, cam: cam([0.2, 0, 10], [0.2, 0, 0], 40 + f.lb * 4), glitch: jolt(f, 0.15, 0.5), rgb: 0.004,
      };
    },

    // 7d 浮点比特乱翻，定格在 NaN
    '7d': (f) => ({ ...morph(f, shape('floatbits'), { dur: 0.4, stagger: 0.2, noise: 0.6 }), energy: 1.4, cam: cam([0, -0.2, lerp(10, 9.2, f.p)], [0, -0.2, 0]), glitch: jolt(f, 0.1, 0.5) }),

    // 7e 六根手指的手
    '7e': (f) => ({ ...morph(f, shape('hand', { fingers: 6, color: 'magenta' }), { dur: 0.6, stagger: 0.25, noise: 0.6 }), cam: cam([lerp(-0.6, 0.6, f.p), 0, 11], [0, 0.4, 0]), glitch: jolt(f, 0.05, 0.3) }),

    // 7f hello, wrold
    '7f': (f) => ({ ...morph(f, shape('typo'), { dur: 0.4, stagger: 0.15, noise: 0.5 }), cam: cam([0, 0, lerp(9, 8.2, f.p)]), glitch: jolt(f, 0.08, 0.4) }),

    // 7g 前面的形态块状错位、每半拍闪回一个
    '7g': (f) => {
      const k = Math.floor(f.lb * 2), sh = FLASH[k % FLASH.length][0];
      const prevSh = k === 0 ? f.prev().shape : shape(FLASH[(k - 1) % FLASH.length][0]);
      return {
        from: prevSh, to: shape(sh), p: Math.min(1, ((f.lb * 2) % 1) / 0.25), stagger: 0.05, noise: 1.2, energy: 1.5,
        matB: RY(k * 0.7), cam: cam([0, 0, 11]), glitch: 0.55 + 0.4 * Math.exp(-((f.lb * 2) % 1) * 4), rgb: 0.008,
      };
    },

    // 7h 全部塌缩成一个点
    '7h': (f) => ({ ...morph(f, shape('point'), { dur: 3.6, stagger: 0.1, noise: 0.3 }), ease: 'in', energy: 0.4, cam: cam([0, 0, 11]), glitch: Math.max(0, 0.4 - f.lb * 0.12) }),

    // 7i 黑屏一拍
    '7i': (f) => ({ from: shape('point'), opacity: lerp(1, 0, Math.min(1, f.lb * 4)), energy: 0, cam: cam([0, 0, 11]) }),
  },
  log: {
    '7a': [[0, 'WARNING: overfitting', { cps: 40 }]],
    '7b': [[0, 'val_loss ↑']],
    '7c': [[0, '‖∇L‖ → ∞'], [2, (e) => `‖∇L‖ = ${Math.pow(10, 2 + Math.floor(e) * 9).toExponential(1)}`]],
    '7d': [[0, '0x7FC00000 = NaN']],
    '7e': [[0, 'confidence: 0.99']],
    '7f': [[0, 'hello, wrold']],
    '7g': [[0, 'loss NaN'], [1, 'loss NaN'], [2, 'loss NaN'], [3, 'loss NaN']],
    '7h': [[0, 'reset();']],
    '7i': [],
  },
};
