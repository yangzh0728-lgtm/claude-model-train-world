// 第 0 章 启动：光标 → 白噪声 → 高斯分布 → 一个亮点
import { shape } from '../shapes/index.js';
import { range, steps, lerp } from '../util.js';
import { cam, morph } from './helpers.js';

export default {
  term: { layout: 'center', hud: false },
  shots: {
    // 0a 全黑，只有光标随拍闪烁
    '0a': () => ({ from: shape('edges'), opacity: 0, energy: 0, cam: cam([0, 0, 10]) }),

    // 0b 粒子从屏幕四边涌入，铺成一块白噪声方阵
    '0b': (f) => ({
      from: shape('edges'), to: shape('noiseSquare'), p: range(f.lb, 0, 1.2), stagger: 0.3, noise: 0.8,
      opacity: range(f.lb, 0, 0.4), cam: cam([0, 0, lerp(10, 9, f.p)]),
    }),

    // 0c 噪声按值排序，堆成高斯钟形直方图
    '0c': (f) => ({ ...morph(f, shape('histogram'), { dur: 1.5, stagger: 0.45, noise: 0.3 }), cam: cam([0, 0.3, lerp(9, 8.2, f.p)]) }),

    // 0d 钟形曲线按拍收成一个亮点
    '0d': (f) => ({
      ...morph(f, shape('point'), { stagger: 0.1, noise: 0.6 }), p: steps(f.lb, 0, 3), energy: 1.5,
      cam: cam([0, 0, lerp(8.2, 6.5, steps(f.lb, 0, 4))]),
    }),
  },
  log: {
    '0a': [[1, '$ ./model --train world', { cps: 16 }]],
    '0b': [[0, 'import universe'], [2, 'seed = 42']],
    '0c': [[0, 'w ~ N(0, 1)']],
    '0d': [[0, 'model = Model()'], [2, 'model.train(world)']],
  },
};
