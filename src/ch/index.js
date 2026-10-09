// 章节表。还没做的章节用占位镜头：粒子拼出镜头编号，终端打出分镜描述，
// 这样全片从头到尾都能播放，随时能看整体节奏。
import ch00 from './ch00_boot.js';
import ch01 from './ch01_origin.js';
import ch02 from './ch02_laws.js';
import { shape } from '../shapes/index.js';
import { range } from '../util.js';
import { cam } from './helpers.js';

import scenes from '../scenes.json';

const TODO = Object.fromEntries(scenes.map((s) => [s.id, s]));

function placeholder(id) {
  return (f) => ({
    from: f.prev().shape,
    matA: f.prev().mat,
    to: shape('text', { str: id, width: 2.5 }),
    p: range(f.lb, 0, 1),
    stagger: 0.4,
    noise: 1,
    opacity: 0.8,
    cam: cam([0, 0, 10]),
  });
}

const built = { ch00, ch01, ch02 };

export function getShot(chId, shotId) {
  return built[chId]?.shots[shotId] ?? placeholder(shotId);
}

export function chapterOpts(chId) {
  return built[chId]?.term ?? {};
}

// 所有日志条目，换算成绝对拍号
export function collectLog(clock) {
  const out = [];
  for (const s of clock.shots) {
    const entries = built[s.ch]?.log?.[s.id] ?? (TODO[s.id] ? [[0, `# ${s.id} ${TODO[s.id].desc}`, { cps: 40 }], [1, TODO[s.id].text, { cps: 40 }]] : []);
    for (const [beat, text, opt = {}] of entries) out.push({ beat: s.startBeat + beat, text, ...opt });
  }
  return out;
}
