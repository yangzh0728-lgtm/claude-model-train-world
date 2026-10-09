// 第 0 章 启动：黑屏光标 → 粒子从屏幕四边按拍一格一格汇成一个亮点
import { shape } from '../shapes/index.js';
import { range, steps, lerp } from '../util.js';
import { cam } from './helpers.js';

export default {
  term: { layout: 'center', hud: false },
  shots: {
    // 0-1 全黑，只有光标随拍闪烁
    '0-1': () => ({
      from: shape('edges'),
      opacity: 0,
      energy: 0,
      cam: cam([0, 0, 10]),
    }),

    // 0-2 粒子从屏幕四边按拍收拢成一个亮点，镜头每拍推近一格
    '0-2': (f) => ({
      from: shape('edges'),
      to: shape('point'),
      p: steps(f.lb, 0, 8),
      stagger: 0.1,
      noise: 0.8,
      opacity: range(f.lb, 0, 0.5),
      energy: f.lb < 8 ? 1 : 1.6,
      cam: cam([0, 0, lerp(10, 6.5, steps(f.lb, 0, 12))]),
    }),
  },
  log: {
    '0-1': [[1, '$ ./model --train world', { cps: 16 }]],
    '0-2': [[0, 'import universe'], [2, 'model = Model()'], [4, 'model.compile(loss="reality")'], [8, 'model.train(world)']],
  },
};
