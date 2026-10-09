// 第 5 章 网络：电报 → 熵 → 地球 → 数据包 → 握手 → PageRank → 字符雨 → 展开成网格
import { shape } from '../shapes/index.js';
import { range, lerp, seq, expoOut } from '../util.js';
import { cam, orbit, cut, morph, T, RY, RX, mul, S } from './helpers.js';

const tilt = (t) => mul(RX(0.35), RY(t * 0.35));

export default {
  shots: {
    // 5a 电报脉冲
    '5a': (f) => ({ ...morph(f, shape('telegraph'), { dur: 0.6, stagger: 0.2, noise: 0.6 }), cam: cam([lerp(-0.8, 0.8, f.p), -0.3, 10], [0, -0.6, 0]) }),

    // 5b 香农熵（纸面插图）
    '5b': (f) => ({
      ...morph(f, shape('entropy'), { dur: 0.6, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: T(0, 0.9, 0),
      cam: cam([0, 0, 10.5]), titleY: 970,
    }),

    // 5c 地球，节点按拍 ping
    '5c': (f) => ({
      ...morph(f, shape('globe'), { dur: 1.2, stagger: 0.35, noise: 1 }), matB: tilt(f.t),
      cam: cut(f.bar, [cam([0, 0, lerp(13, 11, f.p)]), orbit(0.6, 7.5, 2.5, [1, 0.5, 0], 45)]),
    }),

    // 5d 数据包沿航线飞
    '5d': (f) => ({ ...morph(f, shape('globe', { arcs: true }), { dur: 0.5, stagger: 0.2, noise: 0.6 }), matB: tilt(f.t), cam: orbit(-0.4 + f.lb * 0.08, 9.5, 3, [0, 0.3, 0]) }),

    // 5e TCP 握手（工程图纸）
    '5e': (f) => ({
      ...morph(f, shape('handshake'), { dur: 0.5, stagger: 0.2, noise: 0.4 }), energy: 0.6, matB: T(0, -0.7, 0),
      cam: cam([0, 0, 10.5]), titleY: 250,
      notes: ['1. Client sends SYN with its initial sequence number.', '2. Server answers SYN-ACK: its own number, plus x + 1.', '3. Client acknowledges y + 1. Data may now flow.'],
      block: { name: 'TCP THREE-WAY HANDSHAKE', sub: 'RFC 793 · 1981', scale: '1 RTT' },
    }),

    // 5f PageRank
    '5f': (f) => ({ ...morph(f, shape('pagerank'), { dur: 0.6, stagger: 0.2, noise: 0.8 }), cam: orbit(f.lb * 0.15, 11, 1.5) }),

    // 5g 字符雨
    '5g': (f) => ({ ...morph(f, shape('rain'), { dur: 0.5, stagger: 0.4, noise: 0.8 }), cam: cam([0, 0, lerp(10, 11.5, f.p)]) }),

    // 5h 地球展开成平面网格
    '5h': (f) => seq(f.lb, [
      [1, (lb) => ({ from: f.prev().shape, matA: f.prev().mat, to: shape('globe'), matB: tilt(f.t), p: range(lb, 0, 0.8), stagger: 0.3, noise: 0.8, cam: cam([0, 0, 12]) })],
      [3, (lb) => ({ from: shape('globe'), matA: tilt(f.t), to: shape('globe', { flat: true }), p: range(lb, 0, 1), stagger: 0.12, noise: 0.4, cam: cam([0, lerp(0, -3, expoOut(range(lb, 0, 2))), 12], [0, 0, 0]) })],
    ]),
  },
  log: {
    '5a': [[0, '... --- ...'], [2, '1844']],
    '5b': [[0, 'H = −Σ p·log₂p']],
    '5c': [[0, 'ping world.local'], [4, '64 bytes from 10.0.0.1']],
    '5d': [[0, (e) => `${Math.floor(1 + e * 37)} packets in flight`]],
    '5e': [[0, 'SYN → SYN-ACK → ACK']],
    '5f': [[0, 'PR = (1−d)/N + d·Σ PR/L']],
    '5g': [[0, 'dataset: 10¹² tokens', { cps: 40 }]],
    '5h': [[0, 'DataLoader(shuffle=True)']],
  },
};
