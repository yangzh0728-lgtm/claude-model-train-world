// 第 3 章 生命：水 → 苯环 → α 螺旋 → DNA → 转录翻译 → 细胞分裂 → 神经元 → 眼睛
import { shape } from '../shapes/index.js';
import { range, lerp, expoOut } from '../util.js';
import { cam, orbit, cut, morph, T, RY, RX, mul, S } from './helpers.js';

export default {
  shots: {
    // 3a 水分子（纸面插图）
    '3a': (f) => ({
      ...morph(f, shape('water'), { dur: 0.75, stagger: 0.2, noise: 0.5 }), energy: 0.6, matB: T(0, 1.0, 0),
      cam: cam([0, 0.3, lerp(11, 10.5, f.p)], [0, 0.3, 0]), titleY: 930,
    }),

    // 3b 苯环，单双键每拍交替
    '3b': (f) => ({
      ...morph(f, shape('benzene'), { dur: 0.6, stagger: 0.15, noise: 0.6 }),
      cam: cut(f.bar, [cam([0, 0, lerp(8.5, 7.5, f.p)])]),
    }),

    // 3c 肽链折叠成 α 螺旋（工程图纸）
    '3c': (f) => ({
      ...morph(f, shape('helix'), { dur: 0.6, stagger: 0.15, noise: 0.4 }), energy: 0.6,
      matB: mul(T(0, -1.1, 0), RX(f.t * 0.6)),
      cam: cam([0, 0, 10.5], [0, 0, 0]), titleY: 330,
      notes: ['3.6 residues per turn, rise 1.5 Å each.', 'N–H of residue i bonds C=O of residue i + 4.', 'Side chains point outward from the axis.'],
      block: { name: 'α-HELIX', sub: 'right-handed · pitch 5.4 Å', scale: '1 : 10⁻¹⁰' },
    }),

    // 3d DNA 双螺旋，镜头沿螺旋向上爬
    '3d': (f) => ({
      ...morph(f, shape('dna'), { dur: 1, stagger: 0.2, noise: 0.6 }),
      matB: RY(f.t * 0.9),
      cam: cut(f.bar, [
        cam([4.5, lerp(-3, -1, f.p), 6], [0, lerp(-2, 0, f.p), 0], 45),
        cam([0.5, lerp(1, 3.5, f.p), 3.8], [0, lerp(1.5, 4, f.p), 0], 55),
        cam([7, lerp(-1, 1, f.p), 9], [0, 0, 0], 40),
      ]),
    }),

    // 3e 转录与翻译
    '3e': (f) => ({ ...morph(f, shape('transcribe'), { dur: 0.75, stagger: 0.2, noise: 0.6 }), cam: cam([lerp(-1.5, 1.5, f.p), -0.5, 8.5], [lerp(-1, 1.5, f.p), -0.6, 0]) }),

    // 3f 细胞按拍分裂
    '3f': (f) => ({ ...morph(f, shape('cells'), { dur: 0.5, noise: 0.6 }), energy: 1.2, matB: RY(f.t * 0.5), cam: orbit(f.lb * 0.2, 8, 1.5) }),

    // 3g 神经元，动作电位每拍传一次
    '3g': (f) => ({
      ...morph(f, shape('neuron'), { dur: 0.6, stagger: 0.2, noise: 0.6 }),
      cam: cut(f.bar, [cam([lerp(-1, 1, f.p), 0.4, 9.5], [0.3, 0.4, 0])]),
    }),

    // 3h 眼睛，最后一拍推进瞳孔
    '3h': (f) => ({
      ...morph(f, shape('eye'), { dur: 0.75, stagger: 0.3, noise: 0.6 }),
      cam: cam([0, 0, lerp(10, 0.6, expoOut(range(f.lb, 2.5, 4)))], [0, 0, 0], 40),
      fade: range(f.lb, 3.6, 4) * 0.8,
    }),
  },
  log: {
    '3a': [[0, '2 H + O → H₂O'], [1.5, '∠HOH = 104.5°']],
    '3b': [[0, 'C₆H₆  resonance']],
    '3c': [[0, '…Gly-Ala-Ser…'], [2, 'fold()']],
    '3d': [[0, 'ATCG GCTA …'], [4, 'replicate()']],
    '3e': [[0, 'DNA → mRNA → protein'], [2, 'AUG → Met']],
    '3f': [[0, (e) => `cells = 2^${Math.min(3, Math.max(0, Math.floor(e)))}`]],
    '3g': [[0, 'V: −70 mV → +40 mV']],
    '3h': [[0, 'epoch 120  loss 5.03', { cps: 40 }]],
  },
};
