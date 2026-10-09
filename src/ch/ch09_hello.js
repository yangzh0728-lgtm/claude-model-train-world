// 第 9 章 hello, world：两只手 → 靠近 → 指尖相碰 → 单位圆 → 欧拉公式 → 回放 → 所有粒子归一 → hello, world.
import { shape } from '../shapes/index.js';
import { range, lerp, smooth, expoOut } from '../util.js';
import { cam, orbit, cut, morph, T, RY, RX, mul, S } from './helpers.js';

const REPLAY = [['bang'], ['nebula'], ['atom'], ['dna'], ['eye'], ['chip'], ['globe'], ['mlp']];

export default {
  shots: {
    // 9a 两只手从两侧伸出
    '9a': (f) => ({ ...morph(f, shape('hands'), { dur: 1.5, stagger: 0.35, noise: 0.8 }), energy: 0.7, cam: cam([lerp(-0.6, 0.6, f.p), 0.2, lerp(12, 11, f.p)], [0, 0, 0]) }),

    // 9b 慢慢靠近
    '9b': (f) => ({
      from: shape('hands'), to: shape('hands', { gap: 0 }), p: smooth(range(f.lb, 0, 7.6)), ease: 'smooth', stagger: 0, noise: 0.4, energy: 0.6,
      cam: cam([0, 0.1, lerp(11, 6.5, smooth(f.p))], [0, 0, 0], lerp(40, 34, f.p)),
    }),

    // 9c 指尖相碰：一道白光
    '9c': (f) => ({
      from: shape('hands', { gap: 0 }), noise: 0.4 + Math.exp(-f.lb * 3) * 1.5, energy: 2,
      flash: Math.exp(-f.lb * 2.5) * 0.9, cam: cam([0, 0.1, lerp(6.5, 9, expoOut(range(f.lb, 0, 3)))], [0, 0, 0], 34),
    }),

    // 9d 单位圆（纸面插图）
    '9d': (f) => ({ ...morph(f, shape('euler'), { dur: 0.6, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: mul(T(0, 0.7, 0), S(0.85)), cam: cam([0, 0, 11]), titleY: 990 }),

    // 9e e^{iπ} + 1 = 0
    '9e': (f) => ({
      ...morph(f, shape('formula', { str: 'e^{iπ} + 1 = 0' }), { dur: 0.8, stagger: 0.2, noise: 0.5 }), energy: 1.2,
      flash: Math.exp(-f.lb * 5) * 0.2, cam: cam([0, 0, lerp(10, 8.8, f.p)]),
    }),

    // 9f 全片回放，每半拍一个形态
    '9f': (f) => {
      const k = Math.floor(f.lb * 2), sh = REPLAY[k % REPLAY.length][0];
      const prevSh = k === 0 ? f.prev().shape : shape(REPLAY[(k - 1) % REPLAY.length][0]);
      return { from: prevSh, to: shape(sh), p: Math.min(1, ((f.lb * 2) % 1) / 0.35), stagger: 0.08, noise: 0.8, energy: 1.4, matB: RY(f.t * 0.3), cam: cam([0, 1, 11], [0, 0, 0]) };
    },

    // 9g N: 262144 → 1
    '9g': (f) => ({ ...morph(f, shape('point'), { dur: 3.5, stagger: 0.15, noise: 0.3 }), ease: 'in', energy: 0.8, cam: cam([0, 0, 10]) }),

    // 9h hello, world.
    '9h': (f) => ({
      from: shape('point'), to: shape('text', { str: 'hello, world.', width: 7 }), p: range(f.lb, 0.5, 1.5), stagger: 0.1, noise: 0.5, energy: 0.8,
      flash: f.lb > 0.5 ? Math.exp(-(f.lb - 0.5) * 6) * 0.4 : 0, cam: cam([0, 0, lerp(10, 9.3, f.p)]),
    }),
  },
  log: {
    '9a': [[0, 'model.eval()']],
    '9b': [[0, (e) => `distance = ${Math.max(0, 1 - e / 8).toFixed(3)}`]],
    '9c': [[0, 'contact', { cps: 40 }]],
    '9d': [[0, 'e^{iθ} = cos θ + i sin θ']],
    '9e': [[0, 'e^{iπ} + 1 = 0']],
    '9f': [[0, 'replay(history)']],
    '9g': [[0, (e) => `N: ${Math.max(1, Math.round(262144 * Math.pow(1 - Math.min(1, e / 3.6), 3)))}`]],
    '9h': [[0.5, 'hello, world.', { cps: 18 }]],
  },
};
