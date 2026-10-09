// 数学与缓动小工具

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x) => Math.pow(clamp(x), 3);
export const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(x)));
// 在 [a, b] 区间内从 0 走到 1
export const range = (x, a, b) => clamp((x - a) / (b - a));
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// 可复现的随机数（同一种子每次生成同样的形态）
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(r) {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function hex(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function mixColor(a, b, t) { return lerp3(a, b, t); }

// 卡点进度：在 [a, b] 拍之间每拍向前“跳”一格，每一跳用 0.25 拍完成
export function steps(lb, a, b) {
  const x = clamp((lb - a) / (b - a)) * (b - a);
  const k = Math.floor(x), f = x - k;
  return clamp((k + expoOut(f * 4)) / (b - a));
}

// 把一个镜头按拍切成几段：seq(lb, [[4, fn], [8, fn]]) 依次调用 fn(局部拍, 段内进度)
export function seq(lb, parts) {
  let start = 0;
  for (let i = 0; i < parts.length; i++) {
    const [len, fn] = parts[i];
    if (lb < start + len || i === parts.length - 1) return fn(lb - start, clamp((lb - start) / len));
    start += len;
  }
}

// 把 ^{...} 换成 Unicode 上标，给歌词和图注这种纯文字用（e^{iθ} → eⁱᶿ）
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '−': '⁻', '-': '⁻', i: 'ⁱ', n: 'ⁿ', t: 'ᵗ', θ: 'ᶿ', π: 'ᵖ', H: 'ᴴ', '/': 'ᐟ', d: 'ᵈ', '.': '·' };
export const sup = (s) => s.replace(/\^\{([^}]*)\}/g, (m, x) => ([...x].every((ch) => SUP[ch]) ? [...x].map((ch) => SUP[ch]).join('') : `^(${x})`));
