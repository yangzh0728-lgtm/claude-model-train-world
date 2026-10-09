// 导演：给定时间 t，算出这一帧的全部画面状态（粒子、相机、文字、后期）。
// 纯函数式：同一个 t 永远得到同一帧。
import { getShot, chapterOpts } from './ch/index.js';

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
    for (const sh of [s.from, s.to]) {
      if (sh?.update && sh.lastT !== t) { sh.update(info); sh.version++; sh.lastT = t; }
    }

    // 每小节第一拍轻微闪一下（节拍同步的直观检查）
    const downbeat = info.beatInBar < 1 ? Math.exp(-info.beatInBar * 5) * 0.12 : 0;
    swarm.apply({ ...s, pulse: (s.pulse ?? 0) + downbeat }, t, (height / 1080) * 22);

    const c = s.cam ?? { pos: [0, 0, 10], look: [0, 0, 0], fov: 40 };
    camera.position.set(...c.pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(...c.look);
    if (camera.fov !== (c.fov ?? 40) || camera.aspect !== width / height) {
      camera.fov = c.fov ?? 40;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    terminal.draw(info, { ...chapterOpts(info.shot.ch), ...s.term });

    const end = clock.duration;
    return {
      info,
      fx: {
        flash: s.flash ?? 0,
        rgb: s.rgb ?? 0,
        bloom: s.bloom,
        exposure: s.exposure,
        fade: Math.min(1, Math.max(0, (end - t) / 1.5)),
      },
    };
  }

  return { frame };
}
