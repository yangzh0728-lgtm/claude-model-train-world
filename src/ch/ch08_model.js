// 第 8 章 大模型：第一个词元 → 词向量 → 注意力 → 多头 → 位置编码 → Transformer 塔 → 词元瀑布 → 缩放定律 → 潜空间 → 扩散 → 公式环
import { shape } from '../shapes/index.js';
import { range, lerp, expoOut } from '../util.js';
import { cam, orbit, cut, morph, T, RY, RX, mul, S } from './helpers.js';

export default {
  shots: {
    // 8a 从点里蹦出第一个词元
    '8a': (f) => ({
      from: f.prev().shape, to: shape('text', { str: '"the"', width: 3.2 }), p: range(f.lb, 0, 0.6), stagger: 0.05, noise: 0.5, energy: 1.5,
      flash: Math.exp(-f.lb * 6) * 0.5, cam: cam([0, 0, lerp(9, 8, f.p)]),
    }),

    // 8b 词向量（纸面插图）
    '8b': (f) => ({
      ...morph(f, shape('embedding'), { dur: 0.6, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: mul(T(0, 0.75, 0), S(0.9)),
      cam: cam([0, 0, 11]), titleY: 990,
    }),

    // 8c 注意力热图
    '8c': (f) => ({ ...morph(f, shape('attention'), { dur: 0.6, stagger: 0.25, noise: 0.5 }), cam: cut(f.bar, [cam([0.4, 0, 8.5], [0.4, -0.3, 0]), cam([-1.6, 1.2, 5], [-0.6, 0.4, 0], 45)]) }),

    // 8d 12 个头
    '8d': (f) => ({ ...morph(f, shape('heads'), { dur: 0.5, stagger: 0.3, noise: 0.5 }), cam: cam([0, 0, lerp(10, 9.4, f.p)], [0, 0.2, 0]) }),

    // 8e 位置编码（工程图纸）
    '8e': (f) => ({
      ...morph(f, shape('posenc'), { dur: 0.5, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: mul(T(0, -0.55, 0), S(0.85)),
      cam: cam([0, 0, 11]), titleY: 250,
      notes: ['PE(pos, 2i)     = sin(pos / 10000^(2i/d))', 'PE(pos, 2i + 1) = cos(pos / 10000^(2i/d))', 'Each position gets a unique fingerprint of phases.'],
      block: { name: 'POSITIONAL ENCODING', sub: 'd_model = 512 · 8 of 512 dims shown', scale: '1 tick = 1 token' },
    }),

    // 8f Transformer 塔，镜头沿塔往上
    '8f': (f) => ({
      ...morph(f, shape('tower'), { dur: 0.75, stagger: 0.25, noise: 0.6 }), energy: 1.2,
      cam: orbit(0.6 + f.lb * 0.1, lerp(9, 7.5, f.p), lerp(-2.5, 3.5, f.p), [0, lerp(-1.5, 1.5, f.p), 0], 45),
    }),

    // 8g 词元瀑布
    '8g': (f) => ({ ...morph(f, shape('waterfall'), { dur: 0.4, stagger: 0.1, noise: 0.4 }), cam: cam([0, 0, lerp(10, 9.2, f.p)]) }),

    // 8h 缩放定律（纸面插图）
    '8h': (f) => ({
      ...morph(f, shape('scaling'), { dur: 0.5, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: mul(T(0, 0.75, 0), S(0.88)),
      cam: cam([0, 0, 11]), titleY: 990,
    }),

    // 8i 潜空间星系
    '8i': (f) => ({ ...morph(f, shape('latent'), { dur: 1.2, stagger: 0.35, noise: 1 }), matB: RY(-f.t * 0.25), cam: cut(f.bar, [orbit(f.lb * 0.08, 10, 4.5), orbit(1.5 + f.lb * 0.08, 6, 1.2, [1.5, 0, 0], 50)]) }),

    // 8j 扩散去噪成脸
    '8j': (f) => ({ ...morph(f, shape('face'), { dur: 0.3, stagger: 0.1, noise: 0.3 }), noise: 0.3, cam: cam([0, 0, 9.5], [0, 0.2, 0]) }),

    // 8k 公式环
    '8k': (f) => ({ ...morph(f, shape('ring'), { dur: 0.8, stagger: 0.3, noise: 0.6 }), matB: RY(-f.t * 0.45), energy: 1.3, cam: cam([0, lerp(3.2, 1.4, f.p), lerp(10, 8.2, f.p)], [0, 0.1, 0]) }),
  },
  log: {
    '8a': [[0, 'token 0: "the"', { cps: 40 }]],
    '8b': [[0, 'cos(v₁, v₂) = 0.87'], [4, 'king − man + woman ≈ queen']],
    '8c': [[0, 'softmax(QKᵀ/√d)·V']],
    '8d': [[0, 'heads = 12']],
    '8e': [[0, 'PE(pos, 2i) = sin(pos/10000^(2i/d))']],
    '8f': [[0, (e) => `layer ${Math.min(12, 1 + Math.floor(e * 1.5))}/12`]],
    '8g': [[0, 'generate(max_tokens=∞)']],
    '8h': [[0, 'L ∝ N^(−0.076)']],
    '8i': [[0, 'z ~ p(z)']],
    '8j': [[0, (e) => `denoise step ${Math.min(8, 1 + Math.floor(e * 2))}/8`]],
    '8k': [[0, 'epoch ∞', { cps: 40 }]],
  },
};
