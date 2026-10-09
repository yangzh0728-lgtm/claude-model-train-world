// 第 6 章 学习：感知机 → XOR → 激活函数 → 多层网络前向 → 反向传播 → MNIST → 卷积 → 损失曲面 → t-SNE → 损失曲线
import { shape } from '../shapes/index.js';
import { range, lerp, seq, expoOut } from '../util.js';
import { cam, orbit, cut, morph, lerpCam, T, RY, RX, mul, S } from './helpers.js';

export default {
  shots: {
    // 6a 网格收成一个感知机
    '6a': (f) => ({ ...morph(f, shape('perceptron'), { dur: 1, stagger: 0.3, noise: 0.6 }), cam: cam([lerp(-0.6, 0.6, f.p), 0, 9.5], [0.3, 0, 0]) }),

    // 6b XOR 分不开（纸面插图）
    '6b': (f) => ({
      ...morph(f, shape('xor'), { dur: 0.5, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: mul(T(0, 1.15, 0), S(0.8)),
      cam: cam([0, 0, 11.5]), titleY: 990,
    }),

    // 6c 激活函数（纸面插图）
    '6c': (f) => ({
      ...morph(f, shape('activation'), { dur: 0.5, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: T(0, 0.7, 0),
      cam: cam([0, 0, 10.5]), titleY: 980,
    }),

    // 6d 副歌：炸开，重组成 5 层网络，信号每拍前向流过
    '6d': (f) => seq(f.lb, [
      [0.5, (lb) => ({ from: f.prev().shape, matA: f.prev().mat, to: shape('bang'), p: range(lb, 0, 0.5), stagger: 0.05, noise: 1.2, energy: 1.6, flash: Math.exp(-lb * 6) * 0.6, cam: cam([0, 0, 11]) })],
      [7.5, (lb) => ({
        from: shape('bang'), to: shape('mlp'), p: range(lb, 0, 1.2), stagger: 0.25, noise: 0.8, energy: 1.3,
        matB: RY(Math.sin(f.t * 0.4) * 0.35),
        cam: cut(f.bar, [cam([0, 0.3, lerp(12, 10.5, range(lb, 0, 3.5))]), orbit(0.7 + lb * 0.05, 8, 1.5, [1, 0, 0], 45)]),
      })],
    ]),

    // 6e 反向传播
    '6e': (f) => ({ from: shape('mlp'), to: shape('mlp', { backward: true }), p: range(f.lb, 0, 0.3), noise: 0.4, energy: 1.2, matA: RY(Math.sin(f.t * 0.4) * 0.35), matB: RY(Math.sin(f.t * 0.4) * 0.35), cam: orbit(-0.6 - f.lb * 0.05, 9, 1, [0, 0, 0], 45) }),

    // 6f MNIST 的 7
    '6f': (f) => ({ ...morph(f, shape('mnist'), { dur: 0.6, stagger: 0.3, noise: 0.6 }), cam: cam([0, 0, lerp(9.5, 9, f.p)], [-1.2, 0, 0]) }),

    // 6g 卷积（工程图纸）
    '6g': (f) => ({
      ...morph(f, shape('conv'), { dur: 0.5, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: T(0, -0.6, 0),
      cam: cam([0, 0, 11]), titleY: 250,
      notes: ['(I * K)(x, y) = Σ Σ I(x + i, y + j) · K(i, j)', 'Valid padding, stride 1: 8 × 8 → 6 × 6.', 'The same nine weights are shared at every position.'],
      block: { name: 'CONVOLUTION', sub: 'kernel 3 × 3 · stride 1 · no padding', scale: '36 MACs / map' },
    }),

    // 6h 损失曲面，小球沿梯度滚到谷底
    '6h': (f) => ({ ...morph(f, shape('landscape'), { dur: 1, stagger: 0.3, noise: 0.6 }), cam: cut(f.bar, [orbit(0.6 + f.lb * 0.06, 9, 4.5, [0, -0.6, 0]), orbit(2.2 + f.lb * 0.05, 7, 2.5, [0.8, -1, -0.3], 45)]) }),

    // 6i t-SNE
    '6i': (f) => ({ from: f.prev().shape, matA: f.prev().mat, to: shape('tsne'), p: range(f.lb, 0, 0.3), noise: 0.6, stagger: 0.1, matB: RY(f.t * 0.2), cam: cam([0, 0, 11.5]) }),

    // 6j 损失曲线
    '6j': (f) => ({ ...morph(f, shape('losscurve'), { dur: 0.5, stagger: 0.2, noise: 0.4 }), cam: cam([0.2, 0, lerp(10, 9.5, f.p)], [0.2, 0, 0]) }),
  },
  log: {
    '6a': [[0, 'y = σ(Wx + b)']],
    '6b': [[0, 'XOR: linearly inseparable']],
    '6c': [[0, 'max(0, z)']],
    '6d': [[0, 'forward()', { cps: 40 }], [4, '784 → 512 → 256 → 128 → 10']],
    '6e': [[0, 'loss.backward()']],
    '6f': [[0, 'argmax → 7']],
    '6g': [[0, '(I * K)(x, y)']],
    '6h': [[0, 'θ ← θ − η∇L'], [4, (e) => `loss ${(2.1 - Math.min(1, e / 4) * 1.6).toFixed(2)}`]],
    '6i': [[0, 't-SNE']],
    '6j': [[0, 'loss 0.42']],
  },
};
