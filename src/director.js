// 导演：给定时间 t，算出这一帧的全部画面状态（粒子、相机、文字、后期）。
// 纯函数式：同一个 t 永远得到同一帧。
import { getShot, chapterOpts } from './ch/index.js';
import scenes from './scenes.json';
import { chapterInk } from './palette.js';
import { sup } from './util.js';

const META = Object.fromEntries(scenes.map((s) => [s.id, s]));

export function createDirector({ clock, swarm, camera, terminal }) {
  const prevCache = new Map();

  function withHelpers(info) {
    return { ...info, prev: () => prevEnd(info.shot.index) };
  }

  // 上一个镜头最后一刻的形态，方便镜头之间自动衔接
  function prevEnd(index) {
    if (index === 0) return { shape: null, mat: null, cam: null };
    if (prevCache.has(index)) return prevCache.get(index);
    const s = clock.shots[index - 1];
    const info = clock.at(clock.timeAt(s.endBeat - 1e-3));
    const st = getShot(s.ch, s.id)(withHelpers(info));
    const out = { shape: st.to ?? st.from, mat: st.to ? st.matB : st.matA, cam: st.cam };
    prevCache.set(index, out);
    return out;
  }

  function frame(t, { width, height }) {
    const info = clock.at(t);
    const s = getShot(info.shot.ch, info.shot.id)(withHelpers(info));

    // 动态形态按当前时间重算
    // 正在变形时，起始形态来自上一场景，按“已完成”状态（p = 1）计算
    const fromCtx = s.to ? { ...info, p: s.fromP ?? 1 } : info;
    for (const [sh, ctx] of [[s.from, fromCtx], [s.to, info]]) {
      if (sh?.update && sh.lastT !== t) { sh.update(ctx); sh.version++; sh.lastT = t; }
    }

    // 节拍冲击：每拍亮一下、粒子被踢散一下、镜头推一下；小节第一拍更重，并带镜头震动和色差
    const beatNo = Math.floor(info.beat);
    const env = info.beat >= 0 ? Math.exp(-(info.beat - beatNo) * 7) : 0;
    const down = info.beatInBar < 1;
    const energy = s.energy ?? 1;
    const hit = env * energy * (down ? 1 : 0.5);
    swarm.apply({ ...s, pulse: (s.pulse ?? 0) + hit * 0.2, kick: (s.kick ?? 0) + hit * 0.09, kickSeed: beatNo % 97 }, t, (height / 1080) * 22);

    const c = s.cam ?? { pos: [0, 0, 10], look: [0, 0, 0], fov: 40 };
    const shake = down ? env * energy * 0.09 : 0;
    camera.position.set(c.pos[0] + Math.sin(beatNo * 12.9898) * shake, c.pos[1] + Math.sin(beatNo * 78.233) * shake, c.pos[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(...c.look);
    const fov = (c.fov ?? 40) - hit * 2.2;
    if (camera.fov !== fov || camera.aspect !== width / height) {
      camera.fov = fov;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const meta = META[info.shot.id] ?? {};
    const style = s.style ?? meta.style ?? 'dark';
    const page = { style, title: meta.title, caption: meta.caption && sup(meta.caption), notes: s.notes, block: s.block, header: s.header, titleY: s.titleY, titleX: s.titleX };
    terminal.draw(info, { ...chapterOpts(info.shot.ch), ...s.term, page });

    // 风格转场：跨在镜头交界处的一拍里（交界前半拍到交界后半拍），按前后风格挑一种遮罩
    const styleOf = (sh) => (sh ? META[sh.id]?.style ?? 'dark' : null);
    const prevSh = clock.shots[info.shot.index - 1], nextSh = clock.shots[info.shot.index + 1];
    const W = 0.5;
    let tr = null;
    if (info.lb < W && prevSh && styleOf(prevSh) !== style) tr = [styleOf(prevSh), style, (info.lb + W) / (2 * W)];
    else if (nextSh && info.shot.endBeat - info.beat < W && styleOf(nextSh) !== style) tr = [style, styleOf(nextSh), (W - (info.shot.endBeat - info.beat)) / (2 * W)];
    let transType = 0, paperA = style === 'dark' ? 0 : 1, paperB = paperA, trans = 0;
    if (tr && (tr[0] === 'dark') !== (tr[1] === 'dark')) {
      const [a, b, q] = tr;
      paperA = a === 'dark' ? 0 : 1; paperB = b === 'dark' ? 0 : 1; trans = q;
      transType = a === 'dark' ? (b === 'sheet' ? 3 : 1) : (a === 'sheet' ? 4 : 2);
    }

    const end = clock.duration;
    return {
      info,
      fx: {
        paper: paperA,
        paperTo: paperB,
        trans,
        transType,
        textPaper: style === 'dark' ? 0 : 1,
        textInk: chapterInk[info.shot.ch] ?? [1, 1, 1],
        flash: s.flash ?? 0,
        rgb: (s.rgb ?? 0) + (down ? env * energy * 0.0025 : 0),
        bloom: s.bloom,
        glitch: s.glitch ?? 0,
        glitchSeed: Math.floor(t * 24) % 251,
        exposure: s.exposure,
        fade: Math.min(1, Math.max(0, (end - t) / 1.5)) * (1 - (s.fade ?? 0)),
      },
    };
  }

  return { frame };
}
