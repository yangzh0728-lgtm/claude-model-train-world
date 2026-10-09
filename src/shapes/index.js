// 形态库：每个形态 = N 个粒子的目标位置 + 颜色。
// 静态形态生成一次后缓存；动态形态（电子跃迁、行星公转、波的传播……）
// 带 update(ctx)，每帧由导演按当前时间重算。
import basic from './basic.js';
import cosmos from './cosmos.js';
import laws from './laws.js';
import text from './text.js';
import science from './science.js';
import life from './life.js';
import compute from './compute.js';
import network from './network.js';

const registry = { ...basic, ...cosmos, ...laws, ...text, ...science, ...life, ...compute, ...network };

let N = 0;
const cache = new Map();

export function initShapes(n) { N = n; cache.clear(); }

// shape('nebula') / shape('text', { str: 'E = mc²' })
export function shape(name, params = {}) {
  const key = name + JSON.stringify(params);
  let s = cache.get(key);
  if (!s) {
    const make = registry[name];
    if (!make) throw new Error(`未知形态：${name}`);
    s = { name, key, pos: new Float32Array(N * 3), col: new Float32Array(N * 3), version: 0 };
    const upd = make(N, s.pos, s.col, params);
    if (typeof upd === 'function') s.update = upd;
    cache.set(key, s);
  }
  return s;
}

export const shapeNames = () => Object.keys(registry);
