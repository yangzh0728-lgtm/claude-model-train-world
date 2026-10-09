// 第 0 章 启动：黑屏光标 → 粒子从屏幕四边汇成一个亮点
import { shape } from '../shapes/index.js';
import { range, smooth, lerp } from '../util.js';
import { cam } from './helpers.js';

export default {
  term: { layout: 'center', hud: false },
  shots: {
    // 0-1 全黑，只有光标随拍闪烁
    '0-1': () => ({
      from: shape('edges'),
      opacity: 0,
      cam: cam([0, 0, 10]),
    }),

    // 0-2 粒子从屏幕四边汇成一个亮点，镜头缓慢推近
    '0-2': (f) => ({
      from: shape('edges'),
      to: shape('point'),
      p: range(f.lb, 0.5, 10.5),
      stagger: 0.55,
      noise: 1.1,
      opacity: smooth(range(f.lb, 0, 3)),
      cam: cam([0, 0, lerp(10, 7.5, smooth(f.p))]),
    }),
  },
  log: {
    '0-1': [[2, '$ ./model --train world', { cps: 10 }]],
    '0-2': [[0, 'import universe'], [4, 'model = Model()'], [8, 'model.train(world)']],
  },
};
