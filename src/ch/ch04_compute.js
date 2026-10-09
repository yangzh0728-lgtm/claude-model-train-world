// 第 4 章 计算：算盘 → 差分机 → 打孔卡 → 布尔 → 图灵机 → 真空管 → 半加器 → 生命游戏 → 芯片 → 摩尔定律 → 晶圆
import { shape } from '../shapes/index.js';
import { range, lerp, expoOut, easeIn } from '../util.js';
import { cam, orbit, cut, morph, lerpCam, T, RY, RX, mul, S } from './helpers.js';

export default {
  shots: {
    // 4a 算盘，每拍拨珠
    '4a': (f) => ({
      ...morph(f, shape('abacus'), { dur: 0.5, stagger: 0.2, noise: 0.6 }),
      cam: cut(f.bar, [cam([lerp(-1.2, 1.2, f.p), -1.2, 10], [0, 0, 0])]),
    }),

    // 4b 差分机齿轮（工程图纸）
    '4b': (f) => ({
      ...morph(f, shape('gears'), { dur: 0.6, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: mul(T(0, -0.6, 0), S(0.8)),
      cam: cam([0, 0, 13]), titleY: 250,
      notes: ['Method of differences: Δ²y is constant.', 'y ← y + Δ¹,   Δ¹ ← Δ¹ + Δ².', 'Each column adds into its neighbour, one tooth per step.'],
      block: { name: 'DIFFERENCE ENGINE No. 1', sub: 'C. Babbage · 1822', scale: '1 : 20' },
    }),

    // 4c 打孔卡一张张翻过
    '4c': (f) => ({
      ...morph(f, shape('punchcards'), { dur: 0.6, stagger: 0.2, noise: 0.5 }),
      cam: cam([3.5, 2.2, 8.5], [0, 0, -1.2], 40),
    }),

    // 4d 布尔真值表（纸面插图）
    '4d': (f) => ({
      ...morph(f, shape('truth'), { dur: 0.6, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: T(0, 0.8, 0),
      cam: cam([0, 0, 11]), titleY: 960,
    }),

    // 4e 图灵机纸带
    '4e': (f) => ({
      ...morph(f, shape('turing'), { dur: 0.75, stagger: 0.2, noise: 0.5 }), energy: 1.1,
      cam: cut(f.bar, [cam([0, 0.2, 7.5], [0, 0, 0]), cam([-3.5, 1.8, 5], [0, 0.3, 0], 45)]),
    }),

    // 4f 真空管和 ENIAC 面板
    '4f': (f) => ({
      ...morph(f, shape('tubes'), { dur: 0.6, stagger: 0.25, noise: 0.6 }),
      cam: cam([lerp(1.5, -1.5, f.p), 0.2, 10], [0, 0, 0]),
    }),

    // 4g 半加器（工程图纸）
    '4g': (f) => ({
      ...morph(f, shape('adder'), { dur: 0.6, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: T(0, -0.7, 0),
      cam: cam([0, 0, 11]), titleY: 260,
      notes: ['S = A ⊕ B', 'C = A · B', 'Inputs cycle 00 → 01 → 10 → 11, one per beat.'],
      block: { name: 'HALF ADDER', sub: '1 XOR + 1 AND · 12 transistors', scale: '1 : 10⁻⁸' },
    }),

    // 4h 生命游戏
    '4h': (f) => ({ ...morph(f, shape('life'), { dur: 0.4, stagger: 0.3, noise: 0.5 }), energy: 1.2, cam: cam([0, 0, lerp(11, 9.5, f.p)], [0, 0, 0]) }),

    // 4i 芯片平面布局
    '4i': (f) => ({
      ...morph(f, shape('chip'), { dur: 0.6, stagger: 0.2, noise: 0.6 }),
      matB: RX(-0.5 * (1 - expoOut(range(f.lb, 0, 2)))),
      cam: cut(f.bar, [cam([0, lerp(-1.5, 0, f.p), lerp(11, 9.5, f.p)], [0, 0, 0])]),
    }),

    // 4j 摩尔定律
    '4j': (f) => ({ ...morph(f, shape('moore'), { dur: 0.5, stagger: 0.2, noise: 0.4 }), cam: cam([0.3, 0, lerp(10.5, 9.8, f.p)], [0.2, 0, 0]) }),

    // 4k 从一块芯片拉远到整片晶圆
    '4k': (f) => ({
      ...morph(f, shape('wafer'), { dur: 0.4, stagger: 0.1, noise: 0.4 }),
      cam: lerpCam(cam([0.21, 0.21, 0.9], [0.21, 0.21, 0]), cam([0, -0.6, 13], [0, -0.6, 0]), expoOut(range(f.lb, 0.3, 3.5))),
    }),
  },
  log: {
    '4a': [[0, '1 + 1 = 10₂']],
    '4b': [[0, 'Δ²y = const'], [2, 'Babbage, 1822']],
    '4c': [[0, 'Jacquard, 1804']],
    '4d': [[0, 'x² = x'], [2, 'Boole, 1854']],
    '4e': [[0, 'δ(q, a) → (q′, b, R)'], [4, 'halt? undecidable']],
    '4f': [[0, '18,000 tubes']],
    '4g': [[0, 'S = A ⊕ B   C = A·B']],
    '4h': [[0, 'B3/S23']],
    '4i': [[0, '7 nm']],
    '4j': [[0, 'N ∝ 2^(t/2)']],
    '4k': [[0, '0b01001000 01101001'], [2, '"Hi"']],
  },
};
