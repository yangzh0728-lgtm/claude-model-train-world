// 配色：按计划从冷色的物理世界过渡到暖色的人类世界
import { hex } from './util.js';

export const C = {
  ice: hex('#6EC8FF'),
  white: [1, 1, 1],
  warmWhite: hex('#FFF4E0'),
  life: hex('#7CFFB2'),
  term: hex('#33FF66'),
  amber: hex('#FFB000'),
  learn: hex('#A879FF'),
  magenta: hex('#FF2A6D'),
  cyan: hex('#05D9E8'),
  gold: hex('#FFD27A'),
  red: hex('#FF5A5F'),
  pink: hex('#FF7AD9'),
  deep: hex('#2A5BFF'),
};

// 每章的终端文字颜色
export const chapterInk = {
  ch00: C.ice, ch01: C.ice, ch02: C.ice, ch03: C.life, ch04: C.term,
  ch05: C.amber, ch06: C.learn, ch07: C.magenta, ch08: C.gold, ch09: C.warmWhite,
};
